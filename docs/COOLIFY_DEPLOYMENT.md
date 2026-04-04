# Coolify Deployment Guide

## 🚀 Quick Setup on Coolify (Hetzner VPS)

### 1. Create Project in Coolify

1. Go to your Coolify dashboard
2. Create new project
3. Choose "Docker Compose" as deployment type
4. Connect your Git repository

### 2. Configure Environment Variables

In Coolify's Environment Variables section, add:

```bash
# CRITICAL - Prevents WebSocket errors
NODE_ENV=production

# Your actual domain
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-a-random-32-char-string-here

# Storage
STORAGE_PROVIDER=blob
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Optional Coolify-specific SSL settings
POSTGRES_SSL_MODE=disable
```

### 3. Domain Configuration

1. In Coolify, go to your app's domains
2. Add your custom domain: `yourdomain.com`
3. Enable automatic SSL/TLS certificate
4. Update `NEXTAUTH_URL` to match: `https://yourdomain.com`

### 4. Deploy

```bash
# Coolify will automatically:
# 1. Pull your code
# 2. Build the Docker image
# 3. Start services with docker-compose
# 4. Set up SSL certificates
```

### 5. Verify Deployment

Check that these are correct in Coolify logs:

```
✅ Environment: production
✅ NODE_ENV=production
✅ No WebSocket errors to localhost:8081
```

## 🔍 Troubleshooting

### Still seeing WebSocket errors?

1. **Check Environment Variables in Coolify:**
   - Verify `NODE_ENV=production` is set
   - Verify `NEXTAUTH_URL` matches your domain

2. **Force Rebuild:**
   - In Coolify: Click "Redeploy" with "Force rebuild" option
   - Or via CLI: `docker-compose down && docker-compose build --no-cache && docker-compose up -d`

3. **Check Build Logs:**
   - Look for "Environment: production" in build output
   - Should NOT see "Environment: development"

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R`
   - Try incognito mode

### Database Connection Issues?

Your app uses internal Docker network:
```bash
POSTGRES_URL=postgresql://myuser:strongpassword@db:5432/myappdb
```

This is already configured in `docker-compose.yaml` ✅

### SSL Connection Errors with Postgres?

If you see "server does not support SSL":
```bash
# Add to Coolify environment variables:
POSTGRES_SSL_MODE=disable
```

This is handled automatically by the SSL retry logic in `postgres.db.js` ✅

## 📝 Important Notes

- **Domain**: Always use `https://` for production `NEXTAUTH_URL`
- **Secrets**: Generate strong random strings for `NEXTAUTH_SECRET`
- **SSL**: Coolify handles SSL certificates automatically via Let's Encrypt
- **Logs**: Access via Coolify dashboard or `docker-compose logs -f app`

## 🎯 Expected Result

After deployment:
- ✅ No WebSocket errors
- ✅ SSL/TLS enabled automatically
- ✅ Database connected via internal network
- ✅ Production optimizations active
- ✅ Fast page loads with standalone output

Your app will be accessible at: `https://yourdomain.com` 🚀
