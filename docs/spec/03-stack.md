## 3. Recommended stack (mobile-first)

Chosen so that **one TypeScript codebase serves the guest web card, the organizer mobile app, and the gate scanner**, and so deployment fits the existing **Contabo VPS + Coolify** setup with images built in **GitHub Actions**.

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | **pnpm workspaces + Turborepo** | Share types, validation, QR/crypto code between apps |
| Language | **TypeScript (strict)** everywhere | One language, shared schemas |
| Mobile app (organizer + gate) | **Expo (React Native) + Expo Router** | Fast iteration, camera/QR, SQLite, OTA updates, Android-first (dominant in Tanzania) |
| Mobile local DB (offline gate) | **expo-sqlite** (+ Drizzle ORM sqlite driver) | Offline guest list and scan log |
| QR scanning | **expo-camera** (barcode scanning) | Maintained, works offline |
| Guest web card | **Next.js (App Router)** | SSR/ISR for fast, light, shareable pages; OG tags for WhatsApp previews |
| Styling | **Tailwind CSS** (web), **NativeWind** (mobile) | Shared design tokens |
| API | **Hono** on Node with **zod** validation | Small, fast, typed; shares schemas with clients |
| API contract | **OpenAPI generated from zod** (`@hono/zod-openapi`) + typed client package | Mobile and web consume one client |
| Database | **PostgreSQL 16** + **Drizzle ORM** + drizzle-kit migrations | Reliable, typed |
| Cache / queues | **Redis** + **BullMQ** | Message sending, retries, rate limits |
| Auth (organizers/staff) | **Better Auth** with phone+OTP and email/password; JWT access + refresh | Phone-first login suits Tanzania |
| Crypto | **Ed25519 via `@noble/ed25519`** | Signed QR payloads verifiable offline |
| Short codes / IDs | **nanoid** (custom alphabet, no ambiguous chars) | Human-readable codes |
| PDF/print cards | **@react-pdf/renderer** or **Playwright PDF** | Print-ready cards with enforced QR spec |
| QR rendering | **`qrcode`** (server) / **react-native-qrcode-svg** (mobile) | Error-correction level control |
| Messaging | **WhatsApp Business Cloud API** (primary), **SMS gateway adapter** (Beem / Africa's Talking / NextSMS, pluggable) | Interface-based so providers can be swapped |
| Payments | **Aggregator adapter** (Selcom / AzamPay / ClickPesa — pick one for v1) behind a `PaymentProvider` interface | Covers M-Pesa, Mixx, Airtel Money, banks |
| File storage | **S3-compatible (MinIO on VPS or Cloudflare R2)** | Card images, PDFs |
| Observability | **pino** logs, **Sentry**, **Uptime Kuma** | Cheap and self-hostable |
| Testing | **Vitest** (unit), **Playwright** (web e2e), **Maestro** (mobile e2e) | |
| CI/CD | **GitHub Actions → build Docker images → push to GHCR → Coolify deploy webhook** | Matches existing workflow |
| Hosting | **Contabo VPS + Coolify** (API, web, Postgres, Redis, MinIO as Coolify services) | Existing infra |
| Mobile builds | **EAS Build** (Android APK/AAB first; iOS later) | |

### Explicitly rejected

- Third-party dynamic QR generators (P6: link rot, expiry, scan limits).
- Native Kotlin/Swift in v1 (cost).
- Flutter (decision confirmed: Expo stays): Dart cannot share the crypto, schemas, and API client with the TypeScript API and web.
- Firebase-only backend (data residency, cost, offline-conflict control is weaker for the gate).

---

