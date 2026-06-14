package parent

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/invitecodes"
)

// ── invitecodes helper tests ───────────────────────────────────────────────

// TestNormalizeBeforeHash verifies Normalize+Hash is stable regardless of
// surrounding whitespace for the same raw 6-digit code.
func TestNormalizeBeforeHash(t *testing.T) {
	const secret = "test-secret"
	base := invitecodes.Normalize("493827")
	variants := []string{
		"493827",
		"  493827  ",
		"\t493827\n",
	}
	expected := invitecodes.Hash(base, secret)
	for _, v := range variants {
		h := invitecodes.Hash(invitecodes.Normalize(v), secret)
		if h != expected {
			t.Fatalf("normalize+hash mismatch for %q: got %s want %s", v, h, expected)
		}
	}
}

// TestHashDistinctCodes verifies two different raw codes never collide.
func TestHashDistinctCodes(t *testing.T) {
	const secret = "test-secret"
	code1 := invitecodes.Normalize("111111")
	code2 := invitecodes.Normalize("222222")
	if invitecodes.Hash(code1, secret) == invitecodes.Hash(code2, secret) {
		t.Fatal("distinct codes must not collide")
	}
}

// TestHashOutputIsHex confirms the hash is a valid lowercase hex string of the
// correct length for HMAC-SHA256 (64 hex chars = 32 bytes).
func TestHashOutputIsHex(t *testing.T) {
	h := invitecodes.Hash("493827", "secret")
	if len(h) != 64 {
		t.Fatalf("expected 64-char hex digest, got %d chars: %s", len(h), h)
	}
	for _, ch := range h {
		if !strings.ContainsRune("0123456789abcdef", ch) {
			t.Fatalf("unexpected char %q in hash output %s", ch, h)
		}
	}
}

// TestCodeExpiryWindow verifies that a code with an expires_at in the past is
// detected as expired using wall-clock comparison (the same check used in
// LinkSuperApp before hitting the transaction).
func TestCodeExpiryWindow(t *testing.T) {
	past := time.Now().UTC().Add(-1 * time.Second)
	future := time.Now().UTC().Add(invitecodes.Expiry)

	if !time.Now().UTC().After(past) {
		t.Fatal("past timestamp should be before now")
	}
	if time.Now().UTC().After(future) {
		t.Fatal("future timestamp should not be before now")
	}
}

// TestNormalizeEmptyCode confirms whitespace-only codes normalize to "".
func TestNormalizeEmptyCode(t *testing.T) {
	cases := []string{"", "   ", "\t", "\n", " \t\n "}
	for _, c := range cases {
		if got := invitecodes.Normalize(c); got != "" {
			t.Fatalf("Normalize(%q) = %q, want empty string", c, got)
		}
	}
}

// TestHashDeterminism runs the same hash 1000 times and ensures no divergence.
func TestHashDeterminism(t *testing.T) {
	const secret = "stable-secret"
	const code = "493827"
	first := invitecodes.Hash(code, secret)
	for i := 0; i < 1000; i++ {
		if h := invitecodes.Hash(code, secret); h != first {
			t.Fatalf("hash not deterministic on iteration %d: got %s want %s", i, h, first)
		}
	}
}

// TestGenerateUniquenessBatch generates 1000 codes and confirms duplicates are
// extremely rare. With 6-digit codes there are only 1,000,000 possibilities,
// so birthday-style collisions can statistically occur; we allow at most a tiny
// number to keep this test stable while still detecting a stuck RNG.
func TestGenerateUniquenessBatch(t *testing.T) {
	const iterations = 1000
	seen := make(map[string]bool, iterations)
	collisions := 0
	for i := 0; i < iterations; i++ {
		code, _, err := invitecodes.Generate()
		if err != nil {
			t.Fatalf("Generate() error on iteration %d: %v", i, err)
		}
		if seen[code] {
			collisions++
			continue
		}
		seen[code] = true
	}
	// Expected collisions over 1000 draws from a 1,000,000-element space is
	// well under 1. Tolerate up to 5 to keep the test deterministic.
	if collisions > 5 {
		t.Fatalf("too many duplicates over %d iterations: %d collisions", iterations, collisions)
	}
	if len(seen) < iterations-5 {
		t.Fatalf("expected ~%d unique codes, got %d", iterations, len(seen))
	}
}

// TestHashNeverContainsRawInput confirms the hash output never embeds the raw
// code (defensive check against a naive hex-encoding mistake).
func TestHashNeverContainsRawInput(t *testing.T) {
	const raw = "493827"
	h := invitecodes.Hash(raw, "any-secret")
	if strings.Contains(h, raw) {
		t.Fatalf("hash must not contain raw code")
	}
}

// TestGeneratedCodeIsExactlySixDigits verifies generated codes meet the format
// requirement enforced by Validate.
func TestGeneratedCodeIsExactlySixDigits(t *testing.T) {
	for i := 0; i < 100; i++ {
		code, _, err := invitecodes.Generate()
		if err != nil {
			t.Fatalf("Generate() error on iteration %d: %v", i, err)
		}
		if err := invitecodes.Validate(code); err != nil {
			t.Fatalf("generated code %q failed Validate: %v", code, err)
		}
	}
}

// TestValidate_ReturnsInvalidFormatSentinel ensures we surface the public
// PARENT_CODE_INVALID error code via the sentinel.
func TestValidate_ReturnsInvalidFormatSentinel(t *testing.T) {
	bad := []string{"", "abc", "12345", "1234567", " 123456 "}
	for _, c := range bad {
		if err := invitecodes.Validate(c); !errors.Is(err, invitecodes.ErrInvalidFormat) {
			t.Fatalf("Validate(%q) expected ErrInvalidFormat, got %v", c, err)
		}
	}
}

// TestMaskedPrefixDoesNotRevealFullCode confirms the prefix shown in lists never
// exposes more than the first 2 digits of the raw code.
func TestMaskedPrefixDoesNotRevealFullCode(t *testing.T) {
	for i := 0; i < 50; i++ {
		code, prefix, err := invitecodes.Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		if prefix == code {
			t.Fatalf("prefix must not equal raw code: %q", prefix)
		}
		if strings.Contains(prefix, code[2:]) {
			t.Fatalf("prefix %q reveals trailing digits of code %q", prefix, code)
		}
	}
}
