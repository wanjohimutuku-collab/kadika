import type {
  EventInput,
  GuestInput,
  ManualPaymentInput,
  PaymentMethod,
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
  ScanEntry,
  SendJob,
  SendPreview,
  SendRequest,
  Session,
  WeddingEvent,
} from './types';

/**
 * One method per §8 endpoint (plus read models the console needs). `MockRepository` and
 * `HttpRepository` both implement it, so swapping is a one-line change in `apps/web/src/lib/repo.ts`.
 * All amounts are integer TZS; all dates ISO-8601 UTC.
 */
export interface Repository {
  // Auth — POST /v1/auth/otp/request, /verify, /refresh
  requestOtp(phoneE164: string): Promise<{ resendAfterSeconds: number }>;
  verifyOtp(phoneE164: string, code: string): Promise<Session>;
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
  upsertPledge(guestId: string, amountTzs: number, note?: string): Promise<Guest>;
  recordManualPayment(
    eventId: string,
    input: ManualPaymentInput,
    idempotencyKey: string,
  ): Promise<Payment>;
  listPayments(eventId: string): Promise<Payment[]>;
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
    input: { amountTzs: number; phoneE164: string; method: PaymentMethod },
    idempotencyKey: string,
  ): Promise<PaymentStart>;
  getPaymentStatus(reference: string): Promise<PaymentStatusView>;
  /** Short link `/s/:code` → card token. */
  resolveShortCode(code: string): Promise<{ token: string }>;
}
