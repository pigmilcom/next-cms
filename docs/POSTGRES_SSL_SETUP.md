# PostgreSQL SSL Configuration Guide

## Issue Resolved ✅
**Error:** "The server does not support SSL connections"  
**Cause:** Your Hetzner PostgreSQL server doesn't have SSL enabled, but the app now enforces SSL by default.  
**Solution:** Set `POSTGRES_ALLOW_INSECURE=TRUE` to allow non-SSL connections.

---

## Current Configuration

### 1. Local Development (.env)
```env
POSTGRES_URL=postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb
POSTGRES_ALLOW_INSECURE=TRUE
```

### 2. Docker Compose (docker-compose.yaml)
- Local PostgreSQL container (for testing): `db` service on port 5432
- App service now includes `POSTGRES_ALLOW_INSECURE=TRUE`
- Connects to external Hetzner database at `46.225.211.198:5432`

### 3. Coolify Deployment
Add these environment variables in Coolify:
```
POSTGRES_URL=postgresql://myuser:strongpassword@HOST:5432/myappdb
POSTGRES_ALLOW_INSECURE=TRUE
```

---

## Option 1: Keep Using Non-SSL (Current Setup) ⚠️

**Pros:**
- Works immediately with Hetzner default setup
- No PostgreSQL configuration needed

**Cons:**
- Data transmitted in plain text
- Not recommended for production

**Required:**
- `POSTGRES_ALLOW_INSECURE=TRUE` in environment variables

---

## Option 2: Enable SSL on PostgreSQL (Recommended) 🔒

### Step 1: Enable SSL on Hetzner PostgreSQL Server

1. **SSH into your Hetzner server:**
   ```bash
   ssh root@46.225.211.198
   ```

2. **Generate SSL certificates:**
   ```bash
   cd /var/lib/postgresql/data
   
   # Generate private key
   openssl genrsa -out server.key 2048
   chmod 600 server.key
   chown postgres:postgres server.key
   
   # Generate certificate
   openssl req -new -key server.key -out server.csr
   openssl x509 -req -in server.csr -signkey server.key -out server.crt
   chmod 644 server.crt
   chown postgres:postgres server.crt
   ```

3. **Update PostgreSQL configuration:**
   ```bash
   # Edit postgresql.conf
   nano /var/lib/postgresql/data/postgresql.conf
   
   # Add/update these lines:
   ssl = on
   ssl_cert_file = 'server.crt'
   ssl_key_file = 'server.key'
   ```

4. **Restart PostgreSQL:**
   ```bash
   docker restart <postgres-container-name>
   # OR if using systemd:
   systemctl restart postgresql
   ```

### Step 2: Update Your App Configuration

1. **Remove `POSTGRES_ALLOW_INSECURE` from .env:**
   ```env
   POSTGRES_URL=postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb
   # POSTGRES_ALLOW_INSECURE=TRUE  <- Remove this line
   ```

2. **Update docker-compose.yaml:**
   ```yaml
   environment:
     POSTGRES_URL: "postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb?sslmode=require"
     # Remove POSTGRES_ALLOW_INSECURE line
   ```

3. **Update Coolify environment variables:**
   ```
   POSTGRES_URL=postgresql://myuser:strongpassword@HOST:5432/myappdb?sslmode=require
   # Remove POSTGRES_ALLOW_INSECURE
   ```

---

## Option 3: Mixed Environment Setup

For development (localhost) without SSL, production with SSL:

### .env (local development)
```env
POSTGRES_URL=postgresql://localhost:5432/myappdb
POSTGRES_ALLOW_INSECURE=TRUE
```

### Coolify Production
```env
POSTGRES_URL=postgresql://user:pass@production-host:5432/myappdb?sslmode=require
# No POSTGRES_ALLOW_INSECURE
```

---

## Testing SSL Connection

### Test from command line:
```bash
# Without SSL (should work with POSTGRES_ALLOW_INSECURE=TRUE)
psql "postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb"

# With SSL (should work after enabling SSL on server)
psql "postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb?sslmode=require"
```

### Test from Node.js:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://myuser:strongpassword@46.225.211.198:5432/myappdb',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT version()', (err, res) => {
  console.log(err ? err.message : res.rows[0].version);
  pool.end();
});
```

---

## Docker Compose Usage

### Start services:
```bash
docker-compose up -d
```

### View logs:
```bash
docker-compose logs -f app
```

### Stop services:
```bash
docker-compose down
```

---

## Security Recommendations

1. ✅ **Use SSL in production** (Option 2)
2. ✅ **Use strong passwords** (already done)
3. ✅ **Restrict database access by IP** in Hetzner firewall
4. ✅ **Use environment-specific credentials**
5. ✅ **Rotate credentials regularly**
6. ⚠️ **Never commit .env to git** (add to .gitignore)

---

## Quick Reference

| Environment Variable | Purpose | Example |
|---------------------|---------|---------|
| `POSTGRES_URL` | Database connection string | `postgresql://user:pass@host:5432/db` |
| `POSTGRES_ALLOW_INSECURE` | Allow non-SSL connections | `TRUE` or `FALSE` |
| `POSTGRES_SSL_MODE` | SSL mode preference | `disable`, `require`, `verify-ca` |

---

## Troubleshooting

### Error: "The server does not support SSL connections"
- **Solution:** Add `POSTGRES_ALLOW_INSECURE=TRUE` to environment

### Error: "SSL connection failed"
- **Solution:** Either enable SSL on server OR add `POSTGRES_ALLOW_INSECURE=TRUE`

### Error: "password authentication failed"
- **Check:** Username, password, and database name in connection string

### Error: "Connection refused"
- **Check:** PostgreSQL is running and firewall allows port 5432

---

## Current Setup Summary

✅ **What's fixed:**
- Added `POSTGRES_ALLOW_INSECURE=TRUE` to .env
- Updated docker-compose.yaml with proper environment variables
- App can now connect to Hetzner PostgreSQL without SSL

⚠️ **Security Warning:**
- Connection is NOT encrypted
- Consider enabling SSL on Hetzner PostgreSQL server for production

🔐 **Recommended Next Step:**
- Follow "Option 2: Enable SSL on PostgreSQL" above for secure connections
