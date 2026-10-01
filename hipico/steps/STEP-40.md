# STEP-40: the portal (app) in the new look

Run after STEP-39. The app (portal) still uses the old coral/salmon accent, so the phone mockup on the website shows coral buttons that don't match the site. Restyle the **app** to the website's system so they look like one club. Behavior and screens stay the same; only the look changes.

## 1. Tokens (`src/styles.css`)
- Replace the coral accent: `--accent` → apricot `#F2B48C`, `--accent-strong` → jungle `#24503F` (main buttons: jungle fill, white text), `--accent-hover` `#1B3F31`, `--accent-soft` → mint `#E3EEE5` (tiles, badges), `--accent-ink` → moss `#4E7A5A`. Errors stay red `--danger` (never confused with a button).
- Base background mint mist `#EEF3EE` instead of cream. Cards `#FFFFFF` with a hairline border.
- Fonts: headings Archivo condensed (as on the site), body Hanken Grotesk (as on the site). Same scale rules.

## 2. Home (Inicio) with a green gradient
- The top of **Inicio** (families) and **Resumen** (management): a deep → jungle → moss gradient header with a soft apricot glow in one corner and a light grain, the greeting and the plan summary in white on it, then the content on mist.
- The glass buttons from the site (STEP-38) are used on the green header (white-tinted glass); elsewhere the main button is jungle fill.

## 3. Everything that was coral
Buttons (`btn--primary`, `btn--accent`, `btn--save`), the booking celebration, dots on booked days, the horseshoe counter, focus rings, *Pagos por vencer* (now an apricot-tinted card with deep text; "Vence hoy" in ember `#B5562A`, readable), icon tiles, the install page and the printed poster. Search the code for `#F4876A`, `#E6735A`, `#D9664E`, `#FBE3DA`, `#C2553D` and coral `rgba(230,115,90…)`: none may remain.

## 4. The website's phone mockup
The phone in "La app" on the site shows the new look automatically (it renders `/vista`). Show the **whole phone** (not cut off) and the green Inicio header at the top.

## 5. Update project notes
Update `hipico/CLAUDE.md` (colors and fonts for the app and site) and the Rules line in `RUN-ORDER.md`.

## Check
`/demo` as Familia and Dirección on 390 px and 1440 px, `/descargar`, the poster print preview, and the site's phone mockup: no coral anywhere, the green gradient on Inicio and Resumen, jungle main buttons, readable "Vence hoy". Send screenshots.
