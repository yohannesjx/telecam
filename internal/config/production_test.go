package config

import "testing"

func TestValidateProduction_RejectsDefaults(t *testing.T) {
	cfg := &Config{
		AppEnv:           "production",
		JWTAccessSecret:  defaultJWTSecret,
		AppEncryptionKey: "",
		Domain:           "localhost",
		DemoLiveEnabled:  true,
	}
	if err := ValidateProduction(cfg); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateProduction_AcceptsValid(t *testing.T) {
	cfg := &Config{
		AppEnv:            "production",
		JWTAccessSecret:   "this-is-a-long-enough-production-secret-key-32+",
		AppEncryptionKey:  "JQxSM+BF3X56J3bsBKijVw0nnmXkCY8itW3xTqNIHeM=",
		Domain:            "camera.example.com",
		DemoLiveEnabled:   false,
		S3PublicAnonymous: false,
	}
	if err := ValidateProduction(cfg); err != nil {
		t.Fatal(err)
	}
}
