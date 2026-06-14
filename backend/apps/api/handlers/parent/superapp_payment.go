package parent

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

// SuperAppCreatePaymentRequest handles POST /parent/superapp/payment-request.
//
// Creates a pending payment request that the main Super App backend will fulfill
// by debiting the user's wallet. The Flutter app calls this first, then calls
// POST /v1/school-camera/pay on the main backend to execute the debit.
//
// parentID and schoolID come from the verified link — never from the request body.
func (h *Handler) SuperAppCreatePaymentRequest(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "SUPERAPP_AUTH_REQUIRED", "message": "Super App authentication required"}})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		response.Internal(c, "unexpected context value type")
		return
	}

	var req struct {
		Months         int    `json:"months"`
		IdempotencyKey string `json:"idempotency_key"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid request body"}})
		return
	}
	if req.Months <= 0 {
		req.Months = 1
	}
	if req.IdempotencyKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "idempotency_key is required"}})
		return
	}

	ctx := c.Request.Context()

	link, err := h.q.GetActiveParentSuperAppLinkBySuperAppUser(ctx, superAppUser.UserID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{
			"code":    "PARENT_LINK_REQUIRED",
			"message": "Link your school parent account before making a payment",
		}})
		return
	}

	// Idempotency: if a request with this key already exists, return it.
	existing, err := h.q.GetPaymentRequestByIdempotencyKey(ctx, req.IdempotencyKey)
	if err == nil {
		c.JSON(http.StatusOK, buildPaymentRequestResponse(existing))
		return
	}
	if err != pgx.ErrNoRows {
		response.Internal(c, "failed to check idempotency")
		return
	}

	amountMinor := h.cfg.SchoolCameraMonthlyAmountMinor * int64(req.Months)
	expiry := time.Duration(h.cfg.PaymentRequestExpiryMinutes) * time.Minute
	if expiry <= 0 {
		expiry = 10 * time.Minute
	}
	expiresAt := time.Now().UTC().Add(expiry)

	pr, err := h.q.CreatePaymentRequest(ctx, sqlc.CreatePaymentRequestParams{
		ID:             uuid.New(),
		ParentID:       link.ParentID,
		SchoolID:       link.SchoolID,
		SuperAppUserID: superAppUser.UserID,
		AmountMinor:    amountMinor,
		Currency:       h.cfg.SchoolCameraCurrency,
		Months:         int32(req.Months),
		IdempotencyKey: req.IdempotencyKey,
		ExpiresAt:      database.TimestamptzFromTime(expiresAt),
	})
	if err != nil {
		response.Internal(c, "failed to create payment request")
		return
	}

	c.JSON(http.StatusCreated, buildPaymentRequestResponse(pr))
}

func buildPaymentRequestResponse(pr sqlc.SchoolCameraPaymentRequest) gin.H {
	resp := gin.H{
		"payment_request_id": pr.ID.String(),
		"amount_minor":       pr.AmountMinor,
		"currency":           pr.Currency,
		"months":             pr.Months,
		"status":             pr.Status,
		"idempotency_key":    pr.IdempotencyKey,
	}
	if pr.ExpiresAt.Valid {
		s := pr.ExpiresAt.Time.UTC().Format(time.RFC3339)
		resp["expires_at"] = s
	}
	return resp
}
