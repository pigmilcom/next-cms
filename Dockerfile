# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --include=dev || (echo "npm ci failed, fallback to install" && npm install --legacy-peer-deps --include=dev)
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=2048" 

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint script for auto-generating secrets
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
