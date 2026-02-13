# BullMQ Background Jobs Setup

This project uses **BullMQ** for reliable background job processing with Redis as the backing store.

## Why BullMQ?

- **Reliable**: Jobs are persisted in Redis, survive server restarts
- **Scalable**: Workers can run on separate servers/containers
- **Observable**: Built-in job monitoring and retries
- **Cost-effective**: Uses standard Redis (free tier available on many platforms)

## Architecture

```
API Routes → BullMQ Queue → Redis ← BullMQ Worker
                ↓                        ↓
         [Job Enqueued]          [Job Processed]
```

## Prerequisites

You need a Redis instance. Choose one:

### Option 1: Local Redis (Development)
```bash
# macOS
brew install redis
brew services start redis

# Windows (via WSL)
sudo apt install redis-server
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Option 2: Cloud Redis (Production)

**Upstash Redis** (Free tier available):
1. Go to https://console.upstash.com/
2. Create a new Redis database
3. Copy the connection string (format: `redis://default:PASSWORD@HOST:PORT`)
4. Add to `.env`:
   ```
   REDIS_URL=rediss://default:AbCd...@us1-example.upstash.io:6379
   ```

**Railway** (Free $5/month credit):
1. Go to https://railway.app/
2. Create new project → Add Redis
3. Copy `REDIS_URL` from environment variables

**Render** (Free tier available):
1. Go to https://render.com/
2. Create Redis instance
3. Copy internal connection string

## Configuration

Add to your `.env`:
```bash
# Local development
REDIS_URL=redis://localhost:6379

# Or production (Upstash example)
REDIS_URL=rediss://default:PASSWORD@endpoint.upstash.io:6379
```

## Running the System

### 1. Start the App (API + Frontend)
```bash
npm run dev
```

This starts the Shopify app which:
- Serves the admin dashboard
- Exposes API endpoints
- **Enqueues jobs** to Redis

### 2. Start the Workers (Separate Terminal)
```bash
npm run worker
```

This starts the BullMQ workers which:
- **Process jobs** from Redis
- Handle webhooks (product/collection updates)
- Run sync jobs (full catalog sync)

**Important**: Both must run simultaneously! The app creates jobs, workers process them.

## Job Types

### 1. Webhook Jobs (Queue: `webhooks`)
- **Triggered by**: Shopify product/collection webhooks
- **Concurrency**: 5 jobs at once
- **Retries**: 3 attempts with exponential backoff
- **Purpose**: Keep vector store in sync with Shopify catalog

**Example**:
```typescript
import { enqueueWebhookJob } from '~/lib/queue';

await enqueueWebhookJob({
  topic: 'products/update',
  merchantId: 'uuid',
  shopifyId: 'gid://shopify/Product/123',
  data: productData
});
```

### 2. Sync Jobs (Queue: `sync`)
- **Triggered by**: Dashboard "Sync Now" button or initial install
- **Concurrency**: 2 jobs at once (resource-intensive)
- **Retries**: 2 attempts
- **Purpose**: Full/partial catalog synchronization

**Example**:
```typescript
import { enqueueSyncJob } from '~/lib/queue';

await enqueueSyncJob({
  merchantId: 'uuid',
  shopDomain: 'store.myshopify.com',
  syncType: 'full' // or 'products', 'collections', 'policies'
});
```

## Monitoring Jobs

### Development
Watch worker logs:
```bash
npm run worker
```

You'll see:
- `📦 Processing webhook: products/update for merchant abc-123`
- `✅ Job webhook-123 completed`
- `❌ Job failed: Connection timeout` (auto-retries)

### Production
Use a BullMQ dashboard:

**Option 1: Bull Board** (self-hosted UI)
```bash
npm install @bull-board/api @bull-board/express
```

**Option 2: Upstash QStash Dashboard** (if using Upstash Redis)
- Built-in monitoring at console.upstash.com

## Deployment

### Vercel (App) + Railway (Workers)

**Vercel** (API + Frontend):
```bash
vercel --prod
```

**Railway** (Workers only):
1. Create `railway.toml`:
   ```toml
   [build]
   builder = "nixpacks"

   [deploy]
   startCommand = "npm run worker"
   ```
2. Push to GitHub → Connect Railway → Auto-deploy

### Single Platform (Render)
Create two services:
1. **Web Service**: `npm start` (app)
2. **Background Worker**: `npm run worker` (workers)

Both share the same Redis instance.

## Troubleshooting

### "ECONNREFUSED 127.0.0.1:6379"
- Redis is not running
- Fix: Start Redis locally or check cloud Redis connection string

### Jobs stuck in queue, not processing
- Workers not running
- Fix: Ensure `npm run worker` is running in a separate terminal

### "Job failed after 3 attempts"
- Check worker logs for error details
- Common causes: Invalid Shopify session, network timeout, embedding API error

### Clear failed jobs
```bash
# Install BullMQ CLI globally
npm install -g bullmq-cli

# Clear failed jobs
bullmq clear webhooks failed --redis-url $REDIS_URL
bullmq clear sync failed --redis-url $REDIS_URL
```

## Development Workflow

1. **Make code changes** to workers (`workers/webhookProcessor.ts`)
2. **Restart workers**: Ctrl+C, then `npm run worker`
3. **Test**: Trigger a webhook or sync job from dashboard
4. **Watch logs**: Worker terminal shows job processing

## Production Checklist

- [ ] Redis instance with persistent storage enabled
- [ ] `REDIS_URL` environment variable set in both app and worker environments
- [ ] Workers deployed and running (`npm run worker`)
- [ ] Worker health monitoring set up (e.g., uptime checks)
- [ ] Job retention configured (completed jobs auto-delete after 100)
- [ ] Sentry error tracking enabled for worker errors

## Cost Estimation

**Free Tier Options**:
- **Upstash Redis**: 10,000 commands/day free
- **Railway**: $5/month credit (enough for small Redis + worker)
- **Render**: Free Redis with 25MB storage

**Paid (at scale)**:
- **Upstash Redis**: $0.20 per 100K commands (~$10-20/month for moderate traffic)
- **Railway**: ~$5-15/month for worker + Redis
- **Dedicated Redis**: AWS ElastiCache, DigitalOcean Managed Redis (~$15-50/month)

## Further Reading

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Commands](https://redis.io/commands/)
- [Upstash Redis](https://upstash.com/docs/redis)
