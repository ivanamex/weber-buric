# STEP-43: Spanish copy check (website + app)

Ivana: "Un club a caballo" means nothing in Spanish. Full review of the site's Spanish text (`src/i18n/es.json` → `site`) below. Replace exactly; English (`en.json`) only changes where noted.

## 1. Website: replacements
| Key | Now | New |
|---|---|---|
| `hero.title` | Un club a caballo, en la selva de Paamul | **Club hípico en la selva de Paamul** |
| `hero.sub` | Aprende a montar, disfruta y compite, a 20 minutos de Playa del Carmen. Desde los 2 años. | Clases de equitación desde los 2 años, pensión y salto, a 20 minutos de Playa del Carmen. |
| `services.title` | Todo para vivir los caballos. | Lo que hacemos en el club. |
| `services.boarding.text` | Tu caballo cuidado todos los días. | Tu caballo, cuidado todos los días. |
| `services.early.text` | Los más pequeños descubren el caballo jugando. | Los más pequeños conocen a los caballos jugando. |
| `services.camps.text` | Verano, vacaciones y un viernes al mes con ponis. | En verano, en vacaciones y un viernes al mes con ponis. |
| `services.coaching.text` | Sesiones con caballos para personas y equipos. | Talleres con caballos para personas y equipos de trabajo. |
| `competitions.training.text` | Técnica, ritmo y trayectoria en la pista de salto… | Técnica, ritmo y recorrido en la pista de salto. La altura sube cuando jinete y caballo están listos. |
| `competitions.events.title` | Concursos dentro y fuera | Concursos en el estado y fuera de él |
| `therapy.title` | El caballo como compañero de desarrollo. | Crecer junto al caballo. |
| `therapy.what` | …guiado por un terapeuta ecuestre certificado… | Un programa nuevo de actividades terapéuticas con caballos para niños, guiado por un equinoterapeuta certificado junto con un profesional de la salud (fisioterapeuta o psicólogo). El movimiento del caballo y el contacto con él apoyan el desarrollo del niño. |
| `therapy.steps.weekly.text` | …un guía, acompañantes a los lados y casco. | De 30 a 45 minutos, con un caballo de terapia tranquilo, un guía que lo lleva, acompañantes a los lados y casco. |
| `therapy.steps.review.title` | Revisión de progreso | Revisión de avances |
| `boarding.title` | Pensión y caballos. | Pensión y venta de caballos. |
| `boarding.care.farrier` | Herrador en su fecha | Herrado a tiempo |
| `boarding.care.app` | Ves a tu caballo en la app: su ración, su salud y la pensión del mes | En la app ves su ración, su salud y el pago de la pensión |
| `app.steps.confirm.text` | Eliges el día y la hora; tu plan descuenta la clase sola. | Eliges día y hora, y la clase se descuenta de tu plan. |
| `app.steps.plan.title` | Ve tu plan | Consulta tu plan |
| `learn.steps.trial.text` | Conoces al caballo, al instructor y el club. | Conoce el club, a tu instructor y a tu caballo. |
| `learn.steps.plan.text` | 1, 2 o 3 clases por semana, de fecha a fecha. | 1, 2 o 3 clases por semana; el plan corre de fecha a fecha. |
| `learn.steps.pony.text` | El último viernes del mes, desde los 2 años. | Una mañana con ponis el último viernes del mes, desde los 2 años. |
| `learn.steps.show.text` | Entrenas salto y compites con el club. | Entrena salto y compite con el equipo del club. |

**Horse colors in alt text: "bayo" is wrong for a bay horse.** In Spanish *bayo* is a buckskin/dun; a bay is *castaño*.

| Key | Now | New |
|---|---|---|
| `alt.hero`, `hero.scenes.horses.alt` | Un caballo con una mancha blanca en la cara mira de cerca | Un caballo alazán con cordón blanco mira de cerca |
| `alt.jumpBay`, `hero.scenes.jumps.alt` | …con un caballo bayo | Un jinete salta un obstáculo con un caballo castaño |
| `alt.paddock` | Caballos pastando en los potreros del club | Caballos en el potrero del club |

(`alt.rider` "caballo bayo claro" is correct, since that horse is a buckskin: keep it.)

**English:** `hero.title` → "A riding club in the Paamul jungle" (keep); `services.title` → "What we do at the club"; `therapy.title` → "Growing up alongside horses"; `boarding.title` → "Boarding and horses for sale".

## 2. Rules for all Spanish text (site + app), applied by checking every string in `es.json`
- Mexican Spanish, **tú** everywhere (never usted, never vos), sentence case.
- Correct equestrian terms: *pista* (arena), *potrero* (paddock), *herrado / herrador*, *caballo castaño / alazán / tordo / bayo / pinto* used correctly, *jinete* (rider), *concurso* (show), *clínica* (clinic), *recorrido* (course).
- No literal translations from English ("vivir los caballos", "compañero de desarrollo", "en su fecha"). If a line only makes sense translated back into English, rewrite it.
- Accents and ñ everywhere (*días, ración, Pensión, año*), "¿…?" and "¡…!" in pairs, no English words except *Pony Friday*, *app* and *WhatsApp*.
- Claude Code lists every other string it changed in the app part of `es.json` (old → new) in its report, so Ivana can check them.

## Check
`/` in Spanish: the hero reads "Club hípico en la selva de Paamul"; all the replacements above are live; the report lists any other changed app strings.
