# STEP-20: horse profile

In management → Caballos, tapping a horse opens its **profile** (create and edit):

## Basics
- Photo (1 main + a few extra), name, age (or birth year, age calculated), sex, breed, coat color, height in cm.
- **Category:** Escuela · Pensión · En venta · Retirado (the existing status), plus **level** for school horses: Principiante · Intermedio · Avanzado · Competencia.
- For pensión: owner family. For sale: price and description (already in STEP-19).

## Food
- Feed type(s) (e.g. alfalfa, avena, concentrado), quantity per ration in kg, rations per day, supplements, and special notes ("sin azúcar", "remojar el heno").
- Show a clear **"Ración diaria"** card, easy to read for the groom.

## Health
- Vet visits, vaccines, deworming and farrier visits: date, note, and **next due date**.
- On the management Resumen: a small "Caballos: próximos pendientes" list (vaccines, deworming or farrier due in the next 14 days).

## Who sees what
- Management: everything, editable.
- A family with a boarded horse: a read-only profile of **their own horse** (photo, food, next vet/farrier dates) in Más → Mi caballo.
- Instructors (later): basics + level only.

Mirror it in `/demo` with the sample horses (e.g. Canela, Lucero), filled in with realistic data.
