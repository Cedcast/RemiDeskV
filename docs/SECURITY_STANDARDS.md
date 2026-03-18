# RemiDesk Security Standards

**Version:** 1.0  
**Last Updated:** March 2026

---

## 1. Data Encryption

### In Transit
- TLS 1.2+ enforced on all HTTP connections; HTTP redirected to HTTPS.
- HSTS header with `max-age=31536000; includeSubDomains`.
- Cipher suites limited to AEAD ciphers (AES-GCM, ChaCha20-Poly1305).

### At Rest
- Database encrypted with AES-256 (managed by cloud provider).
- Backup files encrypted before storage.
- Secrets (API keys, tokens) stored in environment variables / secret manager — never committed to source control.

---

## 2. API Security

- All protected endpoints require a valid **JWT bearer token** (HS256/RS256).
- Tokens expire after **60 minutes**; refresh tokens issued with sliding expiry.
- Rate limiting: 100 requests/minute per authenticated user; 20 requests/minute for anonymous endpoints.
- Input validation and sanitisation on all API parameters.
- SQL injection prevention via ORM parameterised queries (SQLAlchemy).
- CORS policy restricts origins to known frontend domains.

---

## 3. Authentication & Authorisation

| Mechanism | Implementation |
|-----------|---------------|
| Password hashing | bcrypt with cost factor ≥ 12 |
| Session management | JWT with server-side revocation list |
| MFA | TOTP (optional, recommended for admins) |
| Role-based access | Owner / Staff roles enforced at API layer |
| Token storage | httpOnly, Secure, SameSite=Strict cookies |

---

## 4. Audit Logging

All security-relevant events are logged with timestamp, actor, and IP:

- User login / logout / failed login attempts.
- Password changes and MFA enrollment/removal.
- Data export and deletion requests.
- Subscription changes and payment events.
- Admin access to production systems.

Logs are retained for **12 months** and stored in a tamper-evident log service.

---

## 5. Data Access Controls

- Principle of least privilege: staff can only access their business's data.
- Multi-tenant isolation enforced at the database query level (`business_id` filter).
- Production database access requires VPN + MFA.
- No direct production database access from application servers; queries via ORM only.

---

## 6. Infrastructure Security

- Cloud hosting on Render (managed TLS, DDoS protection).
- Environment variables managed via Render's secret store.
- Dependency vulnerability scanning on every CI build.
- Security patches applied within **48 hours** of disclosure for critical CVEs.

---

## 7. Incident Response Procedures

| Step | Action | Timeline |
|------|--------|---------|
| 1. Detection | Alert via monitoring / user report | Immediate |
| 2. Triage | Assess severity, contain if possible | < 1 hour |
| 3. Investigation | Identify root cause | < 4 hours |
| 4. Notification | Notify supervisory authority (if breach) | < 72 hours |
| 5. Remediation | Fix and redeploy | < 24 hours for critical |
| 6. Post-mortem | Document and improve | Within 1 week |

Contact: **security@remidesk.com**

---

## 8. Third-Party Security

- Only processors with SOC 2 Type II or equivalent certification.
- DPAs in place with all data processors.
- Annual review of third-party security posture.

---

## 9. Security Testing

- Dependency vulnerability scan (pip-audit / npm audit) on every CI build.
- Regular manual penetration testing (at least annually).
- OWASP Top 10 review before major releases.
