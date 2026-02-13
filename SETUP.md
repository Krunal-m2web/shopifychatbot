# Shopify AI Chatbot - Setup Guide

## Prerequisites

- Node.js 20.19+ or 22.12+
- Shopify Partner account
- Neon PostgreSQL database (free tier works)
- OpenAI API key
- Anthropic API key
- Redis (local or cloud - required for BullMQ)
- Ably account (optional, for real-time)
- Mailgun account (optional, for email notifications)

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd chat-bot
npm install
cd widget
npm install
cd ..
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

**Required variables:**
- `SHOPIFY_API_KEY` - From Shopify Partners dashboard
- `SHOPIFY_API_SECRET` - From Shopify Partners dashboard
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NEON_DATABASE_URL` - Same as DATABASE_URL (or unpooled variant)
- `OPENAI_API_KEY` - For embeddings (text-embedding-3-small)
- `ANTHROPIC_API_KEY` - For Claude Sonnet 4.5

**Optional but recommended:**
- `ABLY_API_KEY` - For real-time chat (free tier available)
- `REDIS_URL` - For BullMQ job queue (redis://localhost:6379 or cloud Redis)
- `MAILGUN_API_KEY` - For escalation emails
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `SENTRY_DSN` - Error tracking

### 3. Set Up Database

```bash
# Generate Prisma client and push schema
npm run db:push

# Set up pgvector extension and vector functions
npm run db:vector-setup
```

### 4. Build the Chat Widget

```bash
npm run build:widget
```

### 5. Start Development Server

```bash
npm run dev
```

## Project Structure

```
chat-bot/
├── app/
│   ├── routes/              # API routes and pages
│   │   ├── api.chat.ts      # Main chat endpoint
│   │   ├── api.sync.ts      # Sync trigger
│   │   ├── app.*.tsx        # Dashboard pages
│   │   └── webhooks.*.ts    # Shopify webhooks
│   ├── services/            # Business logic
│   │   ├── vectorStore/     # Vector DB abstraction
│   │   ├── rag/             # RAG pipeline
│   │   ├── sync/            # Shopify data sync
│   │   ├── orders/          # Order lookup
│   │   ├── recommendations/ # Product recommendations
│   │   ├── handover/        # Escalation logic
│   │   └── email/           # Email service
│   └── lib/                 # External clients
│       ├── neon.ts          # Neon database
│       ├── ably.ts          # Real-time messaging
│       ├── redis.ts         # Cache
│       └── queue.ts         # QStash job queue
├── widget/                  # Preact chat widget
│   └── src/
│       ├── Widget.tsx       # Main component
│       ├── ChatWindow.tsx   # Chat UI
│       └── hooks/           # useChat hook
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # SQL migrations
└── scripts/
    └── run-sql-migration.ts # pgvector setup
```

## Key Features Implemented

### ✅ Vector Store with Neon pgvector
- PostgreSQL with pgvector extension
- HNSW indexing for fast similarity search
- Cosine similarity with configurable threshold

### ✅ RAG Pipeline
- Claude Sonnet 4.5 for response generation
- OpenAI embeddings (text-embedding-3-small, 1536 dimensions)
- Semantic search with configurable similarity threshold
- Context-aware responses

### ✅ Shopify Integration
- Product, collection, and policy sync
- Webhook handlers for real-time updates
- GraphQL Admin API integration

### ✅ Human Handover
- Intelligent escalation detection
- Email notifications via Mailgun
- Dashboard for managing escalations

### ✅ Real-time Chat
- Ably-powered real-time messaging
- Typing indicators
- Connection status

### ✅ Dashboard
- Conversation history
- Analytics and metrics
- Widget customization
- Embed code generation

### ✅ Background Jobs
- BullMQ for reliable job queue
- Redis-backed persistent jobs
- Product sync and webhook processing
- Automatic retry logic and error handling

## Deployment

### Vercel (Main App)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy:

```bash
npm run deploy
```

### Widget Hosting

The widget is built to `build/widget/widget.iife.js` and served as a static asset via Vercel.

Merchants add this to their theme:

```html
<script src="https://your-app.vercel.app/widget/widget.iife.js"
        data-merchant-id="MERCHANT_UUID"
        defer></script>
```

## Usage

### Initial Sync

After installation, the app automatically queues a full sync of products, collections, and policies to the vector store. This happens on the first merchant login.

### Manual Sync

Merchants can trigger a manual sync from Settings → Sync Products button.

### Customization

Merchants can customize:
- Widget colors
- Position (bottom-right or bottom-left)
- Welcome message
- Bot name

## Troubleshooting

### Database Connection Errors

Ensure your `DATABASE_URL` is correct and includes `?sslmode=require`:

```
postgresql://user:pass@host.region.aws.neon.tech/dbname?sslmode=require
```

### Vector Search Returns No Results

1. Check if products were synced: query `documents` table
2. Verify `merchant_id` matches
3. Lower similarity threshold (default: 0.7)

### Widget Not Loading

1. Check browser console for errors
2. Verify `data-merchant-id` attribute is set
3. Ensure CORS is enabled on API routes

### Webhooks Not Processing

1. Check BullMQ worker is running (`npm run worker`)
2. Verify webhook URLs in `shopify.app.toml`
3. Check webhook logs in Shopify Partners dashboard
4. Check Redis connection

## API Endpoints

- `POST /api/chat` - Send message, get AI response
- `GET /api/ably-token` - Get Ably token for real-time
- `GET /api/widget-config` - Get widget configuration
- `POST /api/sync` - Trigger manual sync
- `POST /webhooks/products` - Product webhook handler

## Support

For issues, check:
1. Server logs (Vercel dashboard)
2. Browser console (widget)
3. Sentry (if configured)
4. Database logs (Neon dashboard)
