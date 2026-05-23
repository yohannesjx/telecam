package playback

import "errors"

const (
	msgAccessDenied     = "access denied"
	msgRecordingNotFound = "recording not found"
	msgRateLimitExceeded = "rate limit exceeded"
)

// ErrAccessDenied indicates the caller is not allowed to access playback.
// Internal details are logged to audit only; API responses use a generic message.
type ErrAccessDenied struct {
	InternalReason string
}

func (e *ErrAccessDenied) Error() string {
	return msgAccessDenied
}

// InternalReasonOrDefault returns the audit reason.
func (e *ErrAccessDenied) InternalReasonOrDefault() string {
	if e.InternalReason != "" {
		return e.InternalReason
	}
	return msgAccessDenied
}

// ErrNotFound indicates no recording is available for the request.
type ErrNotFound struct {
	InternalReason string
}

func (e *ErrNotFound) Error() string {
	return msgRecordingNotFound
}

func (e *ErrNotFound) InternalReasonOrDefault() string {
	if e.InternalReason != "" {
		return e.InternalReason
	}
	return msgRecordingNotFound
}

// ErrRateLimited indicates playback rate limit was exceeded.
type ErrRateLimited struct{}

func (e *ErrRateLimited) Error() string {
	return msgRateLimitExceeded
}

// IsAccessDenied reports whether err is a playback access denial.
func IsAccessDenied(err error) bool {
	var target *ErrAccessDenied
	return errors.As(err, &target)
}

// IsNotFound reports whether err is a recording-not-found error.
func IsNotFound(err error) bool {
	var target *ErrNotFound
	return errors.As(err, &target)
}

// IsRateLimited reports whether err is a rate-limit error.
func IsRateLimited(err error) bool {
	var target *ErrRateLimited
	return errors.As(err, &target)
}
