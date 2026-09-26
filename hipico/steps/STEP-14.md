# STEP-14: new accent color, soft coral instead of gold

Decided 26 Sep: the gold `#B08648` goes away completely, across the app, the landing page, the demo, the icons and the PWA theme.

- **Accent:** soft coral `#F4876A` for icons, the horseshoe counter, highlights, underlines, the "RIVIERA MAYA" line, and the booking celebration.
- **Buttons:** coral one shade deeper, `#E6735A`, with **white text** (`#FFFFFF`, bold). No green text on coral. Hover `#D9664E`. Outline buttons: coral border `#E6735A` with green text.
- **Soft backgrounds** (icon tiles, badges): coral at 15% on cream, around `#FBE3DA`.
- **Alerts and errors:** a clear red, `#C0392B`, so errors never look like a coral button. Keep sage `#7C9070` for success.
- **Pictograms** that were green and gold become green and coral.
- **Logo:** keep white on green and green on cream. Remove `logo-gold.png` from all screens.
- Put the colors in one place (CSS variables `--accent`, `--accent-strong`, `--accent-soft`) so a future change is one line.
- Update the color list in `hipico/CLAUDE.md` and in `steps/README.md`.
- Check the landing, login, family home, Cobros and the demo at 375 px: nothing gold should be left anywhere.
