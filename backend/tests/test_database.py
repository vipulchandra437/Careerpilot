from backend.database import engine


def test_engine_pre_pings_pooled_connections():
    # Neon closes idle connections between serverless invocations. Without
    # pre-ping, a warm Lambda reuses the dead connection and every write fails.
    assert engine.pool._pre_ping is True
