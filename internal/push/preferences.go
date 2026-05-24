package push

import "encoding/json"

// Preferences are per-device parent notification toggles.
type Preferences struct {
	SubscriptionReminders bool `json:"subscription_reminders"`
	PaymentUpdates        bool `json:"payment_updates"`
	ImportantNotices      bool `json:"important_notices"`
	CameraStatusNotices   bool `json:"camera_status_notices"`
}

// DefaultPreferences returns MVP defaults (camera notices off).
func DefaultPreferences() Preferences {
	return Preferences{
		SubscriptionReminders: true,
		PaymentUpdates:        true,
		ImportantNotices:      true,
		CameraStatusNotices:   false,
	}
}

// ParsePreferences decodes stored JSON or returns defaults.
func ParsePreferences(raw json.RawMessage) Preferences {
	def := DefaultPreferences()
	if len(raw) == 0 {
		return def
	}
	var p Preferences
	if err := json.Unmarshal(raw, &p); err != nil {
		return def
	}
	return p
}

func (p Preferences) ToJSON() (json.RawMessage, error) {
	return json.Marshal(p)
}

func (p Preferences) AllowsType(typ string) bool {
	switch typ {
	case TypeSubscriptionExpiring, TypeSubscriptionExpired:
		return p.SubscriptionReminders
	case TypePaymentApproved, TypePaymentRejected, TypeInvoiceCreated:
		return p.PaymentUpdates
	case TypeImportantNotice:
		return p.ImportantNotices
	case TypeCameraUnavailableParent:
		return p.CameraStatusNotices
	default:
		return false
	}
}
