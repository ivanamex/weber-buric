# STEP-65: Resumen, no empty space under the income chart

Ivana (15 Oct, Resumen on a computer): under "Ingresos por día, últimos 30 días" the card has a big empty area. The card is stretched to match the tall card beside it in the same row (STEP-58's equal heights), but the chart keeps its fixed height, so the extra space stays empty.

## Fix
- In equal-height rows, a card's **main content grows to fill the card**: the chart (`IncomeChart.jsx`) takes all the free height (`flex: 1`, min 200 px, redrawn on resize with a `ResizeObserver`). Lists add rows up to their 5-line limit, then the "Ver todos" link sits at the bottom.
- If that still leaves more than about 80 px of empty space, the row is wrong: put the shorter card in a row with similar cards. The income chart can take the full width on its own row, with Hoy / Este mes / 30 días to its left.
- The rule for the whole panel: no card shows more than about 80 px of empty space. Add this check to `npm run check:hover`'s report (cards whose content is shorter than the card by more than 80 px, listed by screen).

## Check
- Resumen at 1280, 1440 and 1920 px, with demo data and with empty data: no empty band in any card.
- The chart's bars and labels stay readable at the new height.
