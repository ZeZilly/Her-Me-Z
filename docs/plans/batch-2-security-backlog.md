# Batch-2 Security Backlog

Tracked items identified during the Layer 1 security backport review (PR #1,
merged `95b5a543`). None of these are blockers for what was merged; all are
improvements to harden the same surfaces further.

---

## Item 1 — Approval messaging alignment: `allow_permanent` flag in gateway

**Surface:** `gateway/run.py`, `tools/approval.py`, gateway platform base  
**Severity:** MEDIUM (misleading UX, not a bypass)

**Problem:**  
`gateway/run.py` ~L4424 and ~L5486 advertise `/approve always` as "permanent"
in the approval prompt. However when any pending approval was triggered by a
Tirith-backed warning, `choice == "always"` falls back to `approve_session()`
only — the allowlist is not written. The CLI correctly suppresses the permanent
option via `allow_permanent=False`; the gateway does not carry this flag.

**Proposed fix:**  
Thread `allow_permanent: bool` through the approval payload. Suppress the
"always" option text in the gateway prompt when any warning is Tirith-backed.

**Acceptance criteria:**
- [ ] `allow_permanent=False` suppresses "always" text in gateway approval prompt
- [ ] Existing approval tests still pass
- [ ] New test: Tirith-backed warning → prompt does not contain "always"

---

## Item 2 — `_check_sensitive_read_path` unit tests (exposure smoke test)

**Surface:** `tools/file_tools.py`  
**Severity:** LOW (guard exists, test coverage missing)

**Problem:**  
`_check_sensitive_read_path()` was added in the Layer 1 batch but has no
dedicated unit tests. A regression could silently re-open the credential
exfiltration path.

**Proposed additions in `tests/tools/test_file_tools.py`:**

Parametrized test covering paths that MUST be blocked:
- `~/.ssh/id_rsa`
- `~/.ssh/config`
- `~/.aws/credentials`
- `~/.docker/config.json`
- `~/.azure/accessTokens.json`
- `~/.config/gh/hosts.yml`
- A file nested inside `~/.ssh/` (subdir case)

Paths that MUST pass through (not blocked):
- `~/projects/myapp/config.py`
- `/tmp/testfile.txt`

Also cover `search_tool` with `path` pointing to `~/.ssh/` — must return
access-denied JSON, not a file listing.

Edge cases:
- Symlink in workspace resolving to `~/.ssh/id_rsa` → blocked
- Relative path `../../.ssh/id_rsa` from CWD → blocked after resolve

**Acceptance criteria:**
- [ ] All blocked paths return `{"error": "Access denied: ..."}` JSON
- [ ] All allowed paths proceed to normal I/O (mocked)
- [ ] Symlink and relative-path edge cases covered

---

## Item 3 — `HERMES_HOME/.env` and remaining unguarded read surfaces

**Surface:** `tools/file_tools.py`, `_check_sensitive_read_path`  
**Severity:** LOW-MEDIUM

**Problem:**  
`agent/context_references.py` blocks `HERMES_HOME/.env` for `@file` attachment
(`blocked_exact.add(hermes_home / ".env")`). The new `_check_sensitive_read_path`
function in `file_tools.py` covers home-dir credential directories but does not
currently include `HERMES_HOME/.env`.

Additionally, the existing Hermes-cache guard (skills/.hub) should be confirmed
to have parity with `_check_sensitive_read_path` — one should not supersede the
other.

**Proposed work:**
1. Add `HERMES_HOME/.env` to `_check_sensitive_read_path` via `get_hermes_home()`
2. Audit: confirm skills/.hub block (existing) + home credential block (new) +
   HERMES_HOME/.env block (proposed) are non-overlapping and collectively
   exhaustive for all known sensitive surfaces
3. Document the surface map in a comment at the top of `_check_sensitive_read_path`

**Acceptance criteria:**
- [ ] `read_file("~/.hermes/.env")` returns access-denied JSON
- [ ] `_check_sensitive_read_path` has an inline comment listing all protected
  surface categories
- [ ] No test regression

---

## Test command reference (as of Batch-1)

```bash
# Always use --frozen to avoid mutating uv.lock during test runs
uv run --frozen --extra dev --extra messaging pytest tests/ -q
uv run --frozen --extra dev --extra messaging pytest tests/tools/test_file_tools.py -v
uv run --frozen --extra dev --extra messaging pytest tests/tools/test_approval.py -v
uv run --frozen --extra dev --extra messaging pytest tests/gateway/test_approve_deny_commands.py -v
uv run --frozen --extra dev --extra messaging pytest tests/gateway/test_telegram_network.py -v

# Discard uv.lock drift after any test run
git checkout -- uv.lock
```
