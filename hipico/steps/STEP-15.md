# STEP-15: softer "liquid glass" coral buttons + mobile overflow fix

## Primary buttons: coral liquid glass
The solid coral block reads too strong. Make primary buttons the same glass style as the secondary "Ver cómo funciona" button, tinted coral:
- **On green backgrounds:** background `rgba(244,135,106,0.30)`, `backdrop-filter: blur(14px) saturate(140%)` (plus the `-webkit-` prefix), 1 px border `rgba(255,190,170,0.60)`, inner highlight `inset 0 1px 0 rgba(255,255,255,0.35)`, soft outer glow `0 8px 24px rgba(244,135,106,0.25)`. White text, bold.
- **Hover/press:** fill rises to `0.42`, border brightens slightly; 200 ms.
- **On cream backgrounds:** background `rgba(244,135,106,0.16)`, border `rgba(230,115,90,0.55)`, green `#2E5339` text, same inner highlight.
- Secondary buttons keep their current neutral glass, so the coral glass stays the one that stands out.
- Keep them as one reusable button style for the landing, the app and the demo.

## Mobile overflow (bug)
On a 390 px iPhone the hero headline "Tu club, en tu bolsillo" and the paragraph run off the right edge.
- Nothing on any page is wider than the screen: no horizontal scroll, `overflow-x: clip` on the page wrapper as a safety net.
- Headline font size scales with the screen (`clamp()`), wrapping onto two lines on phones.
- Paragraph and the "Sin descargas…" line wrap inside the 16–24 px side margins.
- Check at 360, 390 and 430 px wide, plus desktop.
