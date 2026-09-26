# Steps: how to run them

When Ivana says **"do STEP-XX"**, open `hipico/steps/STEP-XX.md` and build exactly that step. Run one step at a time.

## Every step
1. Read the step file and `hipico/CLAUDE.md`.
2. **Supabase:** Hípico's database is in the **"ivanamex's projects"** organization (the one created through Vercel). "Weber Buric Realty" is a different organization, so don't touch it. Name the project in your summary.
3. Every new table or bucket gets row-level security: families see only their own data, management sees everything.
4. Every new string goes in both `es.json` and `en.json`. Spanish is the default.
5. Design: green `#2E5339`, coral `#F4876A` (buttons `#E6735A` with white text), cream `#F6F2E9`. Outfit + Inter, **sans-serif only**.
6. **No traces:** nothing that ships (UI, comments, commit messages, file names, metadata) names a tool, a model or a step number.
7. Mirror new features in `/demo`.
8. No flow gets more taps than it has now.
9. Push to `main`. Check the Vercel build log shows `[migrate]` with no error. Mark the step done in `hipico/RUN-ORDER.md`.
10. Give Ivana a 3-line summary plus what to check in the browser, then **wait for her "ok"**.
