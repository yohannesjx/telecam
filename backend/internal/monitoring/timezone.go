package monitoring

import (
	"time"
)

// DayBoundsUTC returns [start, end) for a calendar day in the given IANA timezone.
func DayBoundsUTC(loc *time.Location, day time.Time) (time.Time, time.Time) {
	y, m, d := day.In(loc).Date()
	start := time.Date(y, m, d, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 0, 1)
	return start.UTC(), end.UTC()
}

// TodayBoundsUTC returns today's [start, end) in the timezone.
func TodayBoundsUTC(loc *time.Location) (time.Time, time.Time) {
	return DayBoundsUTC(loc, time.Now().In(loc))
}

// MonthBoundsUTC returns [start, end) for the calendar month containing day in loc.
func MonthBoundsUTC(loc *time.Location, day time.Time) (time.Time, time.Time) {
	t := day.In(loc)
	y, m, _ := t.Date()
	start := time.Date(y, m, 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0)
	return start.UTC(), end.UTC()
}

// LoadLocation returns the location or Africa/Addis_Ababa on failure.
func LoadLocation(tz string) *time.Location {
	if tz == "" {
		tz = "Africa/Addis_Ababa"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc, _ = time.LoadLocation("Africa/Addis_Ababa")
	}
	return loc
}
