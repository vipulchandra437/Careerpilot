"""Historical credit migration — superseded by the 001 baseline.

Credits/payments were removed from the product. Kept only so databases already
stamped past this revision can still reach head.
"""

from typing import Sequence, Union

revision: str = "004_credit_transactions"
down_revision: Union[str, None] = "003_merge_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
