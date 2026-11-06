# Domain model (Postgres)

All IDs are UUIDv7. All tables have `created_at`, `updated_at`. Amounts are stored in **TZS as integer** (no decimals).

- `users` (id, name, phone_e164 unique, email?, role_global)
- `events` (id, owner_id, title, couple_names, date_start, venue_name, venue_lat, venue_lng, venue_map_url, dress_code, language_default, timezone default `Africa/Dar_es_Salaam`, status, signing_key_id, brand_theme jsonb, rsvp_deadline, contribution_target_tzs?, plan)
- `event_members` (event_id, user_id, role: owner|committee|gate, pin_hash?)
- `guests` (id, event_id, display_name, phone_e164?, has_smartphone bool?, group_label, party_size_allowed default 1, short_code unique per event, token_version int default 1, language, invite_channel_pref, notes, deleted_at)
- `invitations` (id, guest_id, token_hash, status enum[created, queued, sent, delivered, opened, confirmed, declined, checked_in], sent_at, delivered_at, opened_at, rsvp_at, rsvp_party_size, channel_last)
- `message_log` (id, guest_id, channel enum[whatsapp, sms, print], provider, provider_msg_id, status, error, cost_tzs?, created_at)
- `pledges` (id, guest_id, amount_tzs, note, status enum[pledged, partial, paid, waived], created_by)
- `payments` (id, pledge_id?, guest_id, provider, provider_ref unique, amount_tzs, status enum[pending, success, failed], phone_e164, paid_at, raw jsonb)
- `scan_log` (id, event_id, guest_id?, scanned_by, device_id, result enum[ok, duplicate, invalid_sig, wrong_event, not_found, manual_ok, manual_denied], party_admitted, scanned_at (device time), synced_at, offline bool)
- `signing_keys` (id, event_id, public_key, private_key_encrypted, created_at, revoked_at)
- `audit_log` (id, actor_id, action, entity, entity_id, diff jsonb, ip, created_at)

Indexes: `guests(event_id, short_code)`, `guests(event_id, phone_e164)`, `scan_log(event_id, guest_id)`, `invitations(status)`.
