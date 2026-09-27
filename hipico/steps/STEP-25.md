# STEP-25: Horario in bulk (create once, repeat)

Creating classes one day at a time is too much work. In **Horario → + Nueva clase**:

## One form, many classes
- **Days:** a row of day chips **L M X J V S D**, multi-select, with quick buttons **"Todos los días"** and **"Entre semana"**. Closed days are greyed out and skipped automatically.
- **Times:** add one or more start times in the same form (e.g. 16:00, 17:00, 18:00), plus duration.
- **Class details:** discipline/level, instructor, arena, capacity.
- **Validity:** "Desde" (default today) and "Hasta" (a date, or **"Sin fecha de fin"**).
- A live preview line before saving: **"Se crearán 18 clases por semana: mar–dom a las 16:00, 17:00 y 18:00"**, then **Guardar**.

## Club-wide closed days
- In settings: **"Días cerrados"**: weekday chips (default: **Lunes** closed) plus specific dates (holidays, events) with a date-range picker.
- Nothing can be booked on closed days, and new repeating classes skip them.

## Editing repeating classes
- Tapping a class asks: **"Solo esta clase"** / **"Esta y las siguientes"** / **"Toda la serie"** (like a phone calendar).
- **Cancel a range:** select a date range (e.g. vacation week) → all classes in it are cancelled at once, affected families are notified, and classes return to their plans.
- **Copy week:** "Copiar esta semana a…" another week or date range.

## View
- A weekly grid (days × hours) on desktop, and a day list with a week strip on phones. Tapping an empty slot starts "+ Nueva clase" with that day/time pre-filled.

Mirror it in `/demo` (demo club closed on Mondays).
