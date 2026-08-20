#!/bin/sh

echo "Applying database migrations..."
npx prisma migrate deploy || true

echo "Starting CareerPilot..."
exec node_modules/.bin/next start -H 0.0.0.0
