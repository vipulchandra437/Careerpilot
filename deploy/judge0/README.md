# Self-hosted Judge0 CE — production deployment

Migrates the code-execution backend from the public **Judge0 CE**
(`https://ce.judge0.com`) to a **self-hosted instance** you control
(pre-production checklist item 1). This is a `docker compose` stack that runs
on a Linux VM (e.g. a cloud VPS). It cannot run on this Windows dev machine
(Docker is not installed), so the actual container boot happens on the VM.

> The code side needs **no rewrite**: `backend/sandbox/executor.py` is fully
> config-driven. Switching self-hosted is a 2-line `.env` change (see step 6).

---

## Why self-host

- **Rate limits & reliability** — public CE throttles quota and occasionally
  returns 429; self-hosted has neither.
- **Privacy** — candidate source code never leaves your infrastructure.
- **Determinism** — you pin the exact Judge0 version and resource limits.

Trade-off: you now own patching (pin an image version, upgrade deliberately),
backups of the Postgres/Redis volumes, and the cost of the VM.

---

## 1. Provision the VM

- Ubuntu 22.04 LTS (or 24.04), **2 vCPU / 4 GiB RAM / 30+ GB disk** minimum.
- Open inbound `TCP 22` (SSH) and, for the app-facing endpoint, the port you
  choose below (recommended: don't expose `2358` publicly — put it behind a
  reverse proxy, step 5).

## 2. Install Docker + compose plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# log out and back in, then verify:
docker --version && docker compose version
```

## 3. Ship and configure the stack

Copy the `deploy/judge0/` directory from this repo to the VM
(e.g. `/opt/judge0`). Then set the four secrets in `judge0.conf`:

```bash
cd /opt/judge0
# Generate unique values for each:
#   AUTHN_TOKEN          -> openssl rand -hex 32
#   REDIS_PASSWORD       -> openssl rand -hex 32
#   POSTGRES_PASSWORD    -> openssl rand -hex 32
#   SECRET_KEY_BASE      -> openssl rand -hex 64
# Replace the CHANGE_ME_* lines in judge0.conf with those values.
openssl rand -hex 32
```

> The container config is read from `judge0.conf` only at boot. If you change
> it, `docker compose up -d` (recreates the containers).

## 4. Start Judge0

```bash
cd /opt/judge0
docker compose up -d db redis
sleep 10s
docker compose up -d
sleep 10s
docker compose ps          # all 4 services Up
docker compose logs -f     # watch for the server readiness line
```

## 5. Verify it works

```bash
# Unauthenticated (safe endpoints)
curl -s http://127.0.0.1:2358/healthz     # {"status":"ok"}
curl -s http://127.0.0.1:2358/version     # {"version":"1.13.1"}

# Authenticated about/system_info (proves the token the app sends is valid)
AUTHN_TOKEN=<your openssl hex>
curl -s -H "X-Judge0-Token: $AUTHN_TOKEN" http://127.0.0.1:2358/system_info
```

To confirm Python by id **71** is present: `curl -s -H "X-Judge0-Token: $AUTHN_TOKEN"
http://127.0.0.1:2358/languages` and check the entry with `"id": 71`.

### TLS / reverse proxy (recommended)

Don't expose `2358` raw. Put the backend on the same VM or a private network
and either (a) let the backend reach `http://judge0:2358` over the Docker
network, or (b) front Judge0 with a TLS reverse proxy (Caddy/nginx) and use the
`https://` URL in the app config. If the judge0 service stays internal-only,
you can leave `ALLOW_ORIGIN`/`ALLOW_IP` blank.

## 6. Point the app at it (the whole migration)

In the **backend `.env`** (this repo root):

```dotenv
# Before (public):
# JUDGE0_BASE_URL=https://ce.judge0.com
# JUDGE0_AUTH_HEADERS={}

# After (self-hosted):
JUDGE0_BASE_URL=http://<VM_IP_OR_HOST>:2358
# optional TLS reverse-proxy instead:
# JUDGE0_BASE_URL=https://judge0.yourdomain.com
JUDGE0_AUTH_HEADERS={"X-Judge0-Token": "<AUTHN_TOKEN>"}
```

That's it. `JUDGE0_LANGUAGE_ID_PYTHON` (71) and the resource limits in
`backend/config.py` already match the `judge0.conf` values above, so no other
change is required.

## 7. Backups & upgrades

- **Backups:** `docker run --rm -v /opt/judge0_judge0-data:/data -v $(pwd):/backup
  alpine tar czf /backup/judge0-data-$(date +%F).tgz -C /data .` (and same for
  `judge0-redis`). Schedule a cron job.
- **Upgrade:** bump `judge0/judge0:1.13.1` in `docker-compose.yml` to the new
  release tag, then `docker compose up -d --pull always`. Re-test Python id 71
  and a sample execution.

## Rollback

```bash
cd /opt/judge0
docker compose down
```
Then set `JUDGE0_BASE_URL` back to `https://ce.judge0.com` in the app `.env` —
the executor code is unchanged.
