import uuid
from datetime import UTC, datetime
from typing import Any

import psycopg
from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    """FastAPI exception handler: all errors -> { "error": { "code": "...", "message": "..." } }"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def get_auth(request: Request) -> tuple[str, str]:
    """Extract and validate x-user-role and x-user-name headers."""
    user_role = request.headers.get("x-user-role")
    user_name = request.headers.get("x-user-name")

    if user_role not in ("seller", "buyer", "admin") or not user_name:
        raise ApiError("Missing or invalid authentication headers", "FORBIDDEN", 403)

    return user_role, user_name.strip()


def require_role(user_role: str, allowed_roles: list[str]) -> None:
    """Raise FORBIDDEN if user_role not in allowed_roles."""
    if user_role not in allowed_roles:
        raise ApiError(
            f"Role '{user_role}' not authorized for this action", "FORBIDDEN", 403
        )


def assert_status(deal: dict, expected_status: str) -> None:
    """Raise INVALID_TRANSITION if deal['status'] != expected_status."""
    if deal.get("status") != expected_status:
        raise ApiError(
            f"Invalid status transition: expected {expected_status}, got {deal.get('status')}",
            "INVALID_TRANSITION",
            409,
        )


def get_deal_or_404(
    conn: psycopg.Connection[dict[str, Any]], deal_id: str
) -> dict[str, Any]:
    """Fetch deal by ID or raise NOT_FOUND. Returns raw dict row."""
    # Validate UUID format first to return 404 instead of 500
    try:
        uuid.UUID(deal_id)
    except ValueError:
        raise ApiError(f"Deal {deal_id} not found", "NOT_FOUND", 404)

    with conn.cursor() as cur:
        cur.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        deal = cur.fetchone()
        if not deal:
            raise ApiError(f"Deal {deal_id} not found", "NOT_FOUND", 404)
        return deal  # type: ignore[return-value]


def log_event(
    conn: psycopg.Connection[dict[str, Any]],
    deal_id: str,
    event_type: str,
    from_status: str,
    to_status: str,
    actor_role: str,
    actor_name: str,
    note: str,
    created_at: str,
) -> str:
    """
    Insert event row and return the new event ID.
    Caller manages transaction (commit/rollback).
    """
    event_id = new_id()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO events (id, deal_id, type, from_status, to_status, actor_role, actor_name, note, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                event_id,
                deal_id,
                event_type,
                from_status,
                to_status,
                actor_role,
                actor_name,
                note,
                created_at,
            ),
        )
    return event_id
