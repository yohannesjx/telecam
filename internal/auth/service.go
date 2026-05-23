package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

const userStatusActive = "ACTIVE"

// ErrRefreshNotOwned is returned when a refresh token belongs to another user.
var ErrRefreshNotOwned = errors.New("refresh token does not belong to user")

// Service handles authentication flows.
type Service struct {
	cfg    *appconfig.Config
	q      *sqlc.Queries
	jwt    *JWTService
	audit  *audit.Logger
	redis  *redis.Client
}

// NewService constructs an auth service.
func NewService(cfg *appconfig.Config, db *database.DB, jwt *JWTService, auditLog *audit.Logger, rdb *redis.Client) *Service {
	return &Service{
		cfg:   cfg,
		q:     db.Queries,
		jwt:   jwt,
		audit: auditLog,
		redis: rdb,
	}
}

// LoginInput is the credential payload for login.
type LoginInput struct {
	Email             string
	Password          string
	DeviceName        string
	DeviceFingerprint string
	IPAddress         string
	UserAgent         string
}

// TokenPair holds issued access and refresh tokens.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
}

// UserResponse is a safe user projection for API responses.
type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	FullName string    `json:"full_name"`
	Email    string    `json:"email"`
	Phone    string    `json:"phone,omitempty"`
	Role     string    `json:"role"`
	Status   string    `json:"status"`
}

// Login authenticates a user and issues tokens.
func (s *Service) Login(ctx context.Context, in LoginInput) (TokenPair, UserResponse, error) {
	user, err := s.q.GetUserByEmail(ctx, pgtype.Text{String: in.Email, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.auditLoginFailed(ctx, nil, in, "user_not_found")
			return TokenPair{}, UserResponse{}, fmt.Errorf("invalid credentials")
		}
		return TokenPair{}, UserResponse{}, err
	}

	if user.Status != userStatusActive {
		s.auditLoginFailed(ctx, &user.ID, in, "user_not_active")
		return TokenPair{}, UserResponse{}, fmt.Errorf("invalid credentials")
	}

	if !user.PasswordHash.Valid || CheckPassword(user.PasswordHash.String, in.Password) != nil {
		s.auditLoginFailed(ctx, &user.ID, in, "invalid_password")
		return TokenPair{}, UserResponse{}, fmt.Errorf("invalid credentials")
	}

	deviceID, err := s.resolveDevice(ctx, user.ID, in.DeviceName, in.DeviceFingerprint)
	if err != nil {
		return TokenPair{}, UserResponse{}, err
	}

	pair, err := s.issueTokenPair(ctx, user.ID, user.Role, user.Status, &deviceID)
	if err != nil {
		return TokenPair{}, UserResponse{}, err
	}

	s.audit.Event(ctx, audit.EventParams{
		Action:    "AUTH_LOGIN_SUCCESS",
		UserID:    &user.ID,
		DeviceID:  &deviceID,
		IPAddress: in.IPAddress,
		UserAgent: in.UserAgent,
		Metadata: map[string]any{
			"email": in.Email,
		},
	})

	// Track last login in Redis (optional session hint for future phases).
	if s.redis != nil {
		key := fmt.Sprintf("auth:last_login:%s", user.ID)
		_ = s.redis.Set(ctx, key, time.Now().UTC().Format(time.RFC3339), 24*time.Hour).Err()
	}

	return pair, toUserResponse(user), nil
}

// Refresh rotates a refresh token and returns new tokens.
func (s *Service) Refresh(ctx context.Context, refreshPlain, ip, ua string) (TokenPair, error) {
	hash := HashRefreshToken(refreshPlain)
	row, err := s.q.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TokenPair{}, fmt.Errorf("invalid refresh token")
		}
		return TokenPair{}, err
	}
	if row.RevokedAt.Valid {
		return TokenPair{}, fmt.Errorf("refresh token revoked")
	}
	if !row.ExpiresAt.Valid || row.ExpiresAt.Time.Before(time.Now().UTC()) {
		return TokenPair{}, fmt.Errorf("refresh token expired")
	}

	user, err := s.q.GetUserByID(ctx, row.UserID)
	if err != nil {
		return TokenPair{}, err
	}
	if user.Status != userStatusActive {
		return TokenPair{}, fmt.Errorf("user is not active")
	}

	var deviceID *uuid.UUID
	if row.DeviceID.Valid {
		id := uuid.UUID(row.DeviceID.Bytes)
		deviceID = &id
	}

	pair, err := s.issueTokenPair(ctx, user.ID, user.Role, user.Status, deviceID)
	if err != nil {
		return TokenPair{}, err
	}

	newHash := HashRefreshToken(pair.RefreshToken)
	if err := s.q.RevokeRefreshToken(ctx, sqlc.RevokeRefreshTokenParams{
		TokenHash:            hash,
		ReplacedByTokenHash: pgtype.Text{String: newHash, Valid: true},
	}); err != nil {
		return TokenPair{}, err
	}

	var devID *uuid.UUID
	if deviceID != nil {
		devID = deviceID
	}
	s.audit.Event(ctx, audit.EventParams{
		Action:    "AUTH_TOKEN_REFRESH",
		UserID:    &user.ID,
		DeviceID:  devID,
		IPAddress: ip,
		UserAgent: ua,
	})

	return pair, nil
}

