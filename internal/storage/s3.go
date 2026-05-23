// Package storage provides S3-compatible (MinIO) object storage access.
package storage

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

// Client wraps S3 clients for in-cluster operations and browser-facing presigned URLs.
type Client struct {
	s3       *s3.Client // internal Docker network (uploads)
	presignS3 *s3.Client // public host for valid presigned signatures
	bucket   string
	region   string
}

// NewClient creates an S3 client configured for MinIO.
func NewClient(ctx context.Context, cfg *appconfig.Config) (*Client, error) {
	internal, err := newS3Client(ctx, cfg, cfg.S3Endpoint)
	if err != nil {
		return nil, err
	}

	publicEndpoint := cfg.S3PublicEndpoint
	if publicEndpoint == "" {
		publicEndpoint = cfg.S3Endpoint
	}
	presignClient, err := newS3Client(ctx, cfg, publicEndpoint)
	if err != nil {
		return nil, err
	}

	client := &Client{
		s3:        internal,
		presignS3: presignClient,
		bucket:    cfg.S3Bucket,
		region:    cfg.S3Region,
	}
	slog.Info("storage client initialized",
		"provider", cfg.StorageProvider,
		"bucket", cfg.S3Bucket,
		"region", cfg.S3Region,
	)
	return client, nil
}

func newS3Client(ctx context.Context, cfg *appconfig.Config, endpoint string) (*s3.Client, error) {
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, _ ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               endpoint,
			HostnameImmutable: true,
		}, nil
	})

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithEndpointResolverWithOptions(resolver),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3AccessKey,
			cfg.S3SecretKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = cfg.S3ForcePathStyle
	}), nil
}

// PresignGetObject returns a time-limited signed URL for downloading an object.
// The API returns this URL to clients; it does not proxy video bytes.
func (c *Client) PresignGetObject(ctx context.Context, key string, expiry time.Duration) (string, error) {
	presigner := s3.NewPresignClient(c.presignS3)
	out, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("presign get object %q: %w", key, err)
	}
	return out.URL, nil
}

// ObjectExists reports whether an object is present in the bucket.
func (c *Client) ObjectExists(ctx context.Context, key string) (bool, error) {
	_, err := c.s3.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		if isNotFoundError(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// PutObject uploads bytes to the bucket (used by stream-worker).
func (c *Client) PutObject(ctx context.Context, key string, body []byte, contentType string) error {
	_, err := c.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytesReader(body),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("put object %q: %w", key, err)
	}
	return nil
}

// S3Client exposes the underlying internal client for advanced use.
func (c *Client) S3Client() *s3.Client {
	return c.s3
}

func (c *Client) Bucket() string {
	return c.bucket
}
