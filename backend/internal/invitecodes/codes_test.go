package invitecodes

import (
	"errors"
	"strings"
	"testing"
)

// TestGenerate_Format verifies generated raw codes are exactly 6 digits.
func TestGenerate_Format(t *testing.T) {
	for i := 0; i < 100; i++ {
		raw, prefix, err := Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		if len(raw) != CodeLength {
			t.Fatalf("raw len want %d, got %d (%q)", CodeLength, len(raw), raw)
		}
		for _, r := range raw {
			if r < '0' || r > '9' {
				t.Fatalf("raw must be digits only, got %q", raw)
			}
		}
		if prefix != raw[:2]+"****" {
			t.Fatalf("prefix mismatch: raw=%q prefix=%q", raw, prefix)
		}
	}
}

// TestGenerate_UniqueAcross1000 checks that crypto/rand returns varied output.
func TestGenerate_UniqueAcross1000(t *testing.T) {
	const iterations = 1000
	seen := make(map[string]bool, iterations)
	collisions := 0
	for i := 0; i < iterations; i++ {
		raw, _, err := Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		if seen[raw] {
			collisions++
			continue
		}
		seen[raw] = true
	}
	if collisions > 5 {
		t.Fatalf("expected few collisions over %d iterations, got %d", iterations, collisions)
	}
}

// TestValidate_GoodCases accepts 6-digit numeric inputs.
func TestValidate_GoodCases(t *testing.T) {
	for _, c := range []string{"000000", "123456", "999999"} {
		if err := Validate(c); err != nil {
			t.Fatalf("Validate(%q) want nil, got %v", c, err)
		}
	}
}

// TestValidate_BadCases rejects everything else.
func TestValidate_BadCases(t *testing.T) {
	cases := []string{
		"",
		"12345",
		"1234567",
		"12345a",
		"12 345",
		"123-45",
		" 123456",
		"123456 ",
		"abcdef",
	}
	for _, c := range cases {
		if err := Validate(c); !errors.Is(err, ErrInvalidFormat) {
			t.Fatalf("Validate(%q) want ErrInvalidFormat, got %v", c, err)
		}
	}
}

// TestNormalize_TrimsOuterWhitespace strips surrounding whitespace only.
func TestNormalize_TrimsOuterWhitespace(t *testing.T) {
	cases := map[string]string{
		"  123456  ":  "123456",
		"\t123456\n": "123456",
		"123456":      "123456",
		"":            "",
		"   ":         "",
	}
	for in, want := range cases {
		if got := Normalize(in); got != want {
			t.Fatalf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestNormalize_DoesNotRemoveInnerSpaces ensures inner whitespace is preserved
// so Validate can reject it.
func TestNormalize_DoesNotRemoveInnerSpaces(t *testing.T) {
	got := Normalize(" 12 34 56 ")
	if got != "12 34 56" {
		t.Fatalf("Normalize must not strip inner spaces, got %q", got)
	}
	if err := Validate(got); err == nil {
		t.Fatal("inner-space code should still be rejected by Validate")
	}
}

// TestHash_Deterministic asserts the same input always produces the same hash.
func TestHash_Deterministic(t *testing.T) {
	const secret = "k"
	first := Hash("123456", secret)
	for i := 0; i < 100; i++ {
		if Hash("123456", secret) != first {
			t.Fatalf("Hash not deterministic on iteration %d", i)
		}
	}
}

// TestHash_NoRawCodeEmbedded confirms hash output never contains raw code.
func TestHash_NoRawCodeEmbedded(t *testing.T) {
	const raw = "493827"
	h := Hash(raw, "secret")
	if strings.Contains(h, raw) {
		t.Fatalf("hash %q must not contain raw code %q", h, raw)
	}
}

// TestMask_RevealsOnlyFirstTwoDigits is the security invariant for code_prefix.
func TestMask_RevealsOnlyFirstTwoDigits(t *testing.T) {
	got := Mask("493827")
	if got != "49****" {
		t.Fatalf("Mask(493827) = %q, want 49****", got)
	}
	// The full code must not appear in the mask.
	if strings.Contains(got, "493827") {
		t.Fatalf("mask must not contain full code: %q", got)
	}
	// Any digits past index 2 must be hidden.
	for _, suffix := range []string{"3827", "382", "27"} {
		if strings.Contains(got, suffix) {
			t.Fatalf("mask leaks suffix %q: %q", suffix, got)
		}
	}
}

// TestMask_ShortInputFallsBack handles malformed/short raw input safely.
func TestMask_ShortInputFallsBack(t *testing.T) {
	if got := Mask(""); got != "****" {
		t.Fatalf("Mask(empty) = %q, want ****", got)
	}
	if got := Mask("1"); got != "****" {
		t.Fatalf("Mask(\"1\") = %q, want ****", got)
	}
}
