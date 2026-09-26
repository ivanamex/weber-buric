# STEP-08B: open sign-up, and the club can block or delete

Decided 26 Sep. There's no approval step: families only get the link from the club, so an approval would just leave them waiting.

- **Instant access:** anyone with the link signs up (email → code → add their riders) and can use the app right away, including choosing a plan, booking and paying.
- **Existing families with a package already paid:** in Familias, management opens the family and assigns their current plan and start date, with **no payment created**. The family sees it active immediately.
- **Block:** in Familias, management can **Bloquear** a family. The family can't sign in or book; their existing bookings stay visible to management, and the family sees "Tu cuenta está pausada. Contacta al club." It takes effect immediately and is enforced by the database rules, not just the UI. **Desbloquear** reverses it.
- **Delete:** **Eliminar** removes the family's access and hides it from the lists. Payment and attendance history is kept for Reportes (soft delete). Ask for confirmation before deleting.
- Management adding a family by email stays, as the exception.
- **Remove the CSV import** (UI, `lib/csv.js`, styles, i18n keys).
