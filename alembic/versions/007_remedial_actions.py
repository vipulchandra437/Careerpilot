"""Historical remedial-actions migration — superseded by the 001 baseline.

The baseline creates interview_feedback with remedial_actions included. Kept
only so databases already stamped at this revision can still reach head.
"""

from typing import Sequence, Union

revision: str = "007_remedial_actions"
down_revision: Union[str, None] = "006_interview_phase1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
