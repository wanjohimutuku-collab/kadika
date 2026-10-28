# ADR 048: Sign-in codes come from Firebase Phone Auth; NextSMS is for transactional SMS only

Status: accepted. Built with tests. Off until switched on. The switch and the Firebase config moved to
/ops → Settings → Sign-in in ADR 049; the variables below remain the fallback.

## Context

Organizers and staff sign in with a phone number and a 6-digit code (§7.1, ADR 040). Until now the API
made the code itself and sent it through our SMS route (NextSMS for Tanzania, Africa's Talking for
Kenya, ADR 026/031). That has costs:

- Each login code is a paid SMS on the same sender ID and balance as card invitations, so SMS pumping
  on the login form burns the balance that weddings depend on (the spend guards in the
  production-readiness audit exist because of this).
- The OTP route is a TCRA-registered alphanumeric sender meant for invitations; mixing login codes in
  makes delivery problems on one affect the other.
- We maintain the code store, resend timers, lockouts and abuse limits ourselves.

Firebase Phone Auth sends and checks the code, adds reCAPTCHA (web) and Play Integrity (Android)
against bots, and returns a signed ID token naming the verified phone number.

## Decision

1. **A switch, `AUTH_OTP_PROVIDER=sms|firebase`** (API), default `sms`. `firebase` requires
   `FIREBASE_PROJECT_ID`; the API will not start without it. Setting it back to `sms` restores the old
   flow at once (no client release), which is the fallback if Firebase SMS stops reaching Tanzanian
   numbers or costs too much.
2. **`GET /v1/auth/config`** tells clients which flow to use and, for Firebase, the public web config
   (`FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_WEB_APP_ID`). The
   web console therefore needs no `NEXT_PUBLIC_FIREBASE_*` build arguments and no image rebuild to
   switch, and web and API can never disagree about the flow. These values are public by design
   (Firebase's own guidance); access is controlled by authorized domains and the API's token check.
3. **`POST /v1/auth/firebase {idToken}`** verifies the Firebase ID token without firebase-admin, as
   Firebase documents for third-party JWT libraries: RS256 signed by one of Google's published
   securetoken keys (fetched and cached by `jose`), `aud` = our project, `iss` =
   `https://securetoken.google.com/<project>`, not expired, `sub` present, `auth_time` in the past.
   On top: `firebase.sign_in_provider` must be `phone` with a `phone_number` claim, and the sign-in
   must be under 10 minutes old (the token is traded right after the code is typed). Only the phone
   number is used from the token. It then runs the same sign-in as the SMS code: suspended accounts
   are refused, pending team invitations are accepted, staff get only the second-factor challenge
   (ADR 040, TOTP still required), everyone else gets our own access and refresh tokens. Rate limit:
   30 per IP per 10 minutes.
4. **With `firebase`, `POST /v1/auth/otp/request` is refused** (`409`, `reason: use_firebase`) and no
   login code goes through NextSMS or Africa's Talking. Those routes carry only transactional messages:
   invitations, reminders, WhatsApp fallbacks, pledge and contribution messages, and test messages.
5. **Web** (`/login`, `/login/otp`): the Firebase JS SDK is loaded on demand on the login pages only,
   with an invisible reCAPTCHA; the code is checked by Firebase, the ID token traded at the API, and the
   Firebase session signed out. Mock mode always uses the SMS flow.
6. **Mobile**: React Native Firebase (`@react-native-firebase/app` + `/auth` 22.x, which supports Expo
   SDK 53) with its config plugins. The JS Firebase SDK cannot be used in React Native for phone sign-in
   because it needs a DOM reCAPTCHA; the old `expo-firebase-recaptcha` workaround was removed from Expo.
   The trade-off: RN Firebase is native code, so it needs a real build (EAS / `expo run:android`), not
   Expo Go. `app.config.js` adds the plugins only when `google-services.json` is provided
   (`GOOGLE_SERVICES_JSON` EAS file variable); a build without it keeps working with `sms` and shows
   "update the app" with `firebase`. Android's automatic SMS retrieval signs in without typing the code.
   No `EXPO_PUBLIC_FIREBASE_*` variables are needed: RN Firebase reads `google-services.json`.

## Cost, quotas and residency

- **Billing.** Firebase phone sign-in needs the Blaze (pay-as-you-go) plan. SMS is charged per message
  by destination country (Identity Platform SMS pricing); the cheapest countries are about USD 0.01
  and others cost several times more. Check the current Tanzania (+255) and Kenya (+254) rates on the
  Firebase/Identity Platform pricing page before switching and compare them with the NextSMS rate.
  If Firebase is clearly dearer per code, the saving is only in pumping protection and maintenance.
- **Abuse.** In Firebase Authentication → Settings → SMS region policy, allow only Tanzania (and Kenya
  when `KENYA_ENABLED`), so the login form cannot be used to send paid SMS to other countries. Set a
  Cloud Billing budget alert. Firebase also enforces its own per-number and per-IP limits; our
  `OTP_*_HOURLY_LIMIT` guards apply only to the `sms` flow.
- **Delivery.** Firebase's sender for Tanzanian numbers is not our registered sender ID; messages may
  arrive from a short code or a generic name. Test on Vodacom, Airtel, Tigo/Mixx and Halotel before
  switching production.
- **Data residency.** Phone numbers used for sign-in are processed and stored by Google (Firebase
  Authentication user records, US/global infrastructure). That is personal data under Tanzania's PDPA:
  the privacy notice must name Google/Firebase as a processor for sign-in. We do not keep the Firebase
  session; the account of record stays in our database. Firebase users can be deleted from the
  console for data requests. Guests never sign in, so guest phone numbers are not sent to Firebase.

## Consequences

- Installed apps built before this change only know the SMS flow; after switching to `firebase` they
  cannot sign in until updated. Publish the new APK (ADR 047) first and switch once most organizers have
  updated. The web console follows the switch immediately.
- `OtpService` and its tests stay; the fake SMS provider still drives every test that signs in.
- Firebase is now a sign-in dependency. If it fails, set `AUTH_OTP_PROVIDER=sms` and redeploy the API.
