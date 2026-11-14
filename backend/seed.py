"""
Seed Module for Tijori Escrow Platform (PostgreSQL + psycopg 3)

Loads 5 demo deals with realistic Indian-market examples and event timelines.
Run via POST /api/dev/seed (requires ALLOW_SEED=true env var).

Connection is provided by caller (db.get_conn() with row_factory=dict_row).
"""

import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import psycopg
from psycopg.rows import dict_row

# Base time for consistent ordering (millisecond precision ISO UTC)
BASE_TIME = datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC)

# Type alias for demo deal structure
DemoDeal = dict[str, Any]
DemoEvent = dict[str, Any]


def _iso(ms_offset: int = 0) -> str:
    """Generate ISO 8601 UTC timestamp with millisecond precision."""
    dt = BASE_TIME + timedelta(milliseconds=ms_offset)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _uuid() -> str:
    return str(uuid.uuid4())


DEMO_DEALS: list[DemoDeal] = [
    # 1. CREATED — Logo design, waiting for buyer
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Logo design for fintech startup",
        "description": "Modern minimalist logo, 3 revisions included. Source files (AI, SVG, PNG) on delivery. Brand guidelines PDF optional.",
        "amount": 15000,
        "status": "CREATED",
        "seller_name": "priya_designer",
        "buyer_name": None,
        "delivery_proof": None,
        "dispute_reason": None,
        "ai_verdict": None,
        "created_at": _iso(0),
        "events": [
            {
                "id": _uuid(),
                "type": "CREATED",
                "from_status": "CREATED",
                "to_status": "CREATED",
                "actor_role": "seller",
                "actor_name": "priya_designer",
                "note": "Deal created",
                "created_at": _iso(0),
            }
        ],
    },
    # 2. FUNDED — Used laptop, buyer funded, seller yet to deliver
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "title": 'MacBook Pro 14" M2 Pro 2023 — 16GB/512GB',
        "description": "Space Gray, 95% battery health, no scratches. Includes original box, 96W charger, USB-C cable. Purchased Jan 2024, AppleCare+ until Jan 2026.",
        "amount": 125000,
        "status": "FUNDED",
        "seller_name": "amit_tech",
        "buyer_name": "sneha_buyer",
        "delivery_proof": None,
        "dispute_reason": None,
        "ai_verdict": None,
        "created_at": _iso(86400000),  # +1 day
        "events": [
            {
                "id": _uuid(),
                "type": "CREATED",
                "from_status": "CREATED",
                "to_status": "CREATED",
                "actor_role": "seller",
                "actor_name": "amit_tech",
                "note": "Deal created",
                "created_at": _iso(86400000),
            },
            {
                "id": _uuid(),
                "type": "FUNDED",
                "from_status": "CREATED",
                "to_status": "FUNDED",
                "actor_role": "buyer",
                "actor_name": "sneha_buyer",
                "note": "Funded by sneha_buyer",
                "created_at": _iso(86400000 + 3600000),  # +1 hour
            },
        ],
    },
    # 3. DELIVERED — Tutoring package, seller delivered, buyer yet to accept/dispute
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "title": "Full-stack Web Dev Mentorship (8 weeks)",
        "description": "Weekly 1-on-1 sessions (90 min), code reviews, project guidance. React + Node.js + PostgreSQL. Build a production-ready SaaS starter. Includes Notion workspace with resources.",
        "amount": 45000,
        "status": "DELIVERED",
        "seller_name": "vikram_mentor",
        "buyer_name": "anita_learner",
        "delivery_proof": "Completed 8 sessions. Session recordings: https://drive.google.com/folder/abc. GitHub repo: https://github.com/vikram/saas-starter. Notion workspace shared.",
        "dispute_reason": None,
        "ai_verdict": None,
        "created_at": _iso(172800000),  # +2 days
        "events": [
            {
                "id": _uuid(),
                "type": "CREATED",
                "from_status": "CREATED",
                "to_status": "CREATED",
                "actor_role": "seller",
                "actor_name": "vikram_mentor",
                "note": "Deal created",
                "created_at": _iso(172800000),
            },
            {
                "id": _uuid(),
                "type": "FUNDED",
                "from_status": "CREATED",
                "to_status": "FUNDED",
                "actor_role": "buyer",
                "actor_name": "anita_learner",
                "note": "Funded by anita_learner",
                "created_at": _iso(172800000 + 7200000),  # +2 hours
            },
            {
                "id": _uuid(),
                "type": "DELIVERED",
                "from_status": "FUNDED",
                "to_status": "DELIVERED",
                "actor_role": "seller",
                "actor_name": "vikram_mentor",
                "note": "Delivered: Completed 8 sessions. Session recordings: https://drive.google.com/folder/abc. GitHub repo: https://github.com/vikram/saas-starter. Notion workspace shared.",
                "created_at": _iso(172800000 + 604800000),  # +7 days
            },
        ],
    },
    # 4. DISPUTED — Website redesign, AI verdict generated
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "title": "E-commerce website redesign (5 pages)",
        "description": "Home, Product Listing, Product Detail, Cart, Checkout. Mobile-first, responsive. Figma to React + Tailwind. 2 revision rounds. Deploy to Vercel.",
        "amount": 65000,
        "status": "DISPUTED",
        "seller_name": "grace_dev",
        "buyer_name": "henry_client",
        "delivery_proof": "Deployed to staging: https://staging-shop.example.com. Figma handoff: https://figma.com/file/xyz. GitHub repo: https://github.com/grace/shop-redesign.",
        "dispute_reason": "Mobile checkout broken — keyboard covers input fields. Product images don't load on slow 3G. Missing loading skeletons promised in Figma.",
        "ai_verdict": {
            "recommendation": "SPLIT",
            "sellerSharePercent": 60,
            "confidence": "MEDIUM",
            "reasoning": "Seller delivered functional desktop site and staging deploy. Buyer identified real mobile UX bugs (keyboard overlap, missing skeletons) that affect core checkout flow. Evidence suggests ~60% of scope met; 40% needs fixes. Split reflects partial delivery.",
        },
        "created_at": _iso(259200000),  # +3 days
        "events": [
            {
                "id": _uuid(),
                "type": "CREATED",
                "from_status": "CREATED",
                "to_status": "CREATED",
                "actor_role": "seller",
                "actor_name": "grace_dev",
                "note": "Deal created",
                "created_at": _iso(259200000),
            },
            {
                "id": _uuid(),
                "type": "FUNDED",
                "from_status": "CREATED",
                "to_status": "FUNDED",
                "actor_role": "buyer",
                "actor_name": "henry_client",
                "note": "Funded by henry_client",
                "created_at": _iso(259200000 + 10800000),  # +3 hours
            },
            {
                "id": _uuid(),
                "type": "DELIVERED",
                "from_status": "FUNDED",
                "to_status": "DELIVERED",
                "actor_role": "seller",
                "actor_name": "grace_dev",
                "note": "Delivered: Deployed to staging: https://staging-shop.example.com. Figma handoff: https://figma.com/file/xyz. GitHub repo: https://github.com/grace/shop-redesign.",
                "created_at": _iso(259200000 + 86400000),  # +1 day
            },
            {
                "id": _uuid(),
                "type": "DISPUTED",
                "from_status": "DELIVERED",
                "to_status": "DISPUTED",
                "actor_role": "buyer",
                "actor_name": "henry_client",
                "note": "Disputed: Mobile checkout broken — keyboard covers input fields. Product images don't load on slow 3G. Missing loading skeletons promised in Figma.",
                "created_at": _iso(259200000 + 172800000),  # +2 days
            },
        ],
    },
    # 5. COMPLETED — Content writing, fully accepted
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "title": "Technical blog series (10 articles)",
        "description": "10 SEO-optimized articles (1500-2000 words each) on Python async patterns. Target: intermediate developers. Includes code samples, diagrams (Mermaid), meta descriptions. Delivered as Markdown + HTML.",
        "amount": 30000,
        "status": "COMPLETED",
        "seller_name": "rohit_writer",
        "buyer_name": "kavya_publisher",
        "delivery_proof": "All 10 articles delivered via Google Drive folder: https://drive.google.com/drive/folders/abc. Published URLs: https://blog.example.com/tags/python-async. Word counts verified.",
        "dispute_reason": None,
        "ai_verdict": None,
        "created_at": _iso(345600000),  # +4 days
        "events": [
            {
                "id": _uuid(),
                "type": "CREATED",
                "from_status": "CREATED",
                "to_status": "CREATED",
                "actor_role": "seller",
                "actor_name": "rohit_writer",
                "note": "Deal created",
                "created_at": _iso(345600000),
            },
            {
                "id": _uuid(),
                "type": "FUNDED",
                "from_status": "CREATED",
                "to_status": "FUNDED",
                "actor_role": "buyer",
                "actor_name": "kavya_publisher",
                "note": "Funded by kavya_publisher",
                "created_at": _iso(345600000 + 14400000),  # +4 hours
            },
            {
                "id": _uuid(),
                "type": "DELIVERED",
                "from_status": "FUNDED",
                "to_status": "DELIVERED",
                "actor_role": "seller",
                "actor_name": "rohit_writer",
                "note": "Delivered: All 10 articles delivered via Google Drive folder: https://drive.google.com/drive/folders/abc. Published URLs: https://blog.example.com/tags/python-async. Word counts verified.",
                "created_at": _iso(345600000 + 604800000),  # +7 days
            },
            {
                "id": _uuid(),
                "type": "COMPLETED",
                "from_status": "DELIVERED",
                "to_status": "COMPLETED",
                "actor_role": "buyer",
                "actor_name": "kavya_publisher",
                "note": "Accepted by kavya_publisher",
                "created_at": _iso(345600000 + 691200000),  # +8 days
            },
        ],
    },
]


