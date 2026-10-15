# Uptime checks and alerts (Phase 7, §11)

Self-host **Uptime Kuma** as a Coolify service (or any monitor that can call HTTPS and alert by SMS or email). Create these monitors, checking every 60 seconds, with two failed checks in a row before an alert:

| Monitor          | URL                                                                   | Expect                                | Why                                                                |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| API alive        | `https://<api>/health`                                                | 200, body contains `"status":"ok"`    | the process is up                                                  |
| API ready        | `https://<api>/ready`                                                 | 200, body contains `"ready"`          | the database answers (a 503 means Postgres is down or unreachable) |
| Guest card       | `https://<web>/c/<a-test-card-token>`                                 | 200, body contains the couple's names | the page guests actually open                                      |
| Web home         | `https://<web>/`                                                      | 200                                   | the public site                                                    |
| Gate bundle      | `https://<api>/v1/events/<test-event>/gate/bundle` with a gate token  | 200                                   | what the gate app downloads on the day                             |
| Certificate      | the three hostnames                                                   | expiry more than 14 days away         | an expired certificate breaks every QR link                        |
| Backup freshness | a cron heartbeat URL pinged at the end of `infra/backup/pg-backup.sh` | a ping every 24 h                     | silence means the nightly backup stopped                           |

Notes:

- Use a **test event with a test guest** for the card and gate monitors, never a real wedding's data.
- Wedding days are the risk window: raise the alert level (SMS to the on-call person) from the Friday before until the Monday after any event that has a gate.
- Error reporting is separate: set `SENTRY_DSN` on the API and unexpected 5xx errors are sent, with card links, phone numbers, headers and request bodies removed before they leave the server.
- Docker health: the images already declare healthchecks; Coolify restarts a container that fails them.
