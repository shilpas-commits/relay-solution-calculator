# Relay Solution Calculator

GreyOrange relay warehouse fleet, storage & slotting capacity calculator.

## Features
- **⚡ Fleet tab** — HTM & VTM fleet sizing with queue model
- **📦 Storage tab** — Shift demand vs storage capacity, reuse rate sensitivity  
- **🗂 Slotting tab** — Velocity-based slotting, blended VTM cycle, bot savings

## Key Formulas
```
Tote Cycle  = OWT + T2T
TPH/PPS     = 3600 / (OWT + T2T)
UPH/PPS     = TPH × Avg Units/Tote
HTM Fleet   = ⌈System TPH / HTM_cph⌉ + buffer
VTM Fleet   = ⌈System TPH × (1 - RelayReuse%) / VTM_blended_cph⌉ + buffer
Unique Totes= Shift Presentations / Effective Reuse Rate
```

## O&M Default Values
| Parameter | Value | Source |
|---|---|---|
| OWT | 22s | Confirmed |
| HTM Cycle | 195.6s (3.26 min) | Live observed |
| VTM Cycle | 90s (1.50 min) | Live observed |
| PPS Count | 7 | Site config |
| Queue/PPS | 8 totes | Site config |
| Storage | 18,000 totes | Site spec |
| Aisles | 27 | Site config |

## Deploy to Vercel
```bash
npm install
npx vercel deploy --prod
```
Or import this repo at [vercel.com/new](https://vercel.com/new) — auto-detects Next.js.

## Local Dev
```bash
npm install
npm run dev
```
