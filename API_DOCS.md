# Tijori API Documentation

## Overview

Tijori is a freelance deal escrow platform with AI-powered dispute resolution (Panchayat AI). This document describes the REST API endpoints for managing deals, actions, and AI verdicts.

## Base URL

```
http://localhost:3000/api
```

## Authentication

For development, authentication is handled via headers:
- `x-user-role`: `SELLER` | `BUYER` | `ADMIN`
- `x-user-name`: User's name

In production, replace with proper JWT/session authentication.

## Deal Status Flow

```
CREATED → FUNDED → DELIVERED → COMPLETED
                    ↓
                 DISPUTED → RESOLVED_RELEASED
                          → RESOLVED_REFUNDED
                          → RESOLVED_SPLIT
```

## Roles & Permissions

| Action | Required Role |
|--------|---------------|
| Create Deal | SELLER |
| Fund Deal | BUYER |
| Deliver Work | SELLER |
| Accept Delivery | BUYER |
| Dispute Delivery | BUYER |
| Resolve Dispute | ADMIN |
| View Deal | Any |
| List Deals | Any |
| Request AI Verdict | BUYER, ADMIN |

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATE" | "SERVER",
    "message": "Human-readable error message"
  }
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Validation Error
- `403` - Forbidden
- `404` - Not Found
- `409` - Invalid State Transition
- `500` - Server Error

---

## Endpoints

### Deals

#### List Deals
```
GET /deals
```

**Query Parameters:**
- `status` (optional): Filter by deal status
- `seller_name` (optional): Filter by seller name
- `buyer_name` (optional): Filter by buyer name

**Response:**
```json
{
  "data": {
    "deals": [
      {
        "id": "uuid",
        "title": "Logo Design",
        "description": "Create a modern logo...",
        "amount": 15000,
        "status": "COMPLETED",
        "seller_name": "Priya Sharma",
        "buyer_name": "Rajesh Kumar",
        "delivery_proof": "https://figma.com/file/abc123",
        "dispute_reason": null,
        "ai_verdict": null,
        "ai_reasoning": null,
        "ai_seller_percent": null,
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-20T10:00:00.000Z"
      }
    ]
  }
}
```

#### Create Deal
```
POST /deals
```

**Headers:**
- `x-user-role: SELLER`
- `x-user-name: Seller Name`

**Body:**
```json
{
  "title": "Logo Design for Coffee Shop",
  "description": "Create a modern logo for a new coffee shop in Bangalore. Need 3 concepts with revisions.",
  "amount": 15000,
  "seller_name": "Priya Sharma"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "deal": { ... }
  }
}
```

#### Get Deal
```
GET /deals/{id}
```

**Response:**
```json
{
  "data": {
    "deal": { ... },
    "events": [
      {
        "id": "uuid",
        "deal_id": "uuid",
        "type": "CREATED",
        "message": "Deal created by Priya Sharma",
        "actor": "Priya Sharma",
        "created_at": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Deal Actions

#### Fund Deal
```
POST /deals/{id}/actions/fund
```

**Headers:**
- `x-user-role: BUYER`
- `x-user-name: Buyer Name`

**Body:**
```json
{
  "buyer_name": "Rajesh Kumar"
}
```

**Response:**
```json
{
  "data": {
    "deal": { ... }  // Updated deal with status: FUNDED
  }
}
```

#### Deliver Work
```
POST /deals/{id}/actions/deliver
```

**Headers:**
- `x-user-role: SELLER`
- `x-user-name: Seller Name`

**Body:**
```json
{
  "delivery_proof": "https://figma.com/file/abc123"
}
```

**Response:**
```json
{
  "data": {
    "deal": { ... }  // Updated deal with status: DELIVERED
  }
}
```

#### Accept Delivery
```
POST /deals/{id}/actions/accept
```

**Headers:**
- `x-user-role: BUYER`
- `x-user-name: Buyer Name`

**Body:**
```json
{
  "buyer_name": "Rajesh Kumar"
}
```

**Response:**
```json
{
  "data": {
    "deal": { ... }  // Updated deal with status: COMPLETED
  }
}
```

#### Dispute Delivery
```
POST /deals/{id}/actions/dispute
```

**Headers:**
- `x-user-role: BUYER`
- `x-user-name: Buyer Name`

**Body:**
```json
{
  "buyer_name": "Rajesh Kumar",
  "dispute_reason": "Images are blurry and don't match the style guide"
}
```

**Response:**
```json
{
  "data": {
    "deal": { ... },  // Updated deal with status: DISPUTED
    "ai_verdict": {
      "verdict": "SPLIT",
      "seller_percent": 60,
      "reasoning": "Delivery proof shows partial completion. Some images meet quality standards but others are blurry. Recommend 60% to seller for completed work."
    }
  }
}
```

**Note:** This endpoint automatically triggers the Panchayat AI to provide a verdict recommendation.

#### Resolve Dispute
```
POST /deals/{id}/actions/resolve
```

**Headers:**
- `x-user-role: ADMIN`
- `x-user-name: Admin Name`

**Body:**
```json
{
  "admin_name": "Admin User",
  "verdict": "SPLIT",
  "seller_percent": 60
}
```

**Verdict Options:**
- `RELEASE` - Full amount to seller (seller_percent: 100)
- `REFUND` - Full refund to buyer (seller_percent: 0)
- `SPLIT` - Proportional split (seller_percent: 1-99)

**Response:**
```json
{
  "data": {
    "deal": { ... }  // Updated deal with status: RESOLVED_SPLIT
  }
}
```

---

### AI Verdict

#### Get AI Verdict (Manual Trigger)
```
POST /ai/verdict
```

**Headers:**
- `x-user-role: BUYER` or `ADMIN`
- `x-user-name: User Name`

**Body:**
```json
{
  "deal_id": "uuid",
  "dispute_reason": "Work quality is poor and incomplete"
}
```

**Response:**
```json
{
  "data": {
    "verdict": "SPLIT",
    "seller_percent": 60,
    "reasoning": "Delivery proof shows partial completion..."
  }
}
```

#### Get Existing AI Verdict
```
GET /ai/verdict?deal_id={id}
```

**Response:**
```json
{
  "data": {
    "verdict": "SPLIT",
    "seller_percent": 60,
    "reasoning": "Delivery proof shows partial completion..."
  }
}
```

---

## Data Models

### Deal
```typescript
interface Deal {
  id: string;
  title: string;
  description: string;
  amount: number;           // Amount in smallest currency unit (paise for INR)
  status: DealStatus;
  seller_name: string;
  buyer_name: string | null;
  delivery_proof: string | null;    // URL to delivery proof
  dispute_reason: string | null;
  ai_verdict: AIVerdict | null;
  ai_reasoning: string | null;
  ai_seller_percent: number | null;
  created_at: string;       // ISO 8601
  updated_at: string;       // ISO 8601
}

type DealStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'RESOLVED_RELEASED'
  | 'RESOLVED_REFUNDED'
  | 'RESOLVED_SPLIT';

type AIVerdict = 'RELEASE' | 'REFUND' | 'SPLIT';
```

### Event
```typescript
interface Event {
  id: string;
  deal_id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string;       // ISO 8601
}
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm/pnpm/yarn

### Installation
```bash
npm install
```

### Database Setup
```bash
# Initialize database with demo data
npm run db:push

# Add more demo data
npm run db:seed
```

### Run Development Server
```bash
npm run dev
```

### Run Tests
```bash
npx tsx scripts/test-backend.ts
```

---

## Environment Variables

Create `.env.local` from `.env.example`:

```env
# AI Provider (Claude or Gemini)
AI_API_KEY=your_anthropic_or_google_api_key
AI_PROVIDER=claude  # or 'gemini'

# Database (optional - uses SQLite by default)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# For local SQLite development
# DATABASE_URL=file:./dev.db
```

---

## Example Usage

### Complete Deal Flow

```bash
# 1. Seller creates a deal
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -H "x-user-role: SELLER" \
  -H "x-user-name: Priya Sharma" \
  -d '{
    "title": "Logo Design",
    "description": "Modern logo for coffee shop",
    "amount": 15000,
    "seller_name": "Priya Sharma"
  }'

# 2. Buyer funds the deal
curl -X POST http://localhost:3000/api/deals/{deal_id}/actions/fund \
  -H "Content-Type: application/json" \
  -H "x-user-role: BUYER" \
  -H "x-user-name: Rajesh Kumar" \
  -d '{"buyer_name": "Rajesh Kumar"}'

# 3. Seller delivers work
curl -X POST http://localhost:3000/api/deals/{deal_id}/actions/deliver \
  -H "Content-Type: application/json" \
  -H "x-user-role: SELLER" \
  -H "x-user-name: Priya Sharma" \
  -d '{"delivery_proof": "https://figma.com/file/abc123"}'

# 4a. Buyer accepts (happy path)
curl -X POST http://localhost:3000/api/deals/{deal_id}/actions/accept \
  -H "Content-Type: application/json" \
  -H "x-user-role: BUYER" \
  -H "x-user-name: Rajesh Kumar" \
  -d '{"buyer_name": "Rajesh Kumar"}'

# 4b. Buyer disputes (dispute path)
curl -X POST http://localhost:3000/api/deals/{deal_id}/actions/dispute \
  -H "Content-Type: application/json" \
  -H "x-user-role: BUYER" \
  -H "x-user-name: Rajesh Kumar" \
  -d '{
    "buyer_name": "Rajesh Kumar",
    "dispute_reason": "Images are blurry"
  }'

# 5. Admin resolves dispute
curl -X POST http://localhost:3000/api/deals/{deal_id}/actions/resolve \
  -H "Content-Type: application/json" \
  -H "x-user-role: ADMIN" \
  -H "x-user-name: Admin User" \
  -d '{
    "admin_name": "Admin User",
    "verdict": "SPLIT",
    "seller_percent": 60
  }'
```

---

## Panchayat AI Integration

The AI verdict system (Panchayat AI) automatically analyzes disputes and provides recommendations:

1. **Triggered automatically** when a buyer disputes a delivery
2. **Reviews** delivery proof, deal description, and buyer's complaint
3. **Returns** verdict (RELEASE/REFUND/SPLIT) with percentage split and reasoning
4. **Falls back** to deterministic logic if AI API is unavailable

### AI Verdict Guidelines

| Verdict | When | Seller % |
|---------|------|----------|
| RELEASE | Complete delivery matching scope | 100% |
| REFUND | No delivery / completely unusable | 0% |
| SPLIT | Partial delivery, quality issues, scope ambiguity | 1-99% |

---

## Database Schema

### Deals Table
```sql
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  buyer_name TEXT,
  delivery_proof TEXT,
  dispute_reason TEXT,
  ai_verdict TEXT,
  ai_reasoning TEXT,
  ai_seller_percent INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Events Table
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

---

## Testing

Run the backend test suite:

```bash
npx tsx scripts/test-backend.ts
```

This tests:
- Deal creation, funding, delivery, acceptance
- Dispute flow with AI verdict
- Admin resolution
- Listing with filters
- Error handling and validation