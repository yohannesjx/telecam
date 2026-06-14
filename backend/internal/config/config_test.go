package config

import (
	"os"
	"testing"
)

// TestParentTrialDays_DefaultIsFive verifies the trial default lands on 5 days
// when PARENT_TRIAL_DAYS is unset.
func TestParentTrialDays_DefaultIsFive(t *testing.T) {
	t.Setenv("PARENT_TRIAL_DAYS", "")
	// Setenv with "" still leaves the var set on some platforms; force unset.
	if err := os.Unsetenv("PARENT_TRIAL_DAYS"); err != nil {
		t.Fatalf("unset PARENT_TRIAL_DAYS: %v", err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.ParentTrialDays != 5 {
		t.Fatalf("ParentTrialDays default want 5, got %d", cfg.ParentTrialDays)
	}
}

// TestParentTrialDays_EnvOverride verifies PARENT_TRIAL_DAYS env var wins.
func TestParentTrialDays_EnvOverride(t *testing.T) {
	t.Setenv("PARENT_TRIAL_DAYS", "14")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.ParentTrialDays != 14 {
		t.Fatalf("ParentTrialDays env override want 14, got %d", cfg.ParentTrialDays)
	}
}
