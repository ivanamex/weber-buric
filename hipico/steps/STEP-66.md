# STEP-66: the footer course: real gait and illustrated fences

Ivana (15 Oct, after STEP-64): the silhouettes are good (cute, a bit retro), but
- the horse no longer runs: between jumps it **glides** in one still pose and then jumps;
- the fences drawn in code (posts + dashed poles + numbered circles) look odd next to the silhouettes.

## 1. Gait between jumps
- Canter cycle on the ground: alternate `horse-canter.png` and `horse-landing.png` (both have the hooves on the line) every ~160 ms, with a 3 px up/down bob in step. It reads as running, the way the letter-horse galloped before.
- Jump: take-off → over → landing → back into the canter cycle, as in STEP-64.
- Speed on the ground is steady (no easing that makes it slide). Reduced motion: the canter pose standing still, no cycle.

## 2. Illustrated fences
- Replace the drawn fences and the numbered circles with Ivana's fence illustrations (same flat olivewood silhouette style as the horse). Chat Claude cuts them into `public/img/course/fence-1.png`, `fence-2.png`, `fence-3.png` (transparent, olivewood, a shared baseline).
- Fence height: the horse frame is about 1.9× the fence height (as in STEP-64).
- The dotted ground line stays, and the fences stand on it.
- Phones: 2 fences.

## Check
- A short recording of one loop at 1440 px: the horse visibly runs between fences, then clears each one, with hooves on the line.
