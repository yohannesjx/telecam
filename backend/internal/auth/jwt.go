package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// AccessClaims are embedded in short-lived JWT access tokens.
type AccessClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	DeviceID uuid.UUID `json:"device_id"`
	Role     string    `json:"role"`
	Status   string    `json:"status"`
	jwt.RegisteredClaims
}

// JWTService signs and validates access tokens.
type JWTService struct {
	secret []byte
	ttl    time.Duration
}

// NewJWTService creates a JWT helper.
func NewJWTService(secret string, ttl time.Duration) *JWTService {
	return &JWTService{secret: []byte(secret), ttl: ttl}
}

// IssueAccessToken creates a signed JWT for an active user and device.
func (j *JWTService) IssueAccessToken(userID, deviceID uuid.UUID, role, status string) (string, int, error) {
	now := time.Now().UTC()
	exp := now.Add(j.ttl)
	claims := AccessClaims{
		UserID:   userID,
		DeviceID: deviceID,
		Role:     role,
		Status:   status,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(j.secret)
	if err != nil {
		return "", 0, fmt.Errorf("sign access token: %w", err)
	}
	return signed, int(j.ttl.Seconds()), nil
}

// ParseAccessToken validates a JWT and returns claims.
func (j *JWTService) ParseAccessToken(tokenString string) (*AccessClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessClaims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return j.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*AccessClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}
