#!/bin/sh
set -eu

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting application: $*"
exec "$@"
