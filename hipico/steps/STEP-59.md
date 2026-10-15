# STEP-59: Spanish copy check, round 2

Ivana (15 Oct): something says "a caballo" and means nothing in Spanish. Found: the footer slogan **"Tu lugar feliz, a caballo."**, an English calque of "your happy place, on horseback". Chat Claude also re-read all 1,439 strings in `es.json`; these are the fixes. Replace exactly. English changes only where noted.

## 1. The slogan (`src/site/content.js` → `SLOGAN`)
| Now | New |
|---|---|
| Tu lugar feliz, a caballo. | **Tu lugar feliz tiene caballos.** |
| EN: Your happy place, on horseback. | EN: **Your happy place has horses.** |

Keep the alternatives in the comment ("Aquí los caballos son el plan." · "Un salto a la vez."), and delete "Tu lugar feliz, a caballo." from anywhere it appears (comments, the footer, the OG text).

## 2. Other strings (`src/i18n/es.json`)
| Key | Now | New |
|---|---|---|
| `landing.headline` | Tu club, en tu bolsillo | Tu club, en tu celular |
| `landing.how.pay.text` | …Tarjeta muy pronto; efectivo o transferencia en el club. | Planes, pensión y eventos en un solo lugar. Paga por transferencia desde la app, con tarjeta o en el club. |
| `summary.waReminder` | …Te recordamos amablemente {what}: {amount}… | Hola {contact}, te escribimos del Hípico Riviera Maya. Te recordamos {what}: {amount}. Puedes pagar desde la app o en el club. ¡Gracias! |
| `toasts.boardingPending` | Pago de pensión registrado. Págalo en el club. | Pensión pendiente de pago. Puedes pagarla desde la app o en el club. |
| `schedule.off` | Apagada | Inactiva |
| `schedule.clashSelf` | {day}: {a} y {b} se enciman | {day}: {a} y {b} se empalman |
| `payroll.frequency` | Pago | Frecuencia de pago |
| `modules.intro` | Enciende solo lo que el club usa. Se puede cambiar cuando quieras. | Activa solo lo que el club usa. Puedes cambiarlo cuando quieras. |
| `horses.sell` | Vendido | Registrar venta |
| `closed.intro` | Nadie puede reservar esos días y las clases nuevas se los saltan. | Esos días nadie puede reservar y no se programan clases. |
| `site.enjoy.title` | Galería del club. | Galería del club |
| `site.enroll.errors.age` | Edad entre 2 y 99. | Escribe una edad entre 2 y 99 años. |
| `family.home.moreBooked` | +{count} clase(s) más confirmada(s) | +{count} clases confirmadas más (add `_one`: +1 clase confirmada más) |

**English:** `landing.headline` becomes "Your club, on your phone". `landing.how.pay.text`, `summary.waReminder` and `toasts.boardingPending` get the same meaning in natural English.

## 3. Strings outside `es.json`
Search the code for any Spanish written straight into `.jsx/.js` (alt text, aria labels, comments shown to users, `content.js`, the OG/meta text, the emails in `api/`). Apply the same rules as STEP-43: Mexican Spanish, *tú*, natural phrasing, no calques. List anything changed (old → new) in the report.

## Check
- The footer of `/` reads "Tu lugar feliz tiene caballos.", and `/en` reads "Your happy place has horses."
- `es.json` and `en.json` keep the same keys.
- The report lists every string changed outside the table above.