def seed(conn: psycopg.Connection[Any]) -> None:
    """
    Wipe and load demo data into deals and events tables.

    Args:
        conn: Open psycopg Connection (row_factory=dict_row), autocommit=False.
              Caller manages transaction; this function does NOT commit.
    """
    cur = conn.cursor()

    # Clear existing data (events first due to FK)
    cur.execute("DELETE FROM events")
    cur.execute("DELETE FROM deals")

    for deal in DEMO_DEALS:
        # Insert deal
        ai_verdict_json = json.dumps(deal["ai_verdict"]) if deal["ai_verdict"] else None
        cur.execute(
            """
            INSERT INTO deals (
                id, title, description, amount, status,
                seller_name, buyer_name, delivery_proof,
                dispute_reason, ai_verdict, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                deal["id"],
                deal["title"],
                deal["description"],
                deal["amount"],
                deal["status"],
                deal["seller_name"],
                deal["buyer_name"],
                deal["delivery_proof"],
                deal["dispute_reason"],
                ai_verdict_json,
                deal["created_at"],
            ),
        )

        # Insert events
        for ev in deal["events"]:
            cur.execute(
                """
                INSERT INTO events (
                    id, deal_id, type, from_status, to_status,
                    actor_role, actor_name, note, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ev["id"],
                    deal["id"],
                    ev["type"],
                    ev["from_status"],
                    ev["to_status"],
                    ev["actor_role"],
                    ev["actor_name"],
                    ev["note"],
                    ev["created_at"],
                ),
            )

    # Caller commits


