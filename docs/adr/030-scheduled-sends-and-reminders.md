# ADR 030: scheduled invitations and organiser-asked reminders

Status: accepted. API, scheduler, client and a waiting-list card in the web console are built; the mobile app
does not offer scheduling yet.

## Context

Organisers wanted to write the invitations today and have them go out on a chosen morning, and to nudge guests
who have not answered, without chasing each one. Guests have no account, so a reminder is just a message to the
number the organiser gave. The automatic T-14/7/1 reminders (`sendReminders`) stay as they are.

## Decision

1. **A send has a kind.** `SendInput.kind` is `invite` (the default, as before) or `reminder`. Audiences fit
   the kind and a mismatch is a `validation` error:
   - invitation: `remaining`, `failed`, `{ guestIds }`, `{ group }`;
   - reminder: `unanswered` (invited, no reply), `all` (everyone invited who has not declined), `{ guestIds }`,
     `{ group }` (unanswered members of the group).
2. **Who is never reminded.** Contribution-only cards (they have pledge reminders), guests who were never
   invited, guests who declined, and anyone who opted out, even when picked by hand. A guest reminded in the last
   12 hours is skipped (`REMINDER_COOLDOWN_MS`), so a double tap, a retry or a re-run cannot text them twice.
   Reminders are refused (`conflict`) once the event has started. The text carries the days left.
3. **`DeliveryService.run` has no user check.** `send` checks the member's role and calls `run`; a scheduled send
   calls `run` directly, because the person who scheduled it was authorised when they did.
4. **Schedules store a rule, not a list** (`scheduled_sends`, migration 0016). The audience is resolved when the
   time comes, so guests added in between are included and guests who replied in between are not nagged. The
   row keeps an estimate (`recipient_count`) and, after the run, the `SendSummary`.
5. **Limits.** At least a minute ahead and before the event starts; at most 20 waiting per event; gate agents
   cannot schedule or list. Creating and cancelling are written to the audit log, as is each run.
6. **Running them.** `startScheduler` checks every minute with a plain interval, so it works without Redis.
   Each row is claimed with a conditional `UPDATE … WHERE status = 'scheduled'`, so several instances never
   run one send twice. A run that has been `running` for 30 minutes is put back in line; the cooldown and the
   invitation status keep that from texting anyone again. A send more than 24 hours late is not sent and is
   recorded as `missed` ("remind them the day before" is wrong a day later). A failure is recorded in the
   summary and not retried; unexpected errors also go to `reportError`.
7. **Client.** `Repository` gains `listScheduledSends` and `cancelScheduledSend`; a scheduled send is a
   `SendJob` with status `scheduled` and `scheduledFor`. `HttpRepository` maps the audience words
   (`unsent` is "remaining" for an invitation and "unanswered" for a reminder) and retries a failed reminder by
   guest id, because `failed` is an invitation audience. The mock mirrors the audiences and starts a scheduled
   job when its time passes. The web send page lists what is waiting with a cancel button and no longer polls a
   job that is only scheduled.

## Not done

- Scheduling and reminders in the mobile app (its send tab sends invitations now).
- Per-send editing: to change one, cancel it and make another.
- Thank-you broadcasts through the real API (`thank_you` is still `not_implemented` there).
- Not run against a live Redis or provider; the tests use PGlite and the fake SMS and WhatsApp providers.