// Logout revokes a refresh token for the authenticated user.
func (s *Service) Logout(ctx context.Context, userID uuid.UUID, refreshPlain, ip, ua string) error {
	hash := HashRefreshToken(refreshPlain)
	row, err := s.q.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if row.UserID != userID {
		return ErrRefreshNotOwned
	}
	if row.RevokedAt.Valid {
		return nil
	}
	if err := s.q.RevokeRefreshToken(ctx, sqlc.RevokeRefreshTokenParams{
		TokenHash:            hash,
		ReplacedByTokenHash: pgtype.Text{},
	}); err != nil {
		return err
	}
	s.audit.Event(ctx, audit.EventParams{
		Action:    "AUTH_LOGOUT",
		UserID:    &userID,
		IPAddress: ip,
		UserAgent: ua,
	})
	return nil
}

// Me returns the current user profile.
func (s *Service) Me(ctx context.Context, userID uuid.UUID) (UserResponse, error) {
	user, err := s.q.GetUserByID(ctx, userID)
	if err != nil {
		return UserResponse{}, err
	}
	return toUserResponse(user), nil
}

func (s *Service) issueTokenPair(ctx context.Context, userID uuid.UUID, role, status string, deviceID *uuid.UUID) (TokenPair, error) {
	if deviceID == nil || *deviceID == uuid.Nil {
		return TokenPair{}, fmt.Errorf("device id required for token issue")
	}
	access, expiresIn, err := s.jwt.IssueAccessToken(userID, *deviceID, role, status)
	if err != nil {
		return TokenPair{}, err
	}

	refreshPlain, err := NewRefreshToken()
	if err != nil {
		return TokenPair{}, err
	}
	hash := HashRefreshToken(refreshPlain)
	expires := time.Now().UTC().Add(s.cfg.RefreshTokenTTL)

	_, err = s.q.CreateRefreshToken(ctx, sqlc.CreateRefreshTokenParams{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: hash,
		DeviceID:  database.OptionalUUIDToPgtype(deviceID),
		ExpiresAt: database.TimestamptzFromTime(expires),
	})
	if err != nil {
		return TokenPair{}, err
	}

	return TokenPair{
		AccessToken:  access,
		RefreshToken: refreshPlain,
		ExpiresIn:    expiresIn,
	}, nil
}

func (s *Service) resolveDevice(ctx context.Context, userID uuid.UUID, name, fingerprint string) (uuid.UUID, error) {
	now := time.Now().UTC()
	_, err := s.q.GetDeviceByFingerprint(ctx, sqlc.GetDeviceByFingerprintParams{
		UserID:            userID,
		DeviceFingerprint: fingerprint,
	})
	if err == nil {
		updated, uerr := s.q.UpdateDeviceLastSeen(ctx, sqlc.UpdateDeviceLastSeenParams{
			UserID:            userID,
			DeviceFingerprint: fingerprint,
			LastSeenAt:        database.TimestamptzFromTime(now),
			DeviceName:        database.TextFromString(name),
		})
		if uerr != nil {
			return uuid.UUID{}, uerr
		}
		return updated.ID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.UUID{}, err
	}

	created, err := s.q.CreateDevice(ctx, sqlc.CreateDeviceParams{
		ID:                uuid.New(),
		UserID:            userID,
		DeviceName:        database.TextFromString(name),
		DeviceFingerprint: fingerprint,
		Status:            "ACTIVE",
		LastSeenAt:        database.TimestamptzFromTime(now),
	})
	if err != nil {
		return uuid.UUID{}, err
	}
	return created.ID, nil
}

func (s *Service) auditLoginFailed(ctx context.Context, userID *uuid.UUID, in LoginInput, reason string) {
	s.audit.Event(ctx, audit.EventParams{
		Action:    "AUTH_LOGIN_FAILED",
		UserID:    userID,
		IPAddress: in.IPAddress,
		UserAgent: in.UserAgent,
		Metadata: map[string]any{
			"email":  in.Email,
			"reason": reason,
		},
	})
}

func toUserResponse(u sqlc.User) UserResponse {
	resp := UserResponse{
		ID:       u.ID,
		FullName: u.FullName,
		Role:     u.Role,
		Status:   u.Status,
	}
	if u.Email.Valid {
		resp.Email = u.Email.String
	}
	if u.Phone.Valid {
		resp.Phone = u.Phone.String
	}
	return resp
}
