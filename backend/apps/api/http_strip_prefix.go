package main

import (
	"net/http"
	"strings"
)

// stripAPIPrefixHandler rewrites /api/* to /* before Gin routing so paths work
// whether or not the reverse proxy strips the /api prefix.
func stripAPIPrefixHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/api" {
			r.URL.Path = "/"
		} else if strings.HasPrefix(path, "/api/") {
			r.URL.Path = strings.TrimPrefix(path, "/api")
			if r.URL.Path == "" {
				r.URL.Path = "/"
			}
		}
		next.ServeHTTP(w, r)
	})
}
