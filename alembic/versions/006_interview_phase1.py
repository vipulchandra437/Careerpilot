"""Historical interview migration — superseded by the 001 baseline.

The baseline creates interview tables with their final columns. Kept only so
databases already stamped past this revision can still reach head.
"""

from typing import Sequence, Union

revision: str = "006_interview_phase1"
down_revision: Union[str, None] = "005_credit_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
