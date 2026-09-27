# STEP-21: demo never gets stuck (urgent, before the meeting)

**Bug:** on a device where someone is signed in as a family (live or demo), opening `/demo`, even by typing the address, lands back in the family view. You can't reach Dirección, and there's no way out.

## Fix
- **`/demo` always opens on the role picker** (Entrar como familia / Entrar como dirección). It never auto-resumes a previous role, and it never redirects to `/app`.
- **Demo and live are fully separate:** the demo uses its own storage (its own keys and namespace), so a live sign-in never affects the demo and the demo never touches the live session.
- **Always-visible demo bar** at the top of every demo screen: "DEMO" plus a switch **Familia ⇄ Dirección** (one tap changes role and keeps the demo data), and **Salir de la demo** (back to the role picker).
- **Reset:** "Reiniciar demo" stays in Más/settings. Add `/demo?reset=1` to clear the demo data and return to the picker.
- Check it on iPhone Safari and in the installed app: sign in live as a family → open `/demo` → the picker shows → Dirección works → switch back to Familia → Salir → the live app is still signed in.
