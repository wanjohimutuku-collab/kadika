import type {
  MessagingRoute,
  MessagingSettingsInput,
  MessagingSettingsView,
} from '@harusi/schemas/messaging-settings';
import type {
  PaymentRoute,
  PaymentSettingsInput,
  PaymentSettingsView,
} from '@harusi/schemas/payment-settings';
import type { BrandingInput, BrandingView, PublicBranding } from '@harusi/schemas/branding';
import type {
  Country,
  EventInput,
  GuestInput,
  ManualPaymentInput,
  PaymentMethod,
  PilotMetrics,
  RsvpInput,
} from '@harusi/schemas';
import type {
  Activity,
  AuditEntry,
  CardView,
  EventReport,
  GateLink,
  GateOverview,
  Guest,
  GuestQuery,
  ImportResult,
  ImportRowInput,
  Member,
  MessageLogEntry,
  Payment,
  PaymentStart,
  PaymentStatusView,
  PledgeSummaryView,
  AuditPage,
  ScanEntry,
  SendJob,
  SendPreview,
  SendRequest,
  Session,
  WeddingEvent,
  DataRequest,
  OpsAuditEntry,
  OpsEvent,
  OpsLookupResult,
  OpsOrganizer,
  OpsOverview,
  OpsPayment,
  OpsUsage,
} from './types';

/**
 * One method per §8 endpoint (plus read models the console needs). `MockRepository` and
 * `HttpRepository` both implement it, so swapping is a one-line change in `apps/web/src/lib/repo.ts`.
 * All amounts are whole units of the event's `currency`; all dates ISO-8601 UTC.
 */
