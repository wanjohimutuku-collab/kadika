# 010 — Console navigation and role rules

Status: accepted

- **Five bottom tabs** (Muhtasari, Wageni, Tuma, Lango, Michango) as §17.3 requires. The brief's "Zaidi" sheet (Kadi, Timu, Ripoti, Mipangilio, Akaunti) opens from a header button on phones instead of a sixth tab, so tab targets stay wide at 360 px. On ≥ 768 px everything is in the left sidebar.
- **Committee** members do not see Timu or Mipangilio (§17.3: "committee hides event settings and member management"). The brief lists Timu for owner/committee; `CLAUDE.md` wins.
- **Gate** role is refused by the console with an explanation (§2: scanner only). The web Lango page is a monitor + manual check-in for owners and committee; the camera scanner stays in the Android app.
- **Financial data** (pledge tiles, Michango) is hidden for the gate role wherever it would otherwise appear.
- **Responsive utilities**: Tailwind v4 orders `display` utilities so a component's own `inline-flex` can beat a caller's `hidden`; responsive hiding is done with a wrapper element instead of overriding a component's display class.
