# STEP-51: warm color + colored glass ("iOS liquid glass, with color"), app + panel + site

Ivana (9 Oct) picked **option C** with a fill-on-hover, slate blue next to the sage, and asked for **translucent, glossy, colored glass**, like iOS buttons but in color. Drafts: `steps/drafts/step-51-app-home.png` (app home, computer + phone) and `steps/drafts/step-51-site-cards.png` (option C, bottom of the image). This replaces the color part of STEP-50 (calendar views and horse photos stay).

## 1. Palette (tokens shared by the app and the site)
Base stays: parchment `#F1EAD8`, card `#FFFBF5`, olivewood `#33352A` (text), bark `#68604D`, sage `#8A8E75`, light sage `#BEC5A4`, sand `#D5C7AD`.
Warm accents, each with **one job**:
| Token | Color | Job |
|---|---|---|
| mustard | `#D9A441` | main action (Confirmar clase, Pagar, Agenda una clase muestra), the active menu item, "Por revisar" |
| slate | `#5F7A8C` | second-level actions (Ver detalle), Próxima clase, info |
| terracotta | `#B5704F` | payments due, "Pendiente" |
| plum | `#7D5A6B` | events |
| sage | `#8A8E75` | plan, profile, "Pagado" (use `#4E7A5A` for the Pagado pill text) |
Rider colors (chips, their bookings, calendar): mustard, slate, terracotta, plum, sage in that order. Levels stay as in STEP-50. Light tints for icon tiles: mustard `#F6E3B4`, slate `#D3DDE4`, terracotta `#EFD2C2`, plum `#E6D5DC`, sage `#DDE1CF`.

## 2. Colored glass (the iOS look)
One recipe, used for buttons, the active chips and the hover state of tiles/cards:
- **Fill:** the color at ~78% opacity with a soft top-to-bottom gradient (lighter at the top): `linear-gradient(180deg, color-mix(in srgb, C 70%, white) 0%, color-mix(in srgb, C 88%, transparent) 100%)`.
- **Blur + saturation** of what's behind: `backdrop-filter: blur(16px) saturate(1.5)` (with `-webkit-`).
- **Edge:** 1 px border `rgba(255,255,255,.55)`; **specular highlight:** `inset 0 1px 0 rgba(255,255,255,.75)` plus a faint inner glow `inset 0 -8px 16px rgba(255,255,255,.08)`.
- **Shadow** tinted with the same color: `0 10px 24px -10px color-mix(in srgb, C 60%, transparent)`.
- **Text:** olivewood on mustard and light tints; white on slate, terracotta, plum and sage. AA contrast checked for every pair.
- **Hover:** the sheen sweep from STEP-48 + 1 px lift; **active:** press down, highlight dims. Reduced motion: no sweep.
- On the dark/green headers (app Inicio, site hero) the glass is the same color but more translucent (~55%), so the header shows through.
- Where `backdrop-filter` isn't supported: the same gradient at full opacity.

## 3. App (families + management)
- **Inicio** as in the draft: green header with a soft **slate-blue light** in the top-right corner (sky through the trees), rider chips in their colors, plan card in glass, **Confirmar clase = mustard glass**, Cambiar plan = clear glass.
- Cards with a meaning get a **5 px colored edge** (Próxima clase = slate, Pagos por vencer = terracotta with a "Vence hoy" pill, Eventos = plum).
- **Quick tiles** (Clases, Mi plan, Mi caballo, Pagos, Eventos, Perfil) with a colored top edge and a tinted icon tile; **hover/tap = the tile fills with its color glass, text and icon turn white**.
- Management (Resumen, Cobros, Hoy…): the same rules; main actions mustard glass, status pills in their colors, Resumen tiles with colored edges and the same hover.
- Sidebar: active item on a mustard tint.

## 4. Site
- The 6 feature cards on `/descargar` and the 4 service cards / colorful boxes on `/`: **option C**: white cards, a colored top edge, a tinted icon tile; **hover = the card fills with its color glass, text and icon turn white**, lift 4 px.
- Buttons: main = mustard glass, secondary = sage glass, outline stays for tertiary. On the video hero, the glass versions at ~55%.

## Check
390 + 1440 px screenshots of: app Inicio (family), Resumen and Cobros (management), `/` and `/descargar`, each with one tile/card in hover; contrast list for every text/color pair; Safari (glass) and a fallback screenshot without `backdrop-filter`.
