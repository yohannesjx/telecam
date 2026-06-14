package storage

import (
	"bytes"
	"io"
)

type bytesReadCloser struct {
	*bytes.Reader
}

func (b *bytesReadCloser) Close() error { return nil }

func bytesReader(data []byte) io.ReadCloser {
	return &bytesReadCloser{Reader: bytes.NewReader(data)}
}
