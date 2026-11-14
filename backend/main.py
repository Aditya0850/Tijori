import json
import os

from ai import get_ai_verdict
from db import get_conn, init_db, row_to_deal, row_to_event
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from helpers import (
    ApiError,
    api_error_handler,
    assert_status,
    get_auth,
    get_deal_or_404,
    log_event,
    new_id,
    now_iso,
    require_role,
)
from seed import seed

app = FastAPI(title="Escrow API", version="1.0.0")

# CORS: configurable via ALLOWED_ORIGINS env var (comma-separated), default "*" for demo
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(ApiError, api_error_handler)  # type: ignore[arg-type]


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:

    return JSONResponse(
        status_code=400,
        content={
            "error": {"code": "VALIDATION_ERROR", "message": "Invalid request payload"}
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions — return contract error format."""
    return JSONResponse(
        status_code=500,
        content={
            "error": {"code": "INTERNAL_ERROR", "message": "Internal server error"}
        },
    )


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/stats")
def get_stats(request: Request):
    user_role, _ = get_auth(request)
    require_role(user_role, ["admin"])

    with get_conn() as conn, conn.cursor() as cur:
        # Total deals
        cur.execute("select count(*) as cnt from deals")
        row = cur.fetchone()
        total_deals: int = row["cnt"] if row else 0

        # Money in escrow (FUNDED + DELIVERED + DISPUTED)
        cur.execute("""
            select coalesce(sum(amount), 0) as total
            from deals
            where status in ('FUNDED', 'DELIVERED', 'DISPUTED')
        """)
        row = cur.fetchone()
        money_in_escrow: int = row["total"] if row else 0

        # Completed value
        cur.execute("""
            select coalesce(sum(amount), 0) as total
            from deals
            where status = 'COMPLETED'
        """)
        row = cur.fetchone()
        completed_value: int = row["total"] if row else 0

        # Disputes
        cur.execute("select count(*) as cnt from deals where status = 'DISPUTED'")
        row = cur.fetchone()
        open_disputes: int = row["cnt"] if row else 0

        cur.execute("""
            select count(*) as cnt from deals
            where status in ('RESOLVED_RELEASED', 'RESOLVED_REFUNDED', 'RESOLVED_SPLIT')
        """)
        row = cur.fetchone()
        resolved_disputes: int = row["cnt"] if row else 0

        return {
            "totalDeals": total_deals,
            "moneyInEscrow": money_in_escrow,
            "completedValue": completed_value,
            "disputes": open_disputes + resolved_disputes,
            "openDisputes": open_disputes,
            "resolvedDisputes": resolved_disputes,
        }


@app.post("/api/dev/seed")
def seed_data(request: Request):

    # Require admin role + ALLOW_SEED env var
    user_role, _ = get_auth(request)
    require_role(user_role, ["admin"])

    if os.getenv("ALLOW_SEED") != "true":
        raise ApiError("Seeding is disabled", "FORBIDDEN", 403)

    with get_conn() as conn:
        seed(conn)
        conn.commit()

    return {"ok": True, "dealsCreated": 5}


@app.post("/api/deals", status_code=201)
async def create_deal(request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["seller"])

    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    if not isinstance(body, dict):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    title = body.get("title")
    description = body.get("description")
    amount = body.get("amount")

    if not isinstance(title, str) or not (1 <= len(title.strip()) <= 200):
        raise ApiError(
            "Title must be a non-empty string (max 200 chars)", "VALIDATION_ERROR", 400
        )

    if not isinstance(description, str) or not (1 <= len(description.strip()) <= 2000):
        raise ApiError(
            "Description must be a non-empty string (max 2000 chars)",
            "VALIDATION_ERROR",
            400,
        )

    if type(amount) is not int or amount <= 0:
        raise ApiError(
            "Amount must be a positive integer (in rupees)", "VALIDATION_ERROR", 400
        )

    deal_id = new_id()
    created_at = now_iso()

    with get_conn() as conn:
        conn.execute(
            """
            insert into deals (id, title, description, amount, status, seller_name, created_at) values (%s, %s, %s, %s, 'CREATED', %s, %s)
            """,
            (
                deal_id,
                title.strip(),
                description.strip(),
                amount,
                user_name,
                created_at,
            ),
        )
        log_event(
            conn,
            deal_id,
            "CREATED",
            "CREATED",
            "CREATED",
            user_role,
            user_name,
            "Deal created",
            created_at,
        )
        conn.commit()

        deal = get_deal_or_404(conn, deal_id)
        return row_to_deal(deal)


@app.get("/api/deals")
def list_deals(request: Request):

    user_role, user_name = get_auth(request)

    with get_conn() as conn, conn.cursor() as cur:
        if user_role == "buyer":
            cur.execute(
                "select * from deals where status = 'CREATED' or buyer_name = %s order by created_at desc",
                (user_name,),
            )
        elif user_role == "seller":
            cur.execute(
                "select * from deals where seller_name = %s order by created_at desc",
                (user_name,),
            )
        else:
            cur.execute("select * from deals order by created_at desc")

        rows = cur.fetchall()
        return [row_to_deal(row) for row in rows]


@app.get("/api/deals/{deal_id}")
def get_deal(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)

    with get_conn() as conn:
        deal = get_deal_or_404(conn, deal_id)

        # Authorization: same visibility rules as list_deals
        if (
            user_role == "buyer"
            and deal["buyer_name"] != user_name
            and deal["status"] != "CREATED"
        ):
            raise ApiError("Not authorized to view this deal", "FORBIDDEN", 403)
        if user_role == "seller" and deal["seller_name"] != user_name:
            raise ApiError("Not authorized to view this deal", "FORBIDDEN", 403)
        # admin: no restriction

        with conn.cursor() as cur:
            cur.execute(
                "select * from events where deal_id = %s order by created_at asc",
                (deal_id,),
            )
            events = cur.fetchall()

            return {
                "deal": row_to_deal(deal),
                "events": [row_to_event(event) for event in events],
            }


@app.post("/api/deals/{deal_id}/fund")
def fund_deal(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["buyer"])

    with get_conn() as conn:
        deal = get_deal_or_404(conn, deal_id)
        assert_status(deal, "CREATED")

        with conn.cursor() as cur:
            cur.execute(
                "update deals set status = 'FUNDED', buyer_name = %s where id = %s and status = 'CREATED'",
                (user_name, deal_id),
            )
            if cur.rowcount == 0:
                raise ApiError("Deal status already changed", "INVALID_TRANSITION", 409)

            log_event(
                conn,
                deal_id,
                "FUNDED",
                "CREATED",
                "FUNDED",
                user_role,
                user_name,
                f"Funded by {user_name}",
                now_iso(),
            )
            conn.commit()

            return row_to_deal(get_deal_or_404(conn, deal_id))


@app.post("/api/deals/{deal_id}/deliver")
async def deliver_deal(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["seller"])

    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    if not isinstance(body, dict):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    proof = body.get("deliveryProof")
    if not isinstance(proof, str) or not proof.strip():
        raise ApiError("deliveryProof is required", "VALIDATION_ERROR", 400)

    with get_conn() as conn:
        deal = get_deal_or_404(conn, deal_id)

        if deal["seller_name"] != user_name:
            raise ApiError("Only the deal seller can deliver", "FORBIDDEN", 403)

        assert_status(deal, "FUNDED")
        with conn.cursor() as cur:
            cur.execute(
                "update deals set status = 'DELIVERED', delivery_proof = %s where id = %s and status = 'FUNDED'",
                (proof.strip(), deal_id),
            )

            if cur.rowcount == 0:
                raise ApiError("Invalid Transition", "INVALID_TRANSITION", 409)

            log_event(
                conn,
                deal_id,
                "DELIVERED",
                "FUNDED",
                "DELIVERED",
                user_role,
                user_name,
                f"Delivered: {proof.strip()}",
                now_iso(),
            )
            conn.commit()

            return row_to_deal(get_deal_or_404(conn, deal_id))


@app.post("/api/deals/{deal_id}/accept")
def accept_deal(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["buyer"])

    with get_conn() as conn:
        deal = get_deal_or_404(conn, deal_id)

        if deal["buyer_name"] != user_name:
            raise ApiError("Only the deal buyer can accept", "FORBIDDEN", 403)

        assert_status(deal, "DELIVERED")

        with conn.cursor() as cur:

            cur.execute(
                "update deals set status = 'COMPLETED' where id = %s and status = 'DELIVERED'",
                (deal_id,),
            )

            if cur.rowcount == 0:
                raise ApiError("Invalid Transition", "INVALID_TRANSITION", 409)

            log_event(
                conn,
                deal_id,
                "COMPLETED",
                "DELIVERED",
                "COMPLETED",
                user_role,
                user_name,
                f"Accepted by {user_name}",
                now_iso(),
            )
            conn.commit()

            return row_to_deal(get_deal_or_404(conn, deal_id))


@app.post("/api/deals/{deal_id}/dispute")
async def dispute_deal(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["buyer"])

    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    if not isinstance(body, dict):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    reason = body.get("disputeReason")
    if not isinstance(reason, str) or not reason.strip():
        raise ApiError("disputeReason is required", "VALIDATION_ERROR", 400)

    with get_conn() as conn:

        deal = get_deal_or_404(conn, deal_id)
        if deal["buyer_name"] != user_name:
            raise ApiError("Only the deal buyer can dispute", "FORBIDDEN", 403)

        assert_status(deal, "DELIVERED")

        deal_for_ai = row_to_deal(deal)
        deal_for_ai["disputeReason"] = reason.strip()
        verdict = get_ai_verdict(deal_for_ai)
        verdict_json = json.dumps(verdict) if verdict is not None else None

        with conn.cursor() as cur:
            cur.execute(
                "update deals set status = 'DISPUTED', dispute_reason = %s, ai_verdict = %s where id = %s and status = 'DELIVERED'",
                (reason.strip(), verdict_json, deal_id),
            )

            if cur.rowcount == 0:
                raise ApiError("Invalid Transition", "INVALID_TRANSITION", 409)
            log_event(
                conn,
                deal_id,
                "DISPUTED",
                "DELIVERED",
                "DISPUTED",
                user_role,
                user_name,
                f"Disputed: {reason.strip()}",
                now_iso(),
            )
            conn.commit()

            return row_to_deal(get_deal_or_404(conn, deal_id))


@app.post("/api/deals/{deal_id}/resolve")
async def resolve(deal_id: str, request: Request):

    user_role, user_name = get_auth(request)
    require_role(user_role, ["admin"])

    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    if not isinstance(body, dict):
        raise ApiError("Invalid JSON payload", "VALIDATION_ERROR", 400)

    outcome = body.get("outcome")

    outcome_map = {
        "RELEASE": "RESOLVED_RELEASED",
        "REFUND": "RESOLVED_REFUNDED",
        "SPLIT": "RESOLVED_SPLIT",
    }

    if outcome not in outcome_map:
        raise ApiError(
            "outcome must be RELEASE, REFUND or SPLIT", "VALIDATION_ERROR", 400
        )

    with get_conn() as conn:

        deal = get_deal_or_404(conn, deal_id)
        assert_status(deal, "DISPUTED")

        if outcome == "SPLIT":
            deal_dict = row_to_deal(deal)
            verdict = deal_dict.get("aiVerdict")

            if not isinstance(verdict, dict):
                raise ApiError(
                    "SPLIT requires valid aiVerdict with sellerSharePercent 1-99",
                    "VALIDATION_ERROR",
                    400,
                )
            if verdict.get("recommendation") != "SPLIT":
                raise ApiError(
                    "SPLIT requires valid aiVerdict with sellerSharePercent 1-99",
                    "VALIDATION_ERROR",
                    400,
                )
            share = verdict.get("sellerSharePercent")
            if type(share) is not int or not (1 <= share <= 99):
                raise ApiError(
                    "SPLIT requires valid aiVerdict with sellerSharePercent 1-99",
                    "VALIDATION_ERROR",
                    400,
                )

        new_status = outcome_map[outcome]
        with conn.cursor() as cur:
            cur.execute(
                "update deals set status = %s where id = %s and status = 'DISPUTED'",
                (new_status, deal_id),
            )

            if cur.rowcount == 0:
                raise ApiError("Invalid Transition", "INVALID_TRANSITION", 409)

            log_event(
                conn,
                deal_id,
                new_status,
                "DISPUTED",
                new_status,
                user_role,
                user_name,
                f"Resolved: {outcome} by {user_name}",
                now_iso(),
            )
            conn.commit()

            return row_to_deal(get_deal_or_404(conn, deal_id))
