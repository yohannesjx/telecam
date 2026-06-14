package worker

import "sync"

type workerStats struct {
	mu sync.Mutex

	activeCameras      int
	runningCameras     int
	offlineCameras     int
	uploadedSegments   int64
	uploadErrors       int64
	ffmpegRestarts     int64
	lastError          string
}

func (s *workerStats) incSegments() {
	s.mu.Lock()
	s.uploadedSegments++
	s.mu.Unlock()
}

func (s *workerStats) incUploadErrors() {
	s.mu.Lock()
	s.uploadErrors++
	s.mu.Unlock()
}

func (s *workerStats) incFFmpegRestarts() {
	s.mu.Lock()
	s.ffmpegRestarts++
	s.mu.Unlock()
}

func (s *workerStats) setCounts(active, running, offline int) {
	s.mu.Lock()
	s.activeCameras = active
	s.runningCameras = running
	s.offlineCameras = offline
	s.mu.Unlock()
}

func (s *workerStats) snapshot() (active, running, offline int, uploaded, uploadErrors, ffmpegRestarts int64, lastErr string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.activeCameras, s.runningCameras, s.offlineCameras,
		s.uploadedSegments, s.uploadErrors, s.ffmpegRestarts, s.lastError
}

func (s *workerStats) setLastError(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err == nil {
		s.lastError = ""
		return
	}
	s.lastError = err.Error()
}
