"""Historical profile migration — superseded by the 001 baseline.

The baseline creates the full current schema from Base.metadata. This revision
is kept so databases stamped at 002/003 can still traverse the chain.
"""

from typing import Sequence, Union

revision: str = "002_profile_analysis"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