# Allow running directly for quick verification (requires local PostgreSQL)
if __name__ == "__main__":
    import os
    import sys

    # Use DATABASE_URL from env or default local
    database_url = os.getenv(
        "DATABASE_URL", "postgresql://user:pass@localhost:5432/tijori"
    )

    try:
        # Connect with dict_row factory for verification
        conn = psycopg.connect(database_url, row_factory=dict_row, autocommit=False)  # type: ignore[assignment]
        seed(conn)
        conn.commit()

        # Print summary
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, status, seller_name, buyer_name, amount FROM deals ORDER BY created_at"
        )
        print("\nDeals:")
        for row in cur.fetchall():
            print(
                f"  {row['id'][:8]}... | {row['title'][:40]:40s} | {row['status']:18s} | ₹{row['amount']:,} | {row['seller_name']} → {row['buyer_name'] or '-'}"
            )

        cur.execute(
            "SELECT deal_id, type, from_status, to_status, actor_role, actor_name FROM events ORDER BY deal_id, created_at"
        )
        print("\nEvents:")
        for row in cur.fetchall():
            print(
                f"  {row['deal_id'][:8]}... | {row['type']:14s} | {row['from_status']:10s} → {row['to_status']:10s} | {row['actor_role']:6s} | {row['actor_name']}"
            )

        # Verify ai_verdict on disputed deal
        cur.execute(
            "SELECT ai_verdict FROM deals WHERE id = %s",
            ("44444444-4444-4444-4444-444444444444",),
        )
        row = cur.fetchone()  # type: ignore[assignment]
        if row and row["ai_verdict"]:
            ai_verdict_val = row["ai_verdict"]
            verdict = (
                ai_verdict_val
                if isinstance(ai_verdict_val, dict)
                else json.loads(ai_verdict_val)
            )
            print("\nAI Verdict on disputed deal:")
            print(f"  Recommendation: {verdict['recommendation']}")
            print(f"  Seller Share: {verdict['sellerSharePercent']}%")
            print(f"  Confidence: {verdict['confidence']}")
            print(f"  Reasoning: {verdict['reasoning'][:80]}...")

    except (psycopg.Error, json.JSONDecodeError, OSError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if "conn" in locals():
            conn.close()
