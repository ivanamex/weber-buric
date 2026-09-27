# STEP-17: trial class and extra classes (outside the packages)

Two new ways to book and pay, each with its own price, set by management in settings (Cobros → Precios):

## Clase muestra (trial class)
- For new families: **one per rider, ever**, at its own price.
- A family with no plan who taps a class in Reservar sees: **Clase muestra – $X** (only if that rider hasn't had one) · **Clase suelta – $Y** · **Ver planes**.
- After a trial class, the family home suggests the plans gently: "¿Te gustó? Elige tu plan".

## Clase suelta / clase adicional (single or extra class)
- **Without a plan:** book one class and pay just that one (Clase suelta).
- **With a plan:** when the plan is used up, or they want an extra class this month, booking shows **Clase adicional – $Y** instead of blocking. It doesn't touch the plan's count.
- Payment is the same as everything else: transfer with a receipt, cash marked by management, card when Mercado Pago is live. The booking is confirmed at once and shows as pending in Cobros until it's paid.

## Management
- In settings: prices for Clase muestra, Clase suelta and Clase adicional (they can be equal).
- In Hoy, each rider shows a tag: Plan · Muestra · Suelta · Adicional.
- Reportes split income by type (plans / trial / single and extra classes).

Mirror it in `/demo`.
