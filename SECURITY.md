# Security Policy - blist-neuro

## Supported Versions

| Version | Supported        |
| ------- | ---------------- |
| main    | Active           |
| tags    | Security only    |

---

## Reporting a Vulnerability

**DO NOT** open public issues for security vulnerabilities.

### Preferred: Private Disclosure

1. **GitHub Security Advisories**: use the "Report a vulnerability" tab in this repo (private by default)
2. **Direct contact**: reach `@blistartunivers-afk` through a private channel

### What to Include

- Description of the vulnerability
- Steps to reproduce / PoC (if safe)
- Affected versions / components
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Severity | Acknowledgment | Fix Target   |
| -------- | -------------- | ------------ |
| Critical | <= 24 hours    | <= 7 days    |
| High     | <= 48 hours    | <= 14 days   |
| Medium   | <= 72 hours    | <= 30 days   |
| Low      | <= 1 week      | Next release |

### Disclosure Process

1. **Acknowledgment** within the SLA above
2. **Investigation** - reproduce and assess
3. **Fix development** - private branch
4. **Coordinated release** - patch + advisory simultaneously
5. **Credit** - reporter credited in the advisory (unless anonymous)

---

## Security Measures in This Repo

- **OpenSSF Scorecard** - weekly security posture scoring + SARIF upload
- **Pinned Actions** - all GitHub Actions pinned to immutable SHAs
- **CodeQL** - static analysis on every PR
- **Secret Scanning** - TruffleHog on every PR + GitHub native scanning
- **Branch Protection** - required reviews, status checks, enforce admins
- **CODEOWNERS** - automatic review requests on sensitive paths

---

## Secure Development Guidelines

- Never commit secrets, tokens or private keys (use environment variables / secret managers)
- All changes land via pull request with passing checks - no direct pushes to `main`
- Dependencies and actions are pinned to immutable references (SHA)
- Report suspicious activity through the channels above
