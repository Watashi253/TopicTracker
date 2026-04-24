# Application — Frontend

A full-stack **Next.js** web application acting as the primary user interface for the Topic Tracker system. It features a premium dynamic UI, Clerk authentication, and acts as an API Gateway to the `Database_and_bert_infra` (FastAPI + PostgreSQL) backend, while using MongoDB for localized user profile storage.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Primary Backend Integration:** FastAPI + PostgreSQL (via `Database_and_bert_infra`)
- **Secondary Database:** MongoDB (strictly for Clerk user profile syncing)
- **Authentication:** [Clerk](https://clerk.com/)
- **Language:** JavaScript / JSX
- **Styling:** Tailwind CSS (Premium Dark Mode with Glassmorphism)

---

## Project Structure

```
frontend/
├── public/                         # Static assets (images, fonts, icons)
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── evolution/
    │   │   │   └── [cluster_id]/
    │   │   │       └── route.js    # GET /api/evolution/[id] — proxy topic timeline
    │   │   ├── feed/
    │   │   │   └── route.js        # GET /api/feed — proxy latest articles
    │   │   ├── search/
    │   │   │   └── route.js        # GET /api/search — proxy semantic search
    │   │   ├── subscriptions/
    │   │   │   └── me/
    │   │   │       └── route.js    # GET /api/subscriptions/me — proxy subscriptions
    │   │   ├── profile/
    │   │   │   ├── delete/
    │   │   │   │   └── route.js    # DELETE /api/profile/delete — delete user profile
    │   │   │   └── update/
    │   │   │       └── route.js    # PATCH /api/profile/update — update user profile
    │   │   └── webhooks/
    │   │       └── clerk/
    │   │           └── route.js    # POST /api/webhooks/clerk — Clerk webhook handler
    │   ├── components/
    │   │   ├── Navbar.jsx          # Global navigation bar
    │   │   ├── NewsCard.jsx        # Card component for displaying news items
    │   │   └── ProfileActions.jsx  # Profile action buttons (edit, delete, etc.)
    │   ├── dashboard/
    │   │   └── page.jsx            # /dashboard — main dashboard page
    │   ├── feed/
    │   │   └── page.jsx            # /feed — news/content feed page
    │   ├── profile/
    │   │   └── page.jsx            # /profile — user profile page
    │   ├── sign-in/
    │   │   └── [[...index]]/
    │   │       └── page.jsx        # /sign-in — Clerk sign-in page
    │   ├── sign-up/
    │   │   └── [[...index]]/
    │   │       └── page.jsx        # /sign-up — Clerk sign-up page
    │   ├── subscriptions/
    │   │   └── page.jsx            # /subscriptions — manage subscriptions
    │   ├── track/
    │   │   └── page.jsx            # /track — tracking page
    │   ├── globals.css             # Global CSS styles
    │   ├── layout.js               # Root layout (wraps all pages)
    │   └── page.js                 # / — homepage / landing page
    └── lib/
        ├── mongodb.js              # MongoDB connection utility
        ├── users.js                # User-related database helpers
        └── proxy.js                # Proxy / request utility
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **yarn**
- **Database_and_bert_infra** backend running on `localhost:8000` (for core data)
- A **MongoDB** connection URI (for user profiles)
- A **Clerk** account with an application set up

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd frontend

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the `frontend/` directory with the following variables:

```env
# MongoDB (User Profiles)
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Core API Gateway (Points to Database_and_bert_infra FastAPI server)
NEXT_PUBLIC_API_URL=http://localhost:8000

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Clerk Webhook (for /api/webhooks/clerk)
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

---

## API Routes

The frontend acts as an API gateway, abstracting backend complexities and securing requests using Clerk auth.

| Method | Endpoint | Description | Backend Connected |
|--------|----------|-------------|-------------------|
| `GET` | `/api/feed` | Fetches the latest processed news articles | `Database_and_bert_infra` (FastAPI) |
| `GET` | `/api/search` | Performs semantic search and auto-subscribes | `Database_and_bert_infra` (FastAPI) |
| `GET` | `/api/subscriptions/me` | Fetches user's subscribed topic clusters | `Database_and_bert_infra` (FastAPI) |
| `GET` | `/api/evolution/[id]` | Fetches the timeline of articles in a cluster | `Database_and_bert_infra` (FastAPI) |
| `PATCH`| `/api/profile/update` | Update the authenticated user's profile | `MongoDB` (Local Profile DB) |
| `DELETE`| `/api/profile/delete` | Delete the authenticated user's profile | `MongoDB` (Local Profile DB) |
| `POST` | `/api/webhooks/clerk`| Handle Clerk webhook events (sync users) | `MongoDB` (Local Profile DB) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage / landing page |
| `/dashboard` | Main dashboard tracking story clusters and timelines |
| `/feed` | Live news/content feed |
| `/profile` | User profile view and management |
| `/subscriptions` | View active topic subscriptions |
| `/track` | Semantic search and new topic tracking |
| `/sign-in` | Clerk-powered sign-in |
| `/sign-up` | Clerk-powered sign-up |

---

## Authentication & Database Strategy

### User Management
This project uses **Clerk** for authentication. The `/api/webhooks/clerk` route listens for Clerk events to sync minimal user metadata (like usernames and profile image URLs) with **MongoDB**. MongoDB is strictly isolated to user profile management.

Make sure to configure your Clerk webhook endpoint in the [Clerk dashboard](https://dashboard.clerk.com/) pointing to:
`https://yourdomain.com/api/webhooks/clerk`

### Core Application Data
All core application logic—such as news articles, clustering, semantic search, and topic timelines—is handled exclusively by the **`Database_and_bert_infra`** backend. The Next.js API routes act as proxies, attaching necessary `userId` parameters from Clerk, and forwarding requests to the FastAPI backend running on PostgreSQL `pgvector`.
