# Application — Frontend

A full-stack **Next.js** web application with MongoDB, Clerk authentication, and a news/feed-based UI.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Database:** MongoDB
- **Authentication:** [Clerk](https://clerk.com/)
- **Language:** JavaScript / JSX

---

## Project Structure

```
frontend/
├── public/                         # Static assets (images, fonts, icons)
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── profile/
    │   │   │   ├── delete/
    │   │   │   │   └── route.js    # DELETE /api/profile — delete user profile
    │   │   │   └── update/
    │   │   │       └── route.js    # PUT /api/profile — update user profile
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
    │   ├── sign-in/[[...index]]/
    │   │   └── page.jsx            # /sign-in — Clerk sign-in page
    │   ├── sign-up/[[...index]]/
    │   │   └── page.jsx            # /sign-up — Clerk sign-up page
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
- A **MongoDB** connection URI
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
# MongoDB
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_API_URL=http://localhost:<PORT>

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/profile/update` | Update the authenticated user's profile |
| `DELETE` | `/api/profile/delete` | Delete the authenticated user's profile |
| `POST` | `/api/webhooks/clerk` | Handle Clerk webhook events (user created/updated/deleted) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage / landing page |
| `/dashboard` | Main dashboard after login |
| `/feed` | News/content feed |
| `/profile` | User profile view and management |
| `/subscriptions` | Manage user subscriptions |
| `/track` | Content/item tracking page |
| `/sign-in` | Clerk-powered sign-in |
| `/sign-up` | Clerk-powered sign-up |

---

## Authentication

This project uses **Clerk** for authentication. Sign-in and sign-up pages use Clerk's catch-all routing (`[[...index]]`). The `/api/webhooks/clerk` route listens for Clerk events to sync user data with MongoDB.

Make sure to configure your Clerk webhook endpoint in the [Clerk dashboard](https://dashboard.clerk.com/) pointing to:

```
https://yourdomain.com/api/webhooks/clerk
```

---

## Database

MongoDB is used as the primary database. The connection is managed in `src/lib/mongodb.js`, which exports a reusable client. User-related queries and helpers are located in `src/lib/users.js`.
