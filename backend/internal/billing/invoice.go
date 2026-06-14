package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// GenerateInvoiceNumber returns INV-YYYYMMDD-NNNNNN for the given date.
func GenerateInvoiceNumber(ctx context.Context, q *sqlc.Queries, day time.Time) (string, error) {
	prefix := fmt.Sprintf("INV-%s-", day.Format("20060102"))
	count, err := q.CountInvoicesForDatePrefix(ctx, prefix+"%")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%06d", prefix, count+1), nil
}
