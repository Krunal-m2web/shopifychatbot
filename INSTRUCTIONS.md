# Shopify AI Chatbot — Project Instructions

A RAG-powered AI customer support chatbot for Shopify stores. Merchants install this app, it syncs their product catalog into a vector database, and provides an AI-powered chat widget on their storefront that answers customer questions using their store's actual data.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Local Development Setup](#local-development-setup)
7. [Database Setup](#database-setup)
8. [How It Works](#how-it-works)
9. [API Endpoints](#api-endpoints)
10. [Admin Dashboard Pages](#admin-dashboard-pages)
11. [Widget System](#widget-system)
12. [Theme Extension](#theme-extension)
13. [Background Jobs](#background-jobs)
14. [RAG Pipeline](#rag-pipeline)
15. [Escalation System](#escalation-system)
16. [Real-time Messaging](#real-time-messaging)
17. [Deployment](#deployment)
18. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shopify Storefront                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Theme Extension (chat-embed.liquid)                     │  │
│  │  → Loads widget.iife.js from APP_URL                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│              ┌─────────────▼─────────────┐                     │
│              │  Preact Chat Widget       │                     │
│              │  (Shadow DOM, IIFE)       │                     │
│              └─────────┬─────────────────┘                     │
└────────────────────────┼───────────────────────────────────────┘
                         │ HTTP + Ably WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    App Backend (React Router)                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ /api/chat│  │/api/sync │  │/api/ably- │  │ /api/widget- │   │
│  │          │  │          │  │  token    │  │  config      │   │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────────┘   │
│       │              │                                          │
│  ┌────▼─────┐  ┌─────▼────┐                                    │
│  │RAG Engine│  │Sync Svc  │                                    │
│  │(Claude)  │  │(Products)│                                    │
│  └────┬─────┘  └────┬─────┘                                    │
│       │              │                                          │
│  ┌────▼──────────────▼────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Neon PostgreSQL        │  │  Redis    │  │    Ably       │   │
│  │ (pgvector)             │  │ (BullMQ)  │  │ (Real-time)   │   │
│  └────────────────────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React Router v7 (SSR) | Server-side rendering, file-based routing |
| **Language** | TypeScript | Full-stack type safety |
| **AI** | Claude (Anthropic) | Chat response generation |
| **Embeddings** | OpenAI | Text-to-vector embeddings for RAG |
| **Database** | PostgreSQL (Neon) + pgvector | Data storage + vector similarity search |
| **ORM** | Prisma | Database access and migrations |
| **Queue** | BullMQ + Redis | Background job processing |
| **Real-time** | Ably | WebSocket messaging for chat |
| **Widget** | Preact | Lightweight chat widget (IIFE bundle) |
| **Email** | Mailgun | Escalation notifications |
| **Monitoring** | Sentry | Error tracking |
| **Platform** | Shopify App (Embedded) | Runs inside Shopify Admin iframe |

---

## Project Structure

```
chat-bot/
├── app/                              # Main application
│   ├── routes/                       # File-based routes
│   │   ├── app.tsx                   # Admin layout + merchant upsert
│   │   ├── app._index.tsx            # Dashboard home
│   │   ├── app.settings.tsx          # Widget customization
│   │   ├── app.conversations.tsx     # Conversation list
│   │   ├── app.conversations.$id.tsx # Single conversation view
│   │   ├── app.analytics.tsx         # Analytics dashboard
│   │   ├── app.additional.tsx        # Additional features
│   │   ├── api.chat.ts              # POST: Chat message handler
│   │   ├── api.widget-config.ts     # GET: Widget config for storefront
│   │   ├── api.sync.ts             # POST: Trigger product sync
│   │   ├── api.ably-token.ts       # GET: Ably auth token
│   │   ├── webhooks.products.ts     # Shopify product webhooks
│   │   ├── webhooks.app.*.tsx       # Shopify app webhooks
│   │   ├── auth.login/             # Login routes
│   │   └── _index/                 # Public landing page
│   │
│   ├── services/                    # Business logic
│   │   ├── rag/                    # RAG pipeline
│   │   │   ├── queryEngine.ts      # Main AI query engine
│   │   │   ├── prompts.ts          # System prompts
│   │   │   └── embeddings.ts       # OpenAI embedding generation
│   │   ├── vectorStore/            # Vector database operations
│   │   │   ├── index.ts            # Vector store interface
│   │   │   ├── neon.ts             # Neon pgvector implementation
│   │   │   └── types.ts            # TypeScript types
│   │   ├── sync/                   # Data synchronization
│   │   │   ├── index.ts            # fullSync() orchestrator
│   │   │   ├── productSync.ts      # Product sync
│   │   │   ├── collectionSync.ts   # Collection sync
│   │   │   └── policySync.ts       # Policy sync
│   │   ├── handover/               # Human escalation
│   │   │   ├── detection.ts        # Escalation trigger detection
│   │   │   └── notification.ts     # Email notifications
│   │   ├── orders/                 # Order lookup
│   │   └── recommendations/        # Product recommendations
│   │
│   ├── lib/                        # External service clients
│   │   ├── queue.ts                # BullMQ queue setup
│   │   ├── redis.ts                # Redis client
│   │   ├── ably.ts                 # Ably client
│   │   ├── neon.ts                 # Neon pgvector client
│   │   ├── theme-status.server.ts  # Theme widget activation check
│   │   ├── env.ts                  # Environment variable loader
│   │   └── sentry.ts              # Sentry initialization
│   │
│   ├── shopify.server.ts           # Shopify app configuration
│   ├── db.server.ts                # Prisma client singleton
│   ├── root.tsx                    # React Router root
│   └── entry.server.tsx            # Server entry point
│
├── widget/                          # Standalone chat widget
│   ├── src/
│   │   ├── index.tsx               # Self-initializing entry point
│   │   ├── Widget.tsx              # Main widget (open/close state)
│   │   ├── ChatWindow.tsx          # Chat UI container
│   │   ├── MessageList.tsx         # Message rendering
│   │   ├── MessageInput.tsx        # Text input
│   │   ├── hooks/useChat.ts        # Chat state + Ably connection
│   │   ├── types.ts               # Widget TypeScript types
│   │   └── styles/widget.css      # Widget styles
│   ├── vite.config.ts              # Widget build config (IIFE output)
│   └── package.json                # Widget dependencies (Preact, Ably)
│
├── extensions/                      # Shopify theme extension
│   └── chat-widget/
│       ├── blocks/
│       │   └── chat-embed.liquid   # Theme block (loads widget script)
│       ├── locales/
│       │   └── en.default.json     # i18n strings
│       └── shopify.extension.toml  # Extension manifest
│
├── workers/                         # Background job processors
│   └── index.ts                    # BullMQ worker entry
│
├── scripts/                         # Utility scripts
│   ├── run-sql-migration.ts        # pgvector setup script
│   └── test-db-connection.ts       # Database connection test
│
├── prisma/
│   └── schema.prisma               # Database schema
│
├── public/
│   └── widget/                     # Built widget files (served statically)
│       └── widget.iife.js
│
├── shopify.app.toml                 # Shopify app config
├── package.json                     # Dependencies & scripts
├── vite.config.ts                   # Main app Vite config
├── tsconfig.json                    # TypeScript config
└── .env                            # Environment variables (not committed)
```

---

## Prerequisites

- **Node.js** >= 20.19 (< 22 || >= 22.12)
- **npm** (comes with Node.js)
- **Shopify CLI** installed globally: `npm install -g @shopify/cli`
- **PostgreSQL** database with pgvector extension (Neon recommended)
- **Redis** server (local or Upstash for production)
- **Shopify Partner Account** with a development store

### External Service Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Neon | PostgreSQL + pgvector | https://neon.tech |
| Anthropic | Claude AI API | https://console.anthropic.com |
| OpenAI | Text embeddings | https://platform.openai.com |
| Ably | Real-time WebSockets | https://ably.com |
| Mailgun | Escalation emails | https://mailgun.com |
| Sentry | Error tracking (optional) | https://sentry.io |
| Redis/Upstash | Job queue | https://upstash.com (or local) |

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Shopify App (from your Partner Dashboard)
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,read_orders,read_customers,read_content,read_themes
SHOPIFY_APP_URL=https://your-dev-store.myshopify.com

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
NEON_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Redis (for BullMQ job queue)
REDIS_URL=redis://localhost:6379

# Real-time Messaging (Ably)
ABLY_API_KEY=your_ably_key

# Email Notifications (Mailgun)
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_FROM_EMAIL=chatbot@your-domain.com

# Error Tracking (optional)
SENTRY_DSN=https://your-sentry-dsn

# Application
APP_URL=https://your-deployed-app-url.com
NODE_ENV=development
```

> **IMPORTANT:** The `APP_URL` must include `https://`. This URL is used by the storefront widget to call your backend APIs. During local development, this is your Cloudflare tunnel URL (set automatically by `shopify app dev`).

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
cd widget && npm install && cd ..
```

### 2. Set up the database

```bash
# Push Prisma schema to your Neon database
npm run db:push

# Enable pgvector extension and create vector functions
npm run db:vector-setup
```

### 3. Build the chat widget

```bash
npm run build:widget
```

This builds `widget.iife.js` into `public/widget/` so it can be served by the Vite dev server.

### 4. Start the development server

```bash
npm run dev
```

This runs `shopify app dev`, which:
- Starts the Vite dev server
- Creates a Cloudflare tunnel for HTTPS access
- Opens the app in your Shopify admin

### 5. Start the background worker (separate terminal)

```bash
npm run worker
```

This processes BullMQ jobs for product sync and webhook handling.

### 6. Activate the chat widget

1. Open your app in Shopify admin → the dashboard shows an "Activate Chat Widget" button
2. Click it → you'll be taken to the theme editor with the Chat Bot block pre-selected
3. Toggle it ON and click **Save**
4. Return to the app → dashboard should show "Chat widget is active"

---

## Database Setup

### Prisma Schema Models

| Model | Purpose |
|-------|---------|
| **Session** | Shopify session storage (managed by Shopify SDK) |
| **Merchant** | Store configuration, widget settings, access tokens |
| **Conversation** | Chat conversations (status: active/resolved/escalated) |
| **Message** | Individual chat messages (role: user/assistant/system) |
| **Escalation** | Escalated conversations awaiting human response |
| **AnalyticsEvent** | Event tracking for metrics and analytics |

### Vector Store (pgvector)

The vector store is separate from Prisma — it uses raw SQL via `@neondatabase/serverless`. The `documents` table stores:

- `id` — UUID
- `merchant_id` — Owner merchant
- `content` — Text content (product descriptions, policies, etc.)
- `embedding` — 1536-dimension vector (OpenAI text-embedding-3-small)
- `metadata` — JSON (source type, Shopify ID, title, URL, etc.)
- `source_type` — product / collection / policy
- `shopify_id` — Original Shopify resource ID

HNSW indexes are created for fast cosine similarity search.

### Setup Commands

```bash
npm run db:push          # Push Prisma schema changes
npm run db:vector-setup  # Create pgvector tables and indexes
npm run db:test          # Test database connection
```

---

## How It Works

### Installation Flow

1. Merchant installs the app from Shopify App Store
2. `app.tsx` loader runs on first visit:
   - Creates/updates the Merchant record in the database
   - Sets a `chatbot.app_url` metafield on the shop (with `PUBLIC_READ` storefront access)
   - Queues an initial full product sync via BullMQ
3. Dashboard shows activation status and prompts to enable the widget

### Customer Chat Flow

```
Customer opens storefront
         │
         ▼
Theme extension (chat-embed.liquid) loads
         │
         ▼
Reads shop.metafields.chatbot.app_url
         │
         ▼
Fetches GET {appUrl}/api/widget-config?shop={shop}
         │
         ▼
Gets merchantId + widget config (colors, bot name, etc.)
         │
         ▼
Loads {appUrl}/widget/widget.iife.js
         │
         ▼
Widget initializes, connects to Ably via {appUrl}/api/ably-token
         │
         ▼
Customer sends message
         │
         ▼
POST {appUrl}/api/chat { merchantId, sessionId, content }
         │
         ▼
Backend: Create/find conversation → Save message → RAG query
         │
         ▼
RAG: Embed query → Vector search → Build context → Call Claude
         │
         ▼
Check escalation triggers → Save response → Publish via Ably
         │
         ▼
Widget receives response in real-time via Ably subscription
```

### Data Sync Flow

```
Merchant clicks "Sync Products" on dashboard
         │
         ▼
POST /api/sync → Queues BullMQ job
         │
         ▼
Worker picks up job → fullSync()
         │
         ▼
Fetch products/collections/policies via Shopify GraphQL API
         │
         ▼
Generate embeddings via OpenAI (text-embedding-3-small)
         │
         ▼
Upsert vectors + metadata into pgvector
         │
         ▼
Products are now searchable by the AI chatbot
```

---

## API Endpoints

### `POST /api/chat`
Main chat endpoint. Called by the storefront widget.

**Request body:**
```json
{
  "merchantId": "uuid",
  "sessionId": "string",
  "content": "What products do you have?",
  "conversationId": "uuid (optional, for continuing a conversation)"
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "response": "We have several products...",
  "sources": [{ "title": "Product Name", "url": "..." }]
}
```

**Flow:** Creates/finds conversation → Saves user message → Publishes via Ably → Runs RAG pipeline → Saves AI response → Publishes via Ably → Checks escalation triggers.

### `GET /api/widget-config?shop={shopDomain}`
Returns widget configuration for a merchant's store.

**Response:**
```json
{
  "merchantId": "uuid",
  "config": {
    "primaryColor": "#2563EB",
    "position": "bottom-right",
    "welcomeMessage": "Hi! How can I help?",
    "botName": "Support Assistant"
  }
}
```

### `GET /api/ably-token?sessionId={sessionId}`
Generates a scoped Ably token for real-time chat.

### `POST /api/sync`
Triggers product/collection/policy sync. Called from the dashboard "Sync Products" button.

**Request body:**
```json
{
  "background": true
}
```

### Webhooks

| Endpoint | Topics |
|----------|--------|
| `POST /webhooks/products` | products/create, products/update, products/delete |
| `POST /webhooks/products` | collections/create, collections/update, collections/delete |
| `POST /webhooks/app/uninstalled` | app/uninstalled |
| `POST /webhooks/app/scopes_update` | app/scopes_update |

---

## Admin Dashboard Pages

All admin pages use Shopify Polaris web components (`<s-page>`, `<s-section>`, `<s-button>`, etc.) and run inside the Shopify Admin iframe.

### Dashboard (`/app`)
- Welcome message with merchant name
- Widget activation banner (warning if inactive, success if active)
- Stats cards: Total conversations, AI resolution rate, active conversations, escalations
- Recent conversations list
- Setup status sidebar with quick links

### Settings (`/app/settings`)
- Bot name input
- Welcome message textarea
- Primary color picker
- Widget position selector (bottom-right / bottom-left)
- Save button with loading state
- Widget status badge in sidebar

### Conversations (`/app/conversations`)
- List of all conversations with status badges
- Click to view full message thread

### Conversation Detail (`/app/conversations/:id`)
- Full message history
- Escalation details if applicable
- Customer info

### Analytics (`/app/analytics`)
- Metrics dashboard with resolution rates
- Top escalation reasons
- Conversation volume over time

---

## Widget System

The chat widget is a standalone Preact application built as an IIFE (Immediately Invoked Function Expression) bundle.

### Build

```bash
cd widget && npm run build
```

Output: `public/widget/widget.iife.js`

### How it loads

1. Theme extension (`chat-embed.liquid`) reads `shop.metafields.chatbot.app_url`
2. Fetches `/api/widget-config` to get merchantId and config
3. Creates a `<script>` tag loading `widget.iife.js` with `data-merchant-id` and `data-app-url` attributes
4. Widget self-initializes, creates a shadow DOM container, renders the Preact app

### Widget Components

- **`index.tsx`** — Entry point; reads `data-*` attributes from its own script tag
- **`Widget.tsx`** — Main component; fetches config, manages open/close toggle
- **`ChatWindow.tsx`** — Chat UI with header, messages, and input
- **`MessageList.tsx`** — Renders message bubbles with typing indicator
- **`MessageInput.tsx`** — Text input with send button
- **`hooks/useChat.ts`** — Manages state, Ably connection, message sending

### Widget Config

Stored in `Merchant.widgetConfig` (JSON column):

```json
{
  "primaryColor": "#2563EB",
  "position": "bottom-right",
  "welcomeMessage": "Hi! How can I help you today?",
  "botName": "Support Assistant"
}
```

---

## Theme Extension

Located at `extensions/chat-widget/`.

### `blocks/chat-embed.liquid`

An app embed block with `"target": "body"` that loads on every page of the storefront.

**How it works:**
1. Checks `block.settings.enable_widget` (toggle in theme editor)
2. Reads `shop.metafields.chatbot.app_url` (auto-set by the app on each admin visit)
3. Fetches widget config from the app backend
4. Dynamically loads `widget.iife.js`

### Activation

Shopify does NOT allow programmatic activation of theme extensions. The app uses a **deep link** approach:

```
https://{shop}/admin/themes/current/editor?context=apps&activateAppId={client_id}/{block_handle}
```

This opens the theme editor with the Chat Bot block pre-selected. The merchant just toggles it ON and clicks Save.

The app detects activation status by:
1. Querying the published theme's `config/settings_data.json` via Admin GraphQL
2. Parsing the JSON to find blocks containing `/blocks/chat-embed/`
3. Checking if the block is not disabled

### Auto-Configuration

The `app_url` metafield is automatically created/updated every time a merchant opens the app in Shopify admin. The metafield has `PUBLIC_READ` storefront access so the Liquid template can read it. This eliminates any manual URL configuration.

---

## Background Jobs

### BullMQ Queues

| Queue | Job Type | Purpose |
|-------|----------|---------|
| `webhook-queue` | `process-webhook` | Handle Shopify webhook payloads |
| `sync-queue` | `process-sync` | Full or partial product sync |

### Running the Worker

```bash
npm run worker
```

The worker runs as a separate process (`workers/index.ts`) and processes jobs from both queues.

### Job Configuration

- **Webhook jobs:** 3 retries with exponential backoff, keeps last 100 completed
- **Sync jobs:** 2 retries, keeps last 50 completed

### Redis Requirement

BullMQ requires Redis. During development, use a local Redis server. For production, use Upstash or a managed Redis service.

If Redis is unavailable, the app gracefully degrades — sync calls are made as fire-and-forget with a 5-second timeout to prevent blocking the UI.

---

## RAG Pipeline

The Retrieval-Augmented Generation pipeline lives in `app/services/rag/`.

### Flow

1. **Embed query** — Convert user message to a 1536-dim vector via OpenAI
2. **Vector search** — Find top 5 documents with cosine similarity >= 0.7
3. **Build context** — Combine relevant documents into a context string
4. **Call Claude** — Send system prompt + context + conversation history to Claude
5. **Check escalation** — Evaluate if the conversation should be escalated to a human
6. **Return response** — AI response text + source references

### System Prompt

The AI is prompted to:
- Act as a helpful customer support agent for the specific store
- Only answer based on provided context (store data)
- Suggest contacting support if it can't answer
- Never make up product details or prices

### Document Types

| Source | Content |
|--------|---------|
| Products | Title, description, variants, prices, availability |
| Collections | Title, description, included products |
| Policies | Shipping, returns, privacy, terms of service |

---

## Escalation System

Located in `app/services/handover/`.

### Triggers

The system checks for escalation triggers after each AI response:

| Trigger | Examples |
|---------|----------|
| **Explicit request** | "talk to human", "speak to agent", "live chat" |
| **Frustration** | "angry", "disappointed", "ridiculous", "unacceptable" |
| **Sensitive topics** | "refund", "dispute", "lawsuit", "fraud", "legal" |
| **Low confidence** | No matching documents or similarity < 0.7 |
| **Conversation loops** | Bot repeating same answer, user repeating same question |

### Escalation Flow

1. Escalation trigger detected
2. Create `Escalation` record (reason, summary, customer info)
3. Update conversation status to `escalated`
4. Send email notification to merchant via Mailgun
5. Log analytics event

---

## Real-time Messaging

### Ably Setup

- **Server** creates scoped tokens via `/api/ably-token`
- **Widget** connects using token-based auth
- **Channels** follow the pattern: `conversation:{conversationId}`

### Events

| Event | Direction | Data |
|-------|-----------|------|
| `message` | Server → Widget | New chat message (user or assistant) |
| `typing` | Server → Widget | Typing indicator (on/off) |

---

## Deployment

### Build for Production

```bash
npm run build:all    # Builds both the app and widget
```

### Vercel Deployment

The app is designed to deploy on Vercel. Key considerations:

- Set all environment variables in Vercel dashboard
- `APP_URL` must be your Vercel deployment URL with `https://`
- The widget is served from `/widget/widget.iife.js` on the same domain
- Background worker needs a separate process (not on Vercel) — consider Railway or Render

### Deploy Shopify App

```bash
npm run deploy       # Deploys app config + extensions to Shopify
```

This publishes the theme extension so merchants can install it.

---

## Common Issues & Troubleshooting

### Blank screen on `shopify app dev`

**Cause:** Redis/BullMQ connection hanging in `app.tsx` loader.
**Fix:** Ensure Redis is running locally, or the app will timeout gracefully after 5 seconds.

### `ReferenceError: process is not defined`

**Cause:** Using `process.env` in client-side component code.
**Fix:** Pass server-side values through the loader, never reference `process.env` in React components.

### Widget returning 404

**Cause:** Widget not built, or built to wrong directory.
**Fix:** Run `npm run build:widget` — output goes to `public/widget/`.

### Widget calling wrong API URL

**Cause:** Widget using relative URLs that resolve to the storefront domain.
**Fix:** The widget uses `data-app-url` attribute from the script tag, which comes from the `chatbot.app_url` metafield.

### Dashboard shows "Activate" even after enabling widget

**Cause:** Block detection searching for wrong identifier format.
**Fix:** The detection in `theme-status.server.ts` searches for `/blocks/chat-embed/` in block types, matching Shopify's format `shopify://apps/{name}/blocks/chat-embed/{uid}`.

### Widget not appearing on storefront

1. Check the widget is toggled ON in theme editor (Online Store → Customize → App embeds)
2. Verify the `chatbot.app_url` metafield exists (open the app in admin to auto-set it)
3. Check browser console for errors
4. Ensure `APP_URL` in `.env` includes `https://` and points to the correct backend

---

## npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `shopify app dev` | Start dev server with Shopify CLI |
| `build` | `react-router build` | Build main app for production |
| `build:widget` | `cd widget && npm run build` | Build Preact widget to IIFE |
| `build:all` | Build app + widget | Full production build |
| `start` | `react-router-serve ./build/server/index.js` | Start production server |
| `worker` | `tsx workers/index.ts` | Start background job processor |
| `db:push` | `prisma db push` | Push schema changes to database |
| `db:vector-setup` | `tsx scripts/run-sql-migration.ts` | Create pgvector tables/indexes |
| `db:test` | `tsx scripts/test-db-connection.ts` | Test database connectivity |
| `deploy` | `shopify app deploy` | Deploy to Shopify |
| `typecheck` | `react-router typegen && tsc --noEmit` | Run type checking |
| `lint` | `eslint ...` | Run ESLint |

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `shopify.app.toml` | Shopify app config (client_id, scopes, webhooks) |
| `prisma/schema.prisma` | Database schema |
| `vite.config.ts` | Main app bundler config |
| `widget/vite.config.ts` | Widget bundler config (IIFE output) |
| `tsconfig.json` | TypeScript config (`~` alias → `./app`) |
| `extensions/chat-widget/shopify.extension.toml` | Theme extension manifest |

---

## Security Notes

- All API keys and secrets must be in `.env` (never committed to git)
- The `.env.example` file should contain placeholder values only — **never real keys**
- `APP_URL` must always use `https://`
- Ably tokens are scoped per session with limited capabilities
- Shopify webhooks are verified by the Shopify SDK
- The widget only has access to public-facing data (products, policies)
- Metafields use `PUBLIC_READ` access level (read-only from storefront)
