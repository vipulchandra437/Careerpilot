"""Admin read-only usage dashboards (PRD §6.7, DESIGN §2.9).

Server-side role-gated (RULES §2): every route depends on `require_admin`.

Aggregations over `users` (signups) and `llm_usage_log` (feature calls/tokens).
NOTE: `llm_usage_log.cost_usd` is hardcoded 0.0 by the orchestrator today
(P4-4), so per-feature cost will read $0 until Phase 6 metering lands — the
endpoint returns real call/token counts and the raw cost figure; the UI labels
it honestly rather than hiding it.
"""

from datetime import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User
from backend.models.llm_usage import LLMUsageLog
from backend.api.dependencies import require_admin

router = APIRouter(prefix="/admin/usage", tags=["admin-usage"])


class SignupPoint(BaseModel):
    period: str
    count: int


class FeatureUsage(BaseModel):
    feature: str
    calls: int
    tokens_in: int
    tokens_out: int
    cost_usd: float


class UsageSummary(BaseModel):
    total_users: int
    total_signups_30d: int
    total_feature_calls: int
    total_tokens_in: int
    total_tokens_out: int
    total_cost_usd: float
    signups_over_time: list[SignupPoint]
    feature_usage: list[FeatureUsage]


@router.get("", response_model=UsageSummary)
async def usage_summary(
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (
        await db.execute(select(func.count(User.id)))
    ).scalar_one()

    # EXTRACT is compiled to the appropriate equivalent for SQLite/PostgreSQL.
    signup_year = extract("year", User.created_at)
    signup_month = extract("month", User.created_at)
    month_stmt = select(
        signup_year,
        signup_month,
        func.count(User.id),
    ).group_by(signup_year, signup_month).order_by(signup_year, signup_month)
    month_rows = (await db.execute(month_stmt)).all()
    signups_over_time = [
        SignupPoint(period=f"{int(year):04d}-{int(month):02d}", count=count)
        for year, month, count in month_rows
    ]

    # Feature usage aggregated from llm_usage_log.
    feat_stmt = select(
        LLMUsageLog.feature,
        func.count(LLMUsageLog.id),
        func.sum(LLMUsageLog.tokens_in),
        func.sum(LLMUsageLog.tokens_out),
        func.sum(LLMUsageLog.cost_usd),
    ).group_by(LLMUsageLog.feature)
    feat_rows = (await db.execute(feat_stmt)).all()
    feature_usage = [
        FeatureUsage(
            feature=f,
            calls=int(c),
            tokens_in=int(ti or 0),
            tokens_out=int(to or 0),
            cost_usd=float(cost or 0.0),
        )
        for f, c, ti, to, cost in feat_rows
    ]

    from datetime import timedelta, timezone
    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
    total_signups_30d = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= cutoff_30d))
    ).scalar_one()
    total_feature_calls = (
        await db.execute(select(func.count(LLMUsageLog.id)))
    ).scalar_one()
    total_tokens_in = (
        await db.execute(select(func.sum(LLMUsageLog.tokens_in)))
    ).scalar_one() or 0
    total_tokens_out = (
        await db.execute(select(func.sum(LLMUsageLog.tokens_out)))
    ).scalar_one() or 0
    total_cost_usd = (
        await db.execute(select(func.sum(LLMUsageLog.cost_usd)))
    ).scalar_one() or 0

    return UsageSummary(
        total_users=total_users,
        total_signups_30d=total_signups_30d,
        total_feature_calls=total_feature_calls,
        total_tokens_in=int(total_tokens_in),
        total_tokens_out=int(total_tokens_out),
        total_cost_usd=float(total_cost_usd),
        signups_over_time=signups_over_time,
        feature_usage=feature_usage,
    )
