# Cron Jobs API

This directory contains API endpoints designed to be called by cron job services (like Vercel Cron, GitHub Actions, or external cron services).

## Main Orchestrator Endpoint

### Cron Orchestrator
- **Endpoint**: `GET /api/cron` or `POST /api/cron`
- **Purpose**: Central hub for managing and running all cron jobs

#### GET /api/cron
Lists all available cron jobs (built-in and custom) with their status:
```json
{
  "success": true,
  "data": {
    "builtIn": [...],
    "custom": [...],
    "total": 12,
    "enabled": 2
  }
}
```

#### POST /api/cron
Run specific or all enabled cron jobs:
```bash
# Run all jobs
curl -X POST "https://yourdomain.com/api/cron?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "all"}'

# Run specific job
curl -X POST "https://yourdomain.com/api/cron?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "payments"}'
```

## Available Endpoints

### Payments Cron Job
- **Endpoint**: `GET /api/cron/payments`
- **Purpose**: Check and update pending EuPago payment statuses
- **Function**: Calls `checkPending()` from `@/lib/server/gateways.js`

#### Features:
- Checks all pending EuPago orders (Multibanco & MB WAY)
- Updates orders to "paid" when payment is confirmed
- Cancels orders that have expired based on payment method timeouts
- Returns detailed results of checked, updated, and cancelled orders

#### Security:
Optional cron secret verification via query parameter:
```
GET /api/cron/payments?secret=YOUR_CRON_SECRET
```

Set `CRON_SECRET` environment variable to enable secret verification.

#### Response Format:
```json
{
  "success": true,
  "message": "Payments check completed successfully",
  "data": {
    "checked": 5,
    "updated": 2,
    "cancelled": 1,
    "results": [...]
  },
  "timestamp": "2026-02-10T10:30:00.000Z"
}
```

#### Setup Examples:

**Vercel Cron (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/payments",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Using the Orchestrator (Recommended):**
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**GitHub Actions:**
```yaml
name: Run All Cron Jobs
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  run-crons:
    runs-on: ubuntu-latest
    steps:
      - name: Run All Jobs
        run: |
          curl -X POST "https://yourdomain.com/api/cron?secret=${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"job": "all"}'
```

**External Cron Service:**
```bash
# Run all jobs every 5 minutes
*/5 * * * * curl -X POST "https://yourdomain.com/api/cron?secret=your-secret" \
  -H "Content-Type: application/json" \
  -d '{"job": "all"}'

# Run specific job
*/5 * * * * curl -X GET "https://yourdomain.com/api/cron/payments?secret=your-secret"
```

## Recommended Schedule

- **Payments**: Every 5 minutes (to catch MB WAY payments quickly before they expire)
- **Custom Jobs**: Every 10 minutes (runs database-configured HTTP jobs)
- **Orchestrator (all)**: Every 5-10 minutes (runs all enabled jobs)

## Additional Recommended Cron Jobs

The orchestrator includes references to these recommended cron jobs (implementation pending):

### Marketing & E-commerce
- **Abandoned Cart Reminders** (`/api/cron/abandoned-carts`)
  - Schedule: Every 6 hours (`0 */6 * * *`)
  - Purpose: Send email reminders for carts inactive for 24+ hours

- **Send Newsletters** (`/api/cron/send-newsletters`)
  - Schedule: Every 15 minutes (`*/15 * * * *`)
  - Purpose: Process and send queued newsletter campaigns

- **Check Inventory** (`/api/cron/check-inventory`)
  - Schedule: Daily at 9 AM (`0 9 * * *`)
  - Purpose: Alert admins when products are low in stock

### Maintenance & Performance
- **Clean Sessions** (`/api/cron/cleanup-sessions`)
  - Schedule: Daily at 2 AM (`0 2 * * *`)
  - Purpose: Remove expired sessions and temporary data

- **Clean Logs** (`/api/cron/cleanup-logs`)
  - Schedule: Weekly on Sunday at 4 AM (`0 4 * * 0`)
  - Purpose: Archive/delete logs older than 30 days

- **Send Notifications** (`/api/cron/send-notifications`)
  - Schedule: Every 5 minutes (`*/5 * * * *`)
  - Purpose: Process queued in-app and email notifications

### SEO & Analytics
- **Update Sitemap** (`/api/cron/update-sitemap`)
  - Schedule: Daily at 3 AM (`0 3 * * *`)
  - Purpose: Regenerate sitemap.xml with latest products/pages

- **Update Analytics** (`/api/cron/update-analytics`)
  - Schedule: Every hour (`0 */1 * * *`)
  - Purpose: Aggregate visitor stats and generate reports

## Monitoring

Check your deployment logs to monitor cron job execution:
- Successful runs log completion statistics
- Failed runs log detailed error information
- All runs include timestamps for tracking

## Security

All cron endpoints support optional secret verification:

**Environment Variable:**
```env
CRON_SECRET=your-secure-random-secret-here
```

**Usage:**
```bash
# Query parameter
curl "https://yourdomain.com/api/cron/payments?secret=your-secret"

# Header (POST requests)
curl -X POST "https://yourdomain.com/api/cron" \
  -H "x-cron-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"job": "all"}'
```

If `CRON_SECRET` is not set, all requests are allowed (useful for development). Always set this in production.

**Best Practices:**
- Use a long, random secret (minimum 32 characters)
- Store in environment variables, never commit to git
- Rotate secrets periodically
- Use HTTPS for all cron requests
- Consider IP whitelisting at the infrastructure level

## Adding New Cron Jobs

### Option 1: Database-Configured HTTP Jobs
Add jobs via the admin panel or directly to the `cronjobs` table:
```json
{
  "id": "custom-job-1",
  "name": "My Custom Job",
  "description": "Calls external API",
  "type": "http",
  "enabled": true,
  "intervalMinutes": 60,
  "config": {
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token123"
    },
    "body": {
      "action": "sync"
    }
  }
}
```

### Option 2: Create New Route
1. Create a new file under `/api/cron/your-job/route.js`
2. Implement GET handler (recommended) or POST handler
3. Call your server function and handle errors
4. Add to the orchestrator's `builtInJobs` array in `/api/cron/route.js`
5. Update this README with documentation

**Example:**
```javascript
// /api/cron/abandoned-carts/route.js
import { NextResponse } from 'next/server';
import { sendAbandonedCartReminders } from '@/lib/server/marketing.js';

export async function GET(request) {
    try {
        const result = await sendAbandonedCartReminders();
        return NextResponse.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
```