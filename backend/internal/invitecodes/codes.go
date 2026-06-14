// Package invitecodes provides shared helpers for parent invitation code generation,
// normalization, validation, masking, and HMAC-SHA256 hashing.
package invitecodes

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"time"
)

// Expiry is the default TTL for parent invitation codes.
const Expiry = 7 * 24 * time.Hour

// CodeLength is the required length of the numeric parent invitation code.
const CodeLength = 6

// ErrInvalidFormat is returned by Validate when the raw code is not exactly
// CodeLength decimal digits after trimming whitespace.
// Surface as the public error code "PARENT_CODE_INVALID".
var ErrInvalidFormat = errors.New("PARENT_CODE_INVALID")

// Normalize trims leading/trailing whitespace from the code.
// Apply before validation or hashing any code received from the client.
// The 6-digit numeric code has no case to fold, so no upper/lower transform
// is applied.
func Normalize(rawCode string) string {
	return strings.TrimSpace(rawCode)
}

// Validate checks that the normalized code is exactly CodeLength decimal digits.
// Returns ErrInvalidFormat for empty, wrong length, or any non-digit input.
// Call after Normalize.
func Validate(normalized string) error {
	if len(normalized) != CodeLength {
		return ErrInvalidFormat
	}
	for _, r := range normalized {
		if r < '0' || r > '9' {
			return ErrInvalidFormat
		}
	}
	return nil
}

// Hash computes HMAC-SHA256 of rawCode using secret and returns the hex-encoded
// digest. The raw code is never stored — only this hash is persisted in the DB.
func Hash(rawCode, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(rawCode))
	return hex.EncodeToString(mac.Sum(nil))
}

// Mask returns the safe-to-display representation of a raw code:
// first 2 digits followed by "****" (e.g. "493827" → "49****").
// Used as the value persisted in code_prefix and shown in admin UIs.
func Mask(rawCode string) string {
	if len(rawCode) < 2 {
		return "****"
	}
	return rawCode[:2] + "****"
}

// Generate creates a cryptographically random 6-digit decimal parent invitation
// code using crypto/rand. Returns (rawCode, codePrefix) where codePrefix is the
// masked form ("49****"), safe to store and display in the admin UI.
// The raw code is returned only here and must never be persisted.
func Generate() (rawCode, codePrefix string, err error) {
	// Generate exactly CodeLength independent decimal digits using crypto/rand.
	// We pick each digit via rand.Int(0..10) to keep the output uniform and
	// avoid biased rejection sampling.
	var b strings.Builder
	b.Grow(CodeLength)
	max := big.NewInt(10)
	for i := 0; i < CodeLength; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", "", err
		}
		b.WriteByte(byte('0' + n.Int64()))
	}
	rawCode = b.String()
	codePrefix = Mask(rawCode)
	return rawCode, codePrefix, nil
}
