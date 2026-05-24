package push

// Parent-facing notification types (calm, account/school focused).
const (
	TypeSubscriptionExpiring       = "SUBSCRIPTION_EXPIRING"
	TypeSubscriptionExpired        = "SUBSCRIPTION_EXPIRED"
	TypePaymentApproved            = "PAYMENT_APPROVED"
	TypePaymentRejected            = "PAYMENT_REJECTED"
	TypeInvoiceCreated             = "INVOICE_CREATED"
	TypeImportantNotice            = "IMPORTANT_NOTICE"
	TypeCameraUnavailableParent    = "CAMERA_UNAVAILABLE_PARENT_NOTICE"
)

// Payload is a safe FCM data message (no secrets or stream URLs).
type Payload struct {
	Type  string
	Title string
	Body  string
	Route string
	// Optional reference IDs for in-app navigation (never signed URLs).
	PaymentID  string
	InvoiceID  string
	CameraID   string
}
