"""Roadmap models (architecture.md §3.5)."""

import uuid
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import relationship

from backend.database import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    gap_report_id = Column(String(36), nullable=False, index=True)
    version = Column(String(36), nullable=False, default="v1.0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RoadmapMilestone(Base):
    __tablename__ = "roadmap_milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    roadmap_id = Column(String(36), ForeignKey("roadmaps.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    linked_gap_skill = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="not_started")
    linked_action_type = Column(String(30), nullable=True)
    linked_action_id = Column(String(36), nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    estimated_hours = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roadmap = relationship("Roadmap", foreign_keys=[roadmap_id])