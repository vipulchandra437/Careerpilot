"""Live audit tests against running backend."""
import httpx
import json
import sys
sys.path.insert(0, "D:\\major project")

BASE = "http://localhost:8000"

# === SETUP: Create user and get token ===
print("=" * 70)
print("SETUP: Creating test user and getting auth token")
print("=" * 70)

r = httpx.post(f"{BASE}/api/auth/signup", json={"email": "audit@phase1.com", "password": "SecurePass123"})
print(f"POST /api/auth/signup")
print(f"Status: {r.status_code}")
print(f"Body: {r.text[:300]}")
print()

if r.status_code == 201:
    token = r.json()["access_token"]
elif r.status_code == 409:
    r = httpx.post(f"{BASE}/api/auth/login", json={"email": "audit@phase1.com", "password": "SecurePass123"})
    print(f"POST /api/auth/login")
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text[:300]}")
    print()
    token = r.json()["access_token"]
else:
    print("FATAL: cannot get token")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

# === 5c: OVERSIZED FILE UPLOAD ===
print("=" * 70)
print("5c: OVERSIZED FILE UPLOAD (11MB+ to /api/profile/resume)")
print("=" * 70)

with open("D:\\major project\\tests\\oversized_resume.pdf", "rb") as f:
    r5c = httpx.post(
        f"{BASE}/api/profile/resume",
        headers=headers,
        files={"file": ("oversized_resume.pdf", f, "application/pdf")},
        timeout=60,
    )
print(f"POST /api/profile/resume")
print(f"File: tests/oversized_resume.pdf (11,534,351 bytes)")
print(f"HTTP Status: {r5c.status_code}")
print(f"Response Body: {r5c.text}")
print()

# === 5a: GITHUB OAUTH (check endpoint availability) ===
print("=" * 70)
print("5a: GITHUB OAUTH - endpoint check + connect attempt")
print("=" * 70)

r5a_url = httpx.get(f"{BASE}/api/profile/github/auth-url", headers=headers)
print(f"GET /api/profile/github/auth-url")
print(f"Status: {r5a_url.status_code}")
print(f"Body: {r5a_url.text[:500]}")
print()

# === 5b: PROFILE HUB - snapshot endpoint ===
print("=" * 70)
print("5b: PROFILE HUB - GET /api/profile/snapshot")
print("=" * 70)

r5b = httpx.get(f"{BASE}/api/profile/snapshot", headers=headers)
print(f"GET /api/profile/snapshot")
print(f"Status: {r5b.status_code}")
print(f"Body: {r5b.text[:500]}")
print()

# === 5b (cont): Upload a valid small resume first, then check snapshot ===
print("=" * 70)
print("5b: Upload valid resume, then check snapshot")
print("=" * 70)

with open("D:\\major project\\tests\\fixtures\\resume_clean.txt", "rb") as f:
    r_upload = httpx.post(
        f"{BASE}/api/profile/resume",
        headers=headers,
        files={"file": ("resume_clean.txt", f, "text/plain")},
        timeout=30,
    )
print(f"POST /api/profile/resume (resume_clean.txt)")
print(f"Status: {r_upload.status_code}")
print(f"Body: {r_upload.text[:500]}")
print()

r5b2 = httpx.get(f"{BASE}/api/profile/snapshot", headers=headers)
print(f"GET /api/profile/snapshot (after upload)")
print(f"Status: {r5b2.status_code}")
print(f"Body: {r5b2.text[:1000]}")
