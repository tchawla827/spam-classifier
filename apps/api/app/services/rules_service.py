"""Rules service: CRUD for per-user sender/domain trust/block overrides."""

from __future__ import annotations

import logging
from typing import Optional
from uuid import uuid4

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DomainOverride, SenderOverride

logger = logging.getLogger("spam_classifier")


async def get_rules(
    session: AsyncSession,
    *,
    user_id: str,
) -> tuple[list[SenderOverride], list[DomainOverride]]:
    """Return all sender and domain rules for a user."""
    sender_stmt = (
        select(SenderOverride)
        .where(SenderOverride.user_id == user_id)
        .order_by(SenderOverride.created_at.desc())
    )
    domain_stmt = (
        select(DomainOverride)
        .where(DomainOverride.user_id == user_id)
        .order_by(DomainOverride.created_at.desc())
    )
    senders = list((await session.execute(sender_stmt)).scalars().all())
    domains = list((await session.execute(domain_stmt)).scalars().all())
    return senders, domains


async def add_sender_rule(
    session: AsyncSession,
    *,
    user_id: str,
    sender: str,
    action: str,
) -> SenderOverride:
    """Add or update a sender override rule (upsert by user_id + sender)."""
    stmt = select(SenderOverride).where(
        SenderOverride.user_id == user_id,
        SenderOverride.sender == sender.lower().strip(),
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()

    if existing is not None:
        existing.action = action
        await session.commit()
        await session.refresh(existing)
        return existing

    rule = SenderOverride(
        id=str(uuid4()),
        user_id=user_id,
        sender=sender.lower().strip(),
        action=action,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


async def add_domain_rule(
    session: AsyncSession,
    *,
    user_id: str,
    domain: str,
    action: str,
) -> DomainOverride:
    """Add or update a domain override rule (upsert by user_id + domain)."""
    stmt = select(DomainOverride).where(
        DomainOverride.user_id == user_id,
        DomainOverride.domain == domain.lower().strip(),
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()

    if existing is not None:
        existing.action = action
        await session.commit()
        await session.refresh(existing)
        return existing

    rule = DomainOverride(
        id=str(uuid4()),
        user_id=user_id,
        domain=domain.lower().strip(),
        action=action,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


async def delete_rule(
    session: AsyncSession,
    *,
    user_id: str,
    rule_id: str,
) -> bool:
    """Delete a sender or domain rule owned by user_id. Returns True if deleted."""
    # Try sender first, then domain
    sender_del = delete(SenderOverride).where(
        SenderOverride.id == rule_id,
        SenderOverride.user_id == user_id,
    )
    result = await session.execute(sender_del)
    if result.rowcount > 0:
        await session.commit()
        return True

    domain_del = delete(DomainOverride).where(
        DomainOverride.id == rule_id,
        DomainOverride.user_id == user_id,
    )
    result = await session.execute(domain_del)
    await session.commit()
    return result.rowcount > 0


async def check_sender(
    session: AsyncSession,
    *,
    user_id: str,
    sender: str,
) -> Optional[str]:
    """Return 'trust', 'block', or None for a sender address."""
    stmt = select(SenderOverride.action).where(
        SenderOverride.user_id == user_id,
        SenderOverride.sender == sender.lower().strip(),
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    return row


async def check_domain(
    session: AsyncSession,
    *,
    user_id: str,
    domain: str,
) -> Optional[str]:
    """Return 'trust', 'block', or None for a domain."""
    stmt = select(DomainOverride.action).where(
        DomainOverride.user_id == user_id,
        DomainOverride.domain == domain.lower().strip(),
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    return row