export interface Repository {
  // Auth — POST /v1/auth/otp/request, /verify, /refresh
  requestOtp(phoneE164: string): Promise<{ resendAfterSeconds: number }>;
  verifyOtp(phoneE164: string, code: string): Promise<Session>;
  /** Staff only: second step after the SMS code (authenticator code in production). */
  verifyStaffSecondFactor(code: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
  updateProfile(patch: { name: string }): Promise<Session>;
  requestDataExport(): Promise<{ requestedAt: string }>;
  requestAccountDeletion(): Promise<{ requestedAt: string }>;

  // Events — GET/POST /v1/events, GET/PATCH /v1/events/:id
  listEvents(): Promise<WeddingEvent[]>;
  getEvent(eventId: string): Promise<WeddingEvent>;
  createEvent(input: EventInput): Promise<WeddingEvent>;
  updateEvent(eventId: string, patch: Partial<WeddingEvent>): Promise<WeddingEvent>;
  archiveEvent(eventId: string): Promise<WeddingEvent>;
  deleteEvent(eventId: string): Promise<void>;

  // Members — POST /v1/events/:id/members, DELETE …/members/:uid
  listMembers(eventId: string): Promise<Member[]>;
  inviteMember(
    eventId: string,
    input: { name: string; phoneE164: string; role: 'committee' | 'gate' },
  ): Promise<Member>;
  revokeMember(eventId: string, memberId: string): Promise<Member>;
  createGateLink(eventId: string): Promise<GateLink>;

  // Guests — GET/POST /v1/events/:id/guests, POST …/import, PATCH/DELETE /v1/guests/:id, POST …/reissue
  listGuests(eventId: string, query?: GuestQuery): Promise<Guest[]>;
  listGroups(eventId: string): Promise<string[]>;
  getGuest(guestId: string): Promise<Guest>;
  createGuest(eventId: string, input: GuestInput): Promise<Guest>;
  updateGuest(guestId: string, patch: Partial<GuestInput>): Promise<Guest>;
  deleteGuests(guestIds: string[]): Promise<{ deleted: number }>;
  /** Undo for a soft delete (snackbar "Tendua"). */
  restoreGuests(guestIds: string[]): Promise<{ restored: number }>;
  setGuestsGroup(guestIds: string[], group: string): Promise<{ updated: number }>;
  importGuests(
    eventId: string,
    rows: ImportRowInput[],
    idempotencyKey: string,
  ): Promise<ImportResult>;
  reissueGuest(guestId: string): Promise<Guest>;
  addGuestNote(guestId: string, note: string): Promise<AuditEntry>;
  listGuestMessages(guestId: string): Promise<MessageLogEntry[]>;
  listGuestAudit(guestId: string): Promise<AuditEntry[]>;
  /** Mock-only helper for the console's "show card" links. The real API never exposes raw tokens. */
  getGuestCardLink(guestId: string): Promise<{ url: string; shortUrl: string }>;

  // Invitations — POST /v1/events/:id/invitations/send, GET …/invitations/stats
  previewSend(
    eventId: string,
    req: Omit<SendRequest, 'idempotencyKey' | 'scheduleAt'>,
  ): Promise<SendPreview>;
  sendInvitations(eventId: string, req: SendRequest): Promise<SendJob>;
  getSendJob(jobId: string): Promise<SendJob>;
  retryFailed(jobId: string): Promise<SendJob>;
  /** Sends that wait for their time or recently ran, soonest first (ADR 030). Same shape as a job. */
  listScheduledSends(eventId: string): Promise<SendJob[]>;
  /** Stops a send that has not started. Rejects with `conflict` once it is running or done. */
  cancelScheduledSend(eventId: string, jobId: string): Promise<void>;
  sendTestMessage(eventId: string, channel: 'whatsapp' | 'sms'): Promise<{ to: string }>;
  listActivity(eventId: string, limit?: number): Promise<Activity[]>;

  // Cards — POST /v1/events/:id/cards/pdf
  requestCardsPdf(
    eventId: string,
    opts: { format: 'A6' | 'A5'; layout: 'single' | 'a4-4up' | 'test-sheet'; guestIds?: string[] },
  ): Promise<Blob>;

  // Gate — GET …/gate/bundle, POST …/gate/scans/sync (web console: monitor + manual check-in)
  getGateOverview(eventId: string): Promise<GateOverview>;
  listScans(eventId: string): Promise<ScanEntry[]>;
  manualCheckIn(
    eventId: string,
    guestId: string,
    input: { partySize: number; reason?: string },
  ): Promise<ScanEntry>;

  // Pledges & payments — GET …/pledges, POST /v1/guests/:id/pledges, POST /v1/payments/manual
  upsertPledge(guestId: string, amount: number, note?: string): Promise<Guest>;
  recordManualPayment(
    eventId: string,
    input: ManualPaymentInput,
    idempotencyKey: string,
  ): Promise<Payment>;
  listPayments(eventId: string): Promise<Payment[]>;
  /** Every guest's pledge, paid and balance plus the event totals (committee and owner only). */
  getPledgeSummary(eventId: string): Promise<PledgeSummaryView>;
  /** The event's audit trail, newest first (owner only). */
  listAuditLog(eventId: string, before?: string): Promise<AuditPage>;
  sendPledgeReminders(eventId: string, guestIds: string[]): Promise<{ queued: number }>;

  // Reports
  getReport(eventId: string): Promise<EventReport>;
  exportCsv(
    eventId: string,
    kind: 'guests' | 'pledges' | 'payments' | 'scans' | 'report',
  ): Promise<Blob>;

  // Guest card (public) — GET /v1/c/:token, POST …/rsvp, POST …/pay
  getCard(token: string): Promise<CardView>;
  rsvp(token: string, input: RsvpInput, idempotencyKey: string): Promise<CardView>;
  startPayment(
    token: string,
    input: { amount: number; phoneE164: string; method: PaymentMethod },
    idempotencyKey: string,
  ): Promise<PaymentStart>;
  getPaymentStatus(reference: string): Promise<PaymentStatusView>;
  /** Short link `/s/:code` → card token. */
  resolveShortCode(code: string): Promise<{ token: string }>;

  // Staff (ops) panel — the business's own employees only (users.role_global = 'admin'). Every call that
  // exposes personal data is written to the staff audit log (PDPA, §9).
  opsOverview(): Promise<OpsOverview>;
  opsListOrganizers(): Promise<OpsOrganizer[]>;
  opsListEvents(): Promise<OpsEvent[]>;
  opsUsage(): Promise<OpsUsage>;
  /** Launch-gate numbers for one country (or all), for the pilot dashboard (Phase 5). */
  opsPilotMetrics(opts?: { country?: Country | 'all'; days?: number }): Promise<PilotMetrics>;
  opsListPayments(): Promise<OpsPayment[]>;
  opsLookup(query: string): Promise<OpsLookupResult>;
  opsRevealPhone(
    target: { kind: 'guest' | 'organizer'; id: string },
    reason: string,
  ): Promise<{ phoneE164: string }>;
  opsSetUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    reason: string,
  ): Promise<OpsOrganizer>;
  opsSetEventPlan(eventId: string, plan: 'free' | 'paid'): Promise<OpsEvent>;
  opsListAudit(): Promise<OpsAuditEntry[]>;
  opsListDataRequests(): Promise<DataRequest[]>;
  opsResolveDataRequest(
    id: string,
    status: 'done' | 'rejected',
    note: string,
  ): Promise<DataRequest>;
  /** SMS and WhatsApp provider settings (ADR 031), admin staff only. Secrets come back masked. */
  opsMessagingSettings(): Promise<MessagingSettingsView>;
  /** A secret left empty keeps the saved one. Refused (`validation`) when required fields are missing. */
  opsSaveMessaging(
    route: MessagingRoute,
    input: MessagingSettingsInput,
  ): Promise<MessagingSettingsView>;
  /** Drops the saved settings for a route; the environment variables apply again. */
  opsResetMessaging(route: MessagingRoute): Promise<MessagingSettingsView>;
  opsTestMessaging(
    route: MessagingRoute,
    to: string,
  ): Promise<{ ok: boolean; provider: string; error: string | null }>;
  /**
   * Moves SMS and WhatsApp credentials from the server's environment into saved settings (ADR 036).
   * Routes that already have saved settings are left alone; `imported` names the ones copied.
   */
  opsImportMessagingFromEnvironment(): Promise<
    MessagingSettingsView & { imported: MessagingRoute[] }
  >;
  /** Payment gateway settings (ADR 036), admin staff only. Secrets come back masked. */
  opsPaymentSettings(): Promise<PaymentSettingsView>;
  opsSavePayment(route: PaymentRoute, input: PaymentSettingsInput): Promise<PaymentSettingsView>;
  opsResetPayment(route: PaymentRoute): Promise<PaymentSettingsView>;
  /** Asks the gateway whether our key works, without moving money. */
  opsTestPayment(
    route: PaymentRoute,
  ): Promise<{ ok: boolean; provider: string | null; status: number | null; error: string | null }>;
  /** The business brand every visitor sees (public). */
  getBranding(): Promise<PublicBranding>;
  /** Branding for the staff form: adds who last saved it. Admin staff only. */
  opsBranding(): Promise<BrandingView>;
  opsSaveBranding(input: BrandingInput): Promise<BrandingView>;
  /** `data` is the SVG source, or base64 for PNG, JPEG and WebP. Refused (`validation`) if unsafe. */
  opsSetLogo(file: { mime: string; data: string }): Promise<BrandingView>;
  opsRemoveLogo(): Promise<BrandingView>;
}
