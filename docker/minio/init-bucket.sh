#!/bin/sh
set -e

echo "Waiting for MinIO..."
until mc alias set local "${S3_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" 2>/dev/null; do
  sleep 2
done

BUCKET="${S3_BUCKET:-school-camera-local}"

if mc ls "local/${BUCKET}" >/dev/null 2>&1; then
  echo "Bucket ${BUCKET} already exists"
else
  echo "Creating bucket ${BUCKET}"
  mc mb "local/${BUCKET}"
fi

# Bucket is PRIVATE by design. Presigned URLs handle authorized access.
# Do NOT enable anonymous/public download — it bypasses the signed URL security model.
mc anonymous set none "local/${BUCKET}" 2>/dev/null || true

echo "Setting CORS on bucket ${BUCKET}"
mc cors set "local/${BUCKET}" /scripts/cors.json 2>/dev/null || \
  mc admin config set local api cors_allow_origin="*" 2>/dev/null || true

echo "MinIO init complete (private bucket)"
