// Package audit is a placeholder for Phase 2 audit logging of camera and API events.
package audit

import "log/slog"

// Log is a stub that will persist structured audit events in Phase 2.
func Log(logger *slog.Logger, event string, attrs ...any) {
	if logger == nil {
		return
	}
	args := append([]any{"event", event}, attrs...)
	logger.Info("audit", args...)
}
