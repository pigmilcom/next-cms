#!/bin/sh
set -e

# Generate NEXTAUTH_SECRET if not provided
if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" = "your-default-secret-key" ]; then
  echo "⚠️  NEXTAUTH_SECRET not set, generating a secure random secret..."
  export NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  echo "✅ Generated NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}... (truncated for security)"
fi

# Execute the main command
exec "$@"
