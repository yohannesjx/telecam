package alertdelivery

const (
	ChannelTelegram = "TELEGRAM"

	DeliveryKindOpened   = "OPENED"
	DeliveryKindResolved = "RESOLVED"

	StatusPending = "PENDING"
	StatusSent    = "SENT"
	StatusFailed  = "FAILED"
	StatusSkipped = "SKIPPED"

	WorkerTypeAlert = "ALERT_WORKER"
)
