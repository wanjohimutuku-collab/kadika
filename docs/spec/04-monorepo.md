## 4. Monorepo layout

```
harusi-pass/
├─ CLAUDE.md                  # this file
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ apps/
│  ├─ api/                    # Hono API + BullMQ workers
│  ├─ web/                    # Next.js: guest card, RSVP, pay, minimal admin
│  └─ mobile/                 # Expo app: organizer + gate scanner
├─ packages/
│  ├─ db/                     # Drizzle schema + migrations + seed
│  ├─ schemas/                # zod schemas (shared)
│  ├─ api-client/             # generated typed client
│  ├─ crypto/                 # QR payload sign/verify (isomorphic, works in RN)
│  ├─ messaging/              # WhatsApp + SMS provider adapters
│  ├─ payments/               # PaymentProvider adapters
│  ├─ ui-tokens/              # colors, spacing
│  └─ i18n/                   # sw.json, en.json
├─ infra/
│  ├─ docker/                 # Dockerfile.api, Dockerfile.web
│  └─ coolify/                # env templates, deploy notes
└─ .github/workflows/         # ci.yml, build-push.yml, mobile-eas.yml
```

---

