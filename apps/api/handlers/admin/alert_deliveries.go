package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type alertDeliveryDTO struct {
	ID           string  `json:"id"`
	AlertID      string  `json:"alert_id"`
	Channel      string  `json:"channel"`
	Recipient    string  `json:"recipient"`
	DeliveryKind string  `json:"delivery_kind"`
	Status       string  `json:"status"`
	Attempts     int32   `json:"attempts"`
	LastError    string  `json:"last_error,omitempty"`
	DeliveredAt  *string `json:"delivered_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

func deliveryFromRow(d sqlc.AlertDelivery) alertDeliveryDTO {
	dto := alertDeliveryDTO{
		ID:           d.ID.String(),
		AlertID:      d.AlertID.String(),
		Channel:      d.Channel,
		Recipient:    d.Recipient,
		DeliveryKind: d.DeliveryKind,
		Status:       d.Status,
		Attempts:     d.Attempts,
		CreatedAt:    d.CreatedAt.Time.UTC().Format(timeRFC3339),
		UpdatedAt:    d.UpdatedAt.Time.UTC().Format(timeRFC3339),
	}
	if d.LastError.Valid {
		dto.LastError = d.LastError.String
	}
	if d.DeliveredAt.Valid {
		s := d.DeliveredAt.Time.UTC().Format(timeRFC3339)
		dto.DeliveredAt = &s
	}
	return dto
}

// ListAlertDeliveries GET /admin/alert-deliveries (SUPER_ADMIN only)
func (h *Handler) ListAlertDeliveries(c *gin.Context) {
	params := sqlc.ListAlertDeliveriesParams{RowLimit: 200}
	if status := c.Query("status"); status != "" {
		params.Status = pgtype.Text{String: status, Valid: true}
	}
	if channel := c.Query("channel"); channel != "" {
		params.Channel = pgtype.Text{String: channel, Valid: true}
	}
	if alertIDStr := c.Query("alert_id"); alertIDStr != "" {
		id, err := uuid.Parse(alertIDStr)
		if err != nil {
			response.BadRequest(c, "invalid alert_id")
			return
		}
		params.AlertID = pgtype.UUID{Bytes: id, Valid: true}
	}

	rows, err := h.q.ListAlertDeliveries(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to list alert deliveries")
		return
	}
	out := make([]alertDeliveryDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, deliveryFromRow(row))
	}
	response.OK(c, http.StatusOK, out)
}
