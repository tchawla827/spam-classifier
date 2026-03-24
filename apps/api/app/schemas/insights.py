"""Pydantic schemas for insights endpoints."""

from pydantic import BaseModel


class DomainCount(BaseModel):
    domain: str
    count: int


class InsightsSummary(BaseModel):
    total_classifications: int
    spam_detected: int
    safe_detected: int
    review_count: int
    false_positive_count: int
    false_negative_count: int
    top_flagged_domains: list[DomainCount]
