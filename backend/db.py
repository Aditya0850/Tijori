import json
import os
import uuid
from datetime import UTC, datetime
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()


SCHEMA = """
CREATE TABLE IF NOT EXISTS deals (
    id             UUID PRIMARY KEY,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL,
    amount         INTEGER NOT NULL CHECK (amount > 0),
    status         TEXT NOT NULL CHECK (status IN (
        'CREATED','FUNDED','DELIVERED','COMPLETED',
        'DISPUTED','RESOLVED_RELEASED','RESOLVED_REFUNDED','RESOLVED_SPLIT'
    )),
    seller_name    TEXT NOT NULL,
    buyer_name     TEXT,
    delivery_proof TEXT,
    dispute_reason TEXT,
    ai_verdict     JSONB,
    created_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id           UUID PRIMARY KEY,
    deal_id      UUID NOT NULL REFERENCES deals(id),
    type         TEXT NOT NULL CHECK (type IN (
        'CREATED','FUNDED','DELIVERED','COMPLETED',
        'DISPUTED','RESOLVED_RELEASED','RESOLVED_REFUNDED','RESOLVED_SPLIT'
    )),
    from_status  TEXT NOT NULL,
    to_status    TEXT NOT NULL,
    actor_role   TEXT NOT NULL CHECK (actor_role IN ('seller','buyer','admin')),
    actor_name   TEXT NOT NULL,
    note         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL
);
"""


def get_conn() -> psycopg.Connection[dict[str, Any]]:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg.connect(url, row_factory=dict_row, autocommit=False)  # type: ignore[return-value]


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(SCHEMA)
        conn.commit()


def _to_iso(dt: datetime | str | None) -> str | None:
    """Convert datetime to ISO string (ms precision, Z suffix, UTC)."""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    # Convert to UTC if timezone-aware, then format with Z suffix
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC)
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _to_str(u: uuid.UUID | str | None) -> str | None:
    """Convert UUID to string."""
    if u is None:
        return None
    if isinstance(u, str):
        return u
    return str(u)


def row_to_deal(row: dict) -> dict:
    verdict = row["ai_verdict"]
    # JSONB comes back as dict (psycopg 3), not string
    if isinstance(verdict, str):
        verdict = json.loads(verdict)
    return {
        "id": _to_str(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "amount": row["amount"],
        "status": row["status"],
        "sellerName": row["seller_name"],
        "buyerName": row["buyer_name"],
        "deliveryProof": row["delivery_proof"],
        "disputeReason": row["dispute_reason"],
        "aiVerdict": verdict,
        "createdAt": _to_iso(row["created_at"]),
    }


def row_to_event(row: dict) -> dict:
    return {
        "id": _to_str(row["id"]),
        "dealId": _to_str(row["deal_id"]),
        "type": row["type"],
        "fromStatus": row["from_status"],
        "toStatus": row["to_status"],
        "actorRole": row["actor_role"],
        "actorName": row["actor_name"],
        "note": row["note"],
        "createdAt": _to_iso(row["created_at"]),
    }
