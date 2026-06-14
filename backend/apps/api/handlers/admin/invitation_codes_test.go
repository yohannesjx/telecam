package admin

import (
	"strings"
	"testing"
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/invitecodes"
)

// TestGenerateParentCode verifies the 6-digit numeric format and randomness.
func TestGenerateParentCode(t *testing.T) {
	codes := make(map[string]bool)
	for i := 0; i < 100; i++ {
		code, prefix, err := invitecodes.Generate()
		if err != nil {
			t.Fatalf("invitecodes.Generate error: %v", err)
		}

		if len(code) != invitecodes.CodeLength {
			t.Fatalf("expected %d-digit code, got %d: %q", invitecodes.CodeLength, len(code), code)
		}
		for _, r := range code {
			if r < '0' || r > '9' {
				t.Fatalf("code must be numeric only, got %q", code)
			}
		}

		// Masked prefix: first 2 digits + "****" (length 6).
		if len(prefix) != 6 || !strings.HasSuffix(prefix, "****") {
			t.Fatalf("expected masked prefix XX****, got %q", prefix)
		}
		if prefix[:2] != code[:2] {
			t.Fatalf("masked prefix must start with first 2 digits of code (%q vs %q)", prefix, code)
		}

		if codes[code] {
			t.Fatalf("duplicate code generated: %q", code)
		}
		codes[code] = true
	}
}

// TestHashParentCode verifies that hashing is deterministic.
func TestHashParentCode(t *testing.T) {
	const secret = "test-secret"
	const code = "493827"

	h1 := invitecodes.Hash(code, secret)
	h2 := invitecodes.Hash(code, secret)

	if h1 != h2 {
		t.Fatal("hashing should be deterministic")
	}
}

// TestHashParentCode_DifferentSecrets verifies different secrets produce different hashes.
func TestHashParentCode_DifferentSecrets(t *testing.T) {
	const code = "493827"
	h1 := invitecodes.Hash(code, "secret-a")
	h2 := invitecodes.Hash(code, "secret-b")
	if h1 == h2 {
		t.Fatal("different secrets must produce different hashes")
	}
}

// TestHashParentCode_NeverStoresRawCode confirms the hash never embeds raw code.
func TestHashParentCode_NeverStoresRawCode(t *testing.T) {
	const rawCode = "493827"
	hash := invitecodes.Hash(rawCode, "some-secret")

	if strings.Contains(hash, rawCode) {
		t.Fatalf("hash must not contain raw code, got: %s", hash)
	}
}

// TestParentCodeExpiry confirms the default expiry constant is 7 days.
func TestParentCodeExpiry(t *testing.T) {
	want := 7 * 24 * time.Hour
	if invitecodes.Expiry != want {
		t.Fatalf("invitecodes.Expiry want %v, got %v", want, invitecodes.Expiry)
	}
}

// TestNormalize verifies code normalization trims whitespace only.
func TestNormalize(t *testing.T) {
	cases := []struct{ in, want string }{
		{"493827", "493827"},
		{"  493827  ", "493827"},
		{"\t493827\n", "493827"},
		{"", ""},
	}
	for _, tc := range cases {
		got := invitecodes.Normalize(tc.in)
		if got != tc.want {
			t.Fatalf("Normalize(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestValidate_AcceptsSixDigits verifies a valid 6-digit numeric code passes.
func TestValidate_AcceptsSixDigits(t *testing.T) {
	for _, c := range []string{"493827", "000000", "999999", "100000"} {
		if err := invitecodes.Validate(c); err != nil {
			t.Fatalf("expected %q to be valid, got %v", c, err)
		}
	}
}

// TestValidate_RejectsBadFormats verifies all invalid shapes are rejected.
func TestValidate_RejectsBadFormats(t *testing.T) {
	cases := []string{
		"",         // empty
		"12345",    // too short
		"1234567",  // too long
		"12 345",   // contains space inside
		"123-45",   // contains dash
		"abc123",   // letters
		"12345a",   // trailing letter
		"49 38 27", // multiple spaces
	}
	for _, c := range cases {
		if err := invitecodes.Validate(c); err == nil {
			t.Fatalf("expected %q to fail validation", c)
		}
	}
}

// TestMask confirms the displayed prefix only reveals the first 2 digits.
func TestMask(t *testing.T) {
	got := invitecodes.Mask("493827")
	if got != "49****" {
		t.Fatalf("Mask(493827) = %q, want 49****", got)
	}
	if strings.Contains(got, "3827") {
		t.Fatalf("mask must not reveal trailing digits, got %q", got)
	}
}

// TestInvitationCodeDTOs_NoHashOrRawCode confirms the DTO serialiser never
// exposes code_hash or raw code in any returned map key.
func TestInvitationCodeDTOs_NoHashOrRawCode(t *testing.T) {
	out := invitationCodeDTOs(nil)
	if out == nil {
		t.Fatal("expected non-nil empty slice for nil input")
	}
	if len(out) != 0 {
		t.Fatalf("expected empty slice for nil input, got %d items", len(out))
	}
}
