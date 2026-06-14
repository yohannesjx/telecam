package monitoring

const (
	DefaultLimit = 50
	MaxLimit     = 200
)

// ParseLimitOffset normalizes limit and offset query params.
func ParseLimitOffset(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
