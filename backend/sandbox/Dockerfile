# Sandboxed code execution container (architecture.md §5.2, RULES.md §2)
#
# This image is the SECURITY BOUNDARY for running student-submitted code.
# It must NEVER receive host credentials, host filesystem mounts, or network.
# All real isolation is enforced by the `docker run` flags in
# backend/sandbox/executor.py (--network none, --memory, --read-only,
# non-root user, tmpfs scratch). The in-container runner only adds a
# wall-clock watchdog on top of the container-level limits.
#
# Do NOT add network-dependent pip installs to the build image; the build
# step is fine (it uses the build network) but the final runtime image must
# stay runnable with --network none.
FROM python:3.12-slim

# Run as a non-root, unprivileged user. Everything runs as this user inside
# the container; the source image already restricts capabilities, and the
# executor adds --cap-drop ALL for defense in depth.
RUN useradd --create-home --uid 1000 sandbox
USER sandbox
WORKDIR /home/sandbox

# Copy only the runner + kernel bootstrap. The runner is the only thing that
# needs to be present at runtime; the challenge code and test cases are
# injected per-run and the scratch dir is wiped by the executor.
COPY --chown=sandbox:sandbox runner.py ./runner.py

# The volume/trust boundary is documented here: at runtime, executor.py mounts
# nothing from the host, passes the challenge files via stdin/stdout over the
# container's stdio (or a small tmpfs scratch dir), sets --network none,
# --memory, --read-only, and --security-opt no-new-privileges.
CMD ["python", "-u", "./runner.py"]
