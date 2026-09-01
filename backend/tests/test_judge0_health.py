"""Tests for the config-driven Judge0 health check (RULES.md §4).

Network-independent: `httpx.Client` is mocked, so no live Judge0 call is made.
These prove the self-hosted migration contract: the executor reads its base URL
and auth headers entirely from config, so switching public CE -> self-hosted is
a config edit with no code change (MEMORY.md P3-2, pre-production item 1).
"""

import pytest

from backend.sandbox.executor import SandboxRunError, check_health


class _Resp:
    def __init__(self, status_code, json_body):
        self.status_code = status_code
        self.text = "<mock>"
        self._body = json_body or {}

    def json(self):
        return self._body


def _make_resp(status_code, json_body=None):
    return _Resp(status_code, json_body)


def _patch_client(monkeypatch, fake_get):
    import httpx

    class _FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, url, headers=None, **k):
            return fake_get(url, headers=headers)

    monkeypatch.setattr(httpx, "Client", _FakeClient)


def test_health_ok_returns_version(monkeypatch):
    captured = {}

    def fake_get(url, headers=None):
        captured["url"] = url
        captured["headers"] = headers
        return _make_resp(200, {"version": "1.13.1"})

    _patch_client(monkeypatch, fake_get)
    result = check_health()
    assert result == {"status": "ok", "version": "1.13.1"}
    assert captured["url"].endswith("/about")


def test_health_hits_configured_base_url(monkeypatch):
    from backend.sandbox import executor

    executor.settings.judge0_base_url = "http://localhost:2358"

    captured = {}

    def fake_get(url, headers=None):
        captured["url"] = url
        return _make_resp(200, {"version": "1.13.1"})

    _patch_client(monkeypatch, fake_get)
    check_health()
    assert captured["url"] == "http://localhost:2358/about"
    executor.settings.judge0_base_url = "https://ce.judge0.com"  # restore


def test_health_sends_configured_auth_headers(monkeypatch):
    from backend.sandbox import executor

    executor.settings.judge0_auth_headers = {"X-Judge0-Token": "sekret"}
    captured = {}

    def fake_get(url, headers=None):
        captured["headers"] = headers
        return _make_resp(200, {})

    _patch_client(monkeypatch, fake_get)
    check_health()
    assert captured["headers"].get("X-Judge0-Token") == "sekret"
    executor.settings.judge0_auth_headers = {}  # restore


def test_health_non_200_raises_sandbox_error(monkeypatch):
    def fake_get(url, headers=None):
        return _make_resp(503)

    _patch_client(monkeypatch, fake_get)
    with pytest.raises(SandboxRunError):
        check_health()


def test_health_transport_error_raises_sandbox_error(monkeypatch):
    import httpx

    def fake_get(url, headers=None):
        raise httpx.ConnectError("connection refused")

    _patch_client(monkeypatch, fake_get)
    with pytest.raises(SandboxRunError):
        check_health()
