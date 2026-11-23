import os
import sys

from mangum import Mangum

# Vercel's Python runtime does not always put the project root on sys.path.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app  # noqa: E402

handler = Mangum(app)
