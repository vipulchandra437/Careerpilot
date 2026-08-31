import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import Text, Integer, Enum, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.student, nullable=False)
    credit_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Account enable/disable (PRD §6.7). Disabled users cannot log in (login and
    # get_current_user both reject inactive accounts) — enforced in api/auth.py
    # and api/dependencies.py.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
