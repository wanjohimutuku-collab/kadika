-- Kadi Sasa Weekly Growth Funnel & Attribution Report (Prompt 9)
-- Zero guest PII: queries only account-level attribution, event metadata,
-- non-grant purchase settlement timestamps, and anonymous analytics_events.
-- Adjust the lookback interval ('12 weeks') as needed.

-- 1. Weekly overview by country: signups, events created, and events reaching first payment
WITH signups AS (
  SELECT
    date_trunc('week', u.created_at AT TIME ZONE 'UTC')::date AS week_start,
    CASE
      WHEN u.phone_e164 LIKE '+255%' THEN 'TZ'
      WHEN u.phone_e164 LIKE '+254%' THEN 'KE'
      WHEN u.phone_e164 LIKE '+256%' THEN 'UG'
      ELSE 'unknown'
    END AS country,
    count(*)::int AS signups
  FROM users u
  WHERE u.deleted_at IS NULL
    AND u.created_at >= now() - interval '12 weeks'
  GROUP BY 1, 2
),
created_events AS (
  SELECT
    date_trunc('week', e.created_at AT TIME ZONE 'UTC')::date AS week_start,
    e.country::text AS country,
    count(*)::int AS events_created
  FROM events e
  WHERE e.deleted_at IS NULL
    AND e.created_at >= now() - interval '12 weeks'
  GROUP BY 1, 2
),
first_paid_events AS (
  SELECT
    ep.event_id,
    e.country::text AS country,
    min(ep.paid_at) AS first_paid_at
  FROM event_purchases ep
  JOIN events e ON e.id = ep.event_id
  WHERE e.deleted_at IS NULL
    AND ep.status = 'paid'
    AND ep.method <> 'grant'
    AND ep.kind IN ('cards', 'pack')
    AND ep.paid_at IS NOT NULL
  GROUP BY 1, 2
),
paid_by_week AS (
  SELECT
    date_trunc('week', first_paid_at AT TIME ZONE 'UTC')::date AS week_start,
    country,
    count(*)::int AS events_reached_payment
  FROM first_paid_events
  WHERE first_paid_at >= now() - interval '12 weeks'
  GROUP BY 1, 2
),
keys AS (
  SELECT week_start, country FROM signups
  UNION
  SELECT week_start, country FROM created_events
  UNION
  SELECT week_start, country FROM paid_by_week
)
SELECT
  k.week_start,
  k.country,
  coalesce(s.signups, 0) AS signups,
  coalesce(c.events_created, 0) AS events_created,
  coalesce(p.events_reached_payment, 0) AS events_reached_payment
FROM keys k
LEFT JOIN signups s ON s.week_start = k.week_start AND s.country = k.country
LEFT JOIN created_events c ON c.week_start = k.week_start AND c.country = k.country
LEFT JOIN paid_by_week p ON p.week_start = k.week_start AND p.country = k.country
ORDER BY k.week_start DESC, k.country ASC;

-- 2. Weekly signups by attribution source and country
SELECT
  date_trunc('week', u.created_at AT TIME ZONE 'UTC')::date AS week_start,
  CASE
    WHEN u.phone_e164 LIKE '+255%' THEN 'TZ'
    WHEN u.phone_e164 LIKE '+254%' THEN 'KE'
    WHEN u.phone_e164 LIKE '+256%' THEN 'UG'
    ELSE 'unknown'
  END AS country,
  coalesce(
    nullif(u.signup_utm_source, ''),
    CASE WHEN u.signup_referral_code IS NOT NULL THEN 'referral' ELSE NULL END,
    nullif(u.signup_referrer_host, ''),
    'direct'
  ) AS source,
  coalesce(u.signup_utm_campaign, '') AS campaign,
  count(*)::int AS signups
FROM users u
WHERE u.deleted_at IS NULL
  AND u.created_at >= now() - interval '12 weeks'
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 5 DESC, 3 ASC;

-- 3. Weekly anonymous growth funnel events from analytics_events (no cookies, no guest PII)
SELECT
  date_trunc('week', a.occurred_at AT TIME ZONE 'UTC')::date AS week_start,
  a.market,
  a.name AS event_name,
  a.source AS referrer_source,
  count(*)::int AS total_events,
  count(DISTINCT a.session_hash)::int AS unique_daily_sessions
FROM analytics_events a
WHERE a.occurred_at >= now() - interval '12 weeks'
  AND a.name IN (
    'signup_started',
    'signup_completed',
    'event_created',
    'guests_added',
    'cards_sent',
    'first_payment',
    'gate_app_installed',
    'gate_scan_session_started',
    'michango_enabled',
    'referral_link_clicked',
    'referral_signup'
  )
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 2 ASC, 5 DESC;
