# STEP-08B: families sign up themselves, the club approves

Change to STEP-08, decided 26 Sep.

- **Main path:** families sign up themselves (email → code → add their riders).
- New accounts start as **"Pendiente de aprobación"**. The family can look around but not book or pay. Their home screen says: "Tu cuenta está en revisión. El club te confirmará pronto."
- **Familias** (management): pending accounts come first, with a count badge on the tab. **Aprobar** asks "¿Ya tiene paquete activo?"
  - **Sí:** management picks the plan and start date. It's active immediately, and no payment is created.
  - **No:** the account is approved with no plan. The family chooses and pays, and the approved transfer receipt (STEP-09) activates the plan.
- **Rechazar** with a short note, which the family sees.
- Management adding a family by email stays, as the exception. Those families are approved automatically.
- **Remove the CSV import** (UI, `lib/csv.js`, styles, i18n keys).
- Accounts that already exist are marked approved.
