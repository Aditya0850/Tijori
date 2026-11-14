# 🔐 Tijori

### *Pehle kaam, phir daam.*

**UPI-style escrow for freelancers and small sellers in India.** The buyer's money stays in a digital vault until the work is delivered and accepted. If there's a disagreement, **Panchayat AI** reviews the evidence and recommends a fair outcome.

Built by **Team Ghee Khatam** for the *Financial Technology & Payments* track.

> ⚠️ **Hackathon demo:** login and payments are simulated. No real money moves. See [How the real version works](#how-the-real-version-works).

---

## The Problem

Freelancers, small sellers and clients in India make deals over UPI, WhatsApp and Instagram with no trust layer in between.

- **Buyers** pay upfront and sometimes get nothing, or poor work.
- **Sellers** deliver first and sometimes never get paid.
- When a dispute happens, there is no neutral party, only screenshots and arguments.

The result is lost money, scams, and small businesses that can't grow because strangers don't trust each other.

## The Solution

Tijori sits between buyer and seller:

1. The seller creates a deal and shares a link.
2. The buyer pays into escrow. The money is held safely.
3. The seller delivers the work.
4. The buyer accepts and the seller gets paid, or the buyer disputes and **Panchayat AI** recommends a verdict.

---

## Features

- **Deal creation** with a shareable link
- **Simulated UPI payment** into escrow
- **Escrow banner** showing exactly how much is held
- **Delivery submission** with proof (link or note)
- **Accept or dispute** flow for buyers
- **Panchayat AI**: reads the deal, delivery proof and complaint, then recommends *Release*, *Refund* or *Split* with reasoning
- **Admin resolution screen** for the final decision
- **Activity timeline** on every deal
- **One-click demo reset** with seeded data

## Deal Lifecycle

```
CREATED → FUNDED → DELIVERED → COMPLETED
                       │
                       └→ DISPUTED → RESOLVED_RELEASED
                                   → RESOLVED_REFUNDED
                                   → RESOLVED_SPLIT
```

| Status | Seller sees | Buyer sees | Admin sees |
|---|---|---|---|
| `CREATED` | Share link | **Pay ₹X** | n/a |
| `FUNDED` | **Submit delivery** | Waiting for delivery | n/a |
| `DELIVERED` | Waiting for buyer | **Accept** / **Dispute** | n/a |
| `DISPUTED` | Under review | Under review | AI verdict + **Resolve** |
| `COMPLETED` / `RESOLVED_*` | Final state | Final state | n/a |

## Roles

| Role | What they do |
|---|---|
| **Seller** | Creates deals, delivers work, gets paid |
| **Buyer** | Pays into escrow, accepts or disputes |
| **Admin** | Reviews disputes and makes the final call |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend | Next.js API routes |
| Database | SQLite or Supabase (Postgres) |
| AI | LLM API (Claude or Gemini) |
| Hosting | Vercel |

## API Overview

Every request carries two headers (no real auth in the demo):

```
x-user-role: SELLER | BUYER | ADMIN
x-user-name: <display name>
```

| Method | Endpoint | Role | Transition |
|---|---|---|---|
| `POST` | `/api/deals` | Seller | Creates deal → `CREATED` |
| `GET` | `/api/deals` | Any | Lists deals (filter by `status`, `sellerName`, `buyerName`) |
| `GET` | `/api/deals/:id` | Any | Returns deal + timeline events |
| `POST` | `/api/deals/:id/fund` | Buyer | `CREATED` → `FUNDED` |
| `POST` | `/api/deals/:id/deliver` | Seller | `FUNDED` → `DELIVERED` |
| `POST` | `/api/deals/:id/accept` | Buyer | `DELIVERED` → `COMPLETED` |
| `POST` | `/api/deals/:id/dispute` | Buyer | `DELIVERED` → `DISPUTED` (triggers AI verdict) |
| `POST` | `/api/deals/:id/resolve` | Admin | `DISPUTED` → `RESOLVED_*` |
| `POST` | `/api/dev/seed` | Any | Resets and loads demo data |

**Errors** use one format: `{ "error": { "code": "...", "message": "..." } }` with codes `VALIDATION` (400), `FORBIDDEN` (403), `NOT_FOUND` (404), `INVALID_STATE` (409), `SERVER` (500).

## Data Model

```
deals:  id, title, description, amount, status, seller_name, buyer_name,
        delivery_proof, dispute_reason, ai_verdict, created_at
events: id, deal_id, type, message, actor, created_at
```

## Panchayat AI

When a buyer raises a dispute, the backend sends the deal title, agreed work, amount, delivery proof and buyer complaint to the model. It returns:

```json
{
  "verdict": "RELEASE | REFUND | SPLIT",
  "seller_percent": 50,
  "reasoning": "2-3 sentence explanation"
}
```

The admin sees this as a recommendation and makes the final decision. If the AI call fails, the dispute still goes through and the admin reviews it manually.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

```bash
# Clone
git clone <your-repo-url>
cd tijori

# Install
npm install

# Configure environment
cp .env.example .env.local
# Add your keys (see below)

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# AI provider key (Claude or Gemini)
AI_API_KEY=your_key_here

# Database (if using Supabase)
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
```

### Try the Demo

1. Open the app and click **Reset demo** to load sample deals.
2. Continue as **Seller** and create a deal.
3. Switch to **Buyer**, open the deal link and pay.
4. Switch back to **Seller** and submit delivery.
5. As **Buyer**, either accept or dispute.
6. As **Admin**, review the Panchayat AI verdict and resolve.

---

## Project Structure

```
tijori/
├── app/
│   ├── page.tsx              # Landing page + role picker
│   ├── dashboard/            # Deal list
│   ├── deals/
│   │   ├── new/              # Create deal form
│   │   └── [id]/             # Deal detail + timeline + actions
│   └── api/
│       ├── deals/            # Deal routes
│       └── dev/seed/         # Demo seed route
├── components/               # UI components
├── lib/
│   ├── types.ts              # Shared types (frontend + backend)
│   ├── api.ts                # Typed API client
│   ├── db.ts                 # Database setup
│   ├── deals.ts              # Status rules + helpers
│   └── ai.ts                 # Panchayat AI call
└── README.md
```

---

## What's Simulated

| Real world | In this demo |
|---|---|
| User accounts and KYC | A role picker with a display name |
| UPI / gateway payment | A mock UPI screen with a "Pay ₹X" button |
| Funds in a nodal account | A status field and an escrow balance display |

## How the Real Version Works

1. **Payments:** integrate a gateway such as Razorpay for collection and payouts.
2. **Funds custody:** hold money in a nodal or escrow account with a regulated partner.
3. **Identity:** add KYC for sellers and basic verification for buyers.
4. **Auth:** real accounts with session management and MFA.
5. **Disputes:** keep AI as a recommendation layer, with trained human reviewers making final calls.

## Roadmap

- [ ] Real UPI and payment gateway integration
- [ ] KYC and seller reputation scores
- [ ] Milestone-based payments for larger projects
- [ ] WhatsApp bot to create and track deals
- [ ] Marketplace of verified sellers
- [ ] Evidence uploads (files, screenshots) for disputes

---

## Team

**Team Ghee Khatam** 🫙

*Humara ghee khatam hua, par aapka paisa nahi.*

| Name | Role |
|---|---|
| _Add name_ | Frontend |
| _Add name_ | Backend |
| _Add name_ | _Role_ |

## License

MIT
