# syntax=docker/dockerfile:1

# Shared multi-stage Dockerfile for Go services.
# Build: docker build -f docker/Dockerfile.go --build-arg SERVICE=api -t school-camera-api .

ARG GO_VERSION=1.25
FROM golang:${GO_VERSION}-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG SERVICE=api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/service ./apps/${SERVICE}

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

COPY --from=builder /out/service /app/service

ENTRYPOINT ["/app/service"]
