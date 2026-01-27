#!/bin/bash

# Database Backup Script for Luma Web
# Usage: ./scripts/backup-database.sh [output_dir]

set -e

# Configuration
OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/luma_backup_${TIMESTAMP}.sql"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Error: Failed to create output directory: $OUTPUT_DIR"
    exit 1
fi
if [ ! -w "$OUTPUT_DIR" ]; then
    echo "Error: Output directory is not writable: $OUTPUT_DIR"
    exit 1
fi

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Starting database backup..."
echo "Output: $BACKUP_FILE"

# Create backup
pg_dump "$DATABASE_URL" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"

# Clean up old backups (keep last 10)
cd "$OUTPUT_DIR"
# Use different xargs syntax for macOS vs Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: xargs doesn't have -r flag
    ls -t luma_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm 2>/dev/null || true
else
    # Linux: use -r flag to handle empty input
    ls -t luma_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
fi

echo "Cleanup completed. Keeping last 10 backups."
