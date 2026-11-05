## 8. API (Hono, REST, `/v1`)

Auth: Bearer JWT (organizer/staff); guest endpoints use the opaque card token.

```
POST   /v1/auth/otp/request        POST /v1/auth/otp/verify     POST /v1/auth/refresh
GET    /v1/events                  POST /v1/events              GET/PATCH /v1/events/:id
POST   /v1/events/:id/members      DELETE /v1/events/:id/members/:uid
GET    /v1/events/:id/guests       POST /v1/events/:id/guests   POST /v1/events/:id/guests/import
PATCH  /v1/guests/:id              DELETE /v1/guests/:id        POST /v1/guests/:id/reissue
POST   /v1/events/:id/invitations/send
GET    /v1/events/:id/invitations/stats
POST   /v1/events/:id/cards/pdf
GET    /v1/events/:id/gate/bundle           # guests, pubkey, revocations (ETag)
POST   /v1/events/:id/gate/scans/sync       # batch of offline scans
GET    /v1/events/:id/pledges    POST /v1/guests/:id/pledges    POST /v1/payments/manual
POST   /v1/payments/webhook/:provider
GET    /v1/c/:token                         # guest card data (public)
POST   /v1/c/:token/rsvp
POST   /v1/c/:token/pay
POST   /v1/webhooks/whatsapp   POST /v1/webhooks/sms
```

Rules: zod-validate every input; error shape `{ error: { code, message, details? } }`; cursor pagination; idempotency keys on send/pay/sync.

---

