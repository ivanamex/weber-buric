# STEP-50: the app: calendar views, more color, horse photos

## 1. Clases: Día · Semana · Mes (like the Árbol portal)
- A segmented toggle at the top of **Clases** (family) and **Horario** (management): **Día** (today's strip + list, as now) · **Semana** (7 columns × hours, each class as a block with its time, name, level color and free places; tap → the same booking sheet) · **Mes** (calendar grid; each day shows dots per class and a filled dot where the rider has a confirmed class; tap a day → Día view of that day).
- Closed days greyed with the reason; today highlighted; the choice is remembered per device.
- Phones: Día and Mes; Semana shows 3 days at a time with swipe.

## 2. More color (it's clean but too quiet)
Keep the Serene Sage base, add color **that means something**:
- **Levels:** Principiante = light sage `#BEC5A4`, Intermedio = sand `#D5C7AD`, Avanzado = sage `#8A8E75` (white text), Competencia = olivewood `#33352A` (white text): as pills and as the left edge of every class card / block.
- **Riders:** each rider gets their own color dot (from a set of 5 warm/earthy tones: sage, terracotta `#B5704F`, ochre `#C9A13B`, slate blue `#5F7A8C`, plum `#7D5A6B`) used on their chip, their bookings in the calendar and Próximas clases.
- **Status:** Pagado green `#4E7A5A`, Por revisar ochre `#C9A13B`, Pendiente terracotta `#B5704F`, Vencido red `--danger`; as small pills, never whole cards.
- **Inicio header:** the green gradient gets a photo of the club (`horse-blaze`) faded into it on the right.
- Contrast AA for every text on a color.

## 3. Horse photos
- Class cards and the booking sheet show the **assigned horse with its photo** (round, 40 px) and name.
- **Mi caballo** (families with a boarded horse) shows the horse's photo gallery, and the family can **add photos** of their horse (stored in `horse-photos`, the club can hide/delete them).
- Management keeps uploading photos in the horse profile (as now); the first photo is the main one everywhere.

## Check
390 + 1440 px screenshots: Día/Semana/Mes in Clases and Horario, level and rider colors, status pills, horse photos in the class cards and Mi caballo.
