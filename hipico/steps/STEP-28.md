# STEP-28: a confirmed class must be visible (bug)

**Reported on iPhone, demo, Familia Hernández → Mateo (plan 4 clases/mes, renews 1 oct):** Ivana confirmed a class several times (around the 3rd) and nothing visible changed: Mi plan still says "2 de 4 clases", and there's no "Próxima clase" anywhere.

## First: reproduce and find the cause
Reproduce in `/demo` as Mateo. Likely causes to check:
- The booking failed (level mismatch, closed day, past date, no free horse…) but the error wasn't shown, or was shown too briefly.
- The date falls after the renewal (e.g. 3 oct), so it counted against the **next** period, which the Mi plan card doesn't show, and the family sees no change.
- Home / Mi plan don't re-read state after booking.
Report the real cause in the summary.

## Required behavior
- **Every confirm gives clear feedback:** success is a toast plus the class appearing immediately, e.g. "Clase confirmada · vie 3 oct, 16:00 · te quedan 1". Failure is a message that stays until dismissed and says why, in plain words ("Esta clase es de nivel avanzado", "El lunes el club está cerrado", "No quedan lugares").
- **"Próximas clases" list:** on Inicio (the next one prominent) **and** on Mi plan under the plan card, showing date, time, instructor and horse, with "Cancelar" on each.
- **Bookings in the next period:** if the date is after the renewal, say so before confirming ("Se descuenta de tu plan de octubre, que empieza el 1 oct") and show the next period's count too ("Octubre: 1 de 4").
- **Calendar dots:** in Clases, days with a confirmed class show a small coral dot.
- Past dates can't be selected.

Check it in the demo and the live app, as Mateo and Valentina, and on iPhone.
