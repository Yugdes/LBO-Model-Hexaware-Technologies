# Leveraged Buyout (LBO) Model — Hexaware Technologies Take-Private

## Carlyle Group Take-Private of Hexaware Technologies Ltd. (2021)

🚀 **Live Interactive Model:** [https://yugdes.github.io/LBO-Model-Hexaware-Technologies/](https://yugdes.github.io/LBO-Model-Hexaware-Technologies/)

> **Resume Bullet:** *Built a full LBO model for Carlyle Group's $2.9B take-private of Hexaware Technologies with sources & uses, 5-year debt schedule with 50% cash sweep, and returns analysis yielding a **24.8% IRR / 3.04x MOIC** at base case; sensitivity analysis reveals exit multiple as the dominant return driver — a ±2x swing in exit EV/EBITDA moves IRR by ~15pp vs. ~9pp from entry multiple and ~6pp from leverage.*

---

## Project Overview

This is a comprehensive, interactive Leveraged Buyout (LBO) financial model built for **Hexaware Technologies Ltd.**, which was taken private by **The Carlyle Group** in September 2021 through its subsidiary CA Magnum Holdings. The deal valued Hexaware at approximately **$2.9 billion** enterprise value, representing a compelling PE transaction in the Indian IT services sector.

### What This Model Includes

| Component | Description |
|---|---|
| **Transaction Summary** | Enterprise value, entry multiple, deal structure |
| **Sources & Uses** | Senior secured debt, subordinated debt, sponsor equity, fees |
| **Operating Model** | 5-year projected P&L with revenue growth, margin expansion, FCF |
| **Debt Schedule** | Mandatory amortization + **excess cash flow sweep mechanism** |
| **Returns Analysis** | IRR (Newton-Raphson method), MOIC, value creation bridge |
| **Sensitivity Analysis** | 4 sensitivity tables: Entry×Exit, Entry×Exit (MOIC), Leverage×Exit, Growth×Margin |
| **Interactive Dashboard** | All assumptions are editable with real-time recalculation |

---

## Deal Background

### Target: Hexaware Technologies Ltd.
- **Sector:** IT Services & Consulting
- **Headquarters:** Mumbai, India
- **Employees:** ~21,000
- **Listed:** BSE/NSE (pre-delisting)
- **Key Verticals:** Banking & Financial Services, Healthcare, Manufacturing

### Sponsor: The Carlyle Group
- **AUM:** ~$376 billion (2021)
- **Strategy:** Take-private via CA Magnum Holdings
- **Transaction:** Delisting offer at ₹475/share → successful delisting September 2021

### Investment Thesis
1. **Secular Tailwinds:** Digital transformation, cloud migration, and data analytics driving robust demand
2. **Margin Expansion:** Operational efficiencies through automation and offshore optimization
3. **Strong FCF Generation:** Asset-light model with low capex enabling rapid debt paydown
4. **Bolt-On M&A:** Platform for tuck-in acquisitions in niche digital capabilities

---

## Model Assumptions (Base Case)

### Transaction
| Parameter | Value |
|---|---|
| LTM Revenue | $830M |
| LTM EBITDA | $162M |
| EBITDA Margin | 19.5% |
| Entry EV/EBITDA | 18.0x |
| Enterprise Value | $2,916M |
| Transaction Fees | 2.0% of TEV |
| Financing Fees | 3.0% of Total Debt |

### Capital Structure
| Parameter | Value |
|---|---|
| Senior Secured Debt | 3.0x EBITDA ($486M) |
| Subordinated Debt | 1.5x EBITDA ($243M) |
| Total Leverage | 4.5x EBITDA |
| Senior Interest Rate | 6.5% |
| Sub Debt Interest Rate | 9.5% |
| Mandatory Amortization | 5% of initial senior/year |
| Cash Sweep | 50% of excess FCF |

### Operating Assumptions
| Parameter | Value |
|---|---|
| Revenue CAGR | 12.0% |
| EBITDA Margin (Year 1 → Exit) | 19.5% → 23.0% |
| Capex (% Revenue) | 3.0% |
| ΔWC (% ΔRevenue) | 5.0% |
| Tax Rate | 25.0% |
| D&A (% Revenue) | 2.5% |
| Hold Period | 5 years |
| Exit EV/EBITDA | 20.0x |

---

## Key Results (Base Case)

### Returns
| Metric | Value |
|---|---|
| **Sponsor IRR** | **~24.8%** |
| **MOIC** | **~3.04x** |
| Initial Equity Check | ~$2,247M |
| Exit Equity Value | ~$6,832M |
| Exit Enterprise Value | ~$6,530M × exit multiple |

### Sensitivity Findings
- **Exit multiple is the single most impactful driver:** A ±2.0x swing in exit EV/EBITDA moves the IRR by ~15 percentage points
- Entry multiple sensitivity: ~9pp range for ±2.0x change
- Leverage sensitivity: ~6pp range for ±1.5x change in total leverage
- The deal clears a 20% IRR hurdle provided exit multiples stay above ~16.5x

---

## How to Run

### Option 1: Open Directly in Browser
Simply open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local Dev Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then navigate to `http://localhost:8000`

### Option 3: VS Code Live Server
Install the "Live Server" extension and click "Go Live" in the status bar.

---

## Technical Architecture

```
LBO Model/
├── index.html              # Main dashboard (single-page app)
├── css/
│   └── styles.css          # Design system with dark/light themes
├── js/
│   ├── lbo-engine.js       # Core LBO financial model (all calculations)
│   ├── charts.js           # Chart.js visualization module
│   └── app.js              # Application controller & UI logic
└── README.md               # Documentation (this file)
```

### Key Technical Decisions
- **Pure HTML/CSS/JS** — No framework dependencies, instant load
- **Newton-Raphson IRR** — Implements IRR solver from first principles (no library)
- **Modular Architecture** — Clean separation of model, view, and controller
- **Reactive Recalculation** — Full model recompute on any assumption change
- **Chart.js** — Professional financial visualizations
- **Responsive Design** — Works on desktop and tablet
- **Dark/Light Mode** — Toggle between themes

---

## LBO Mechanics Covered

This model demonstrates mastery of the following LBO concepts frequently tested in IB interviews:

### 1. Sources & Uses
- How to size debt tranches (turns of EBITDA)
- Equity as the "plug" in the capital structure
- Transaction and financing fee treatment

### 2. Debt Schedule
- **Mandatory Amortization:** Fixed percentage of initial principal per year
- **Cash Sweep (Excess Cash Flow Sweep):** 50% of levered FCF after mandatory amort applied to senior debt paydown
- **Bullet Maturity:** Subordinated debt with no scheduled amortization (interest-only)
- Why cash sweep accelerates de-leveraging and boosts equity returns

### 3. Operating Model
- Revenue growth assumptions and EBITDA margin expansion
- D&A, interest expense, taxes → Net Income
- FCF = Net Income + D&A - Capex - ΔNWC
- Link between operating performance and debt capacity

### 4. Returns Analysis
- **IRR:** Time value of money — penalizes longer holds even with higher MOIC
- **MOIC:** Simple multiple — doesn't account for time value
- **Value Creation Attribution:**
  - EBITDA growth contribution
  - Multiple expansion/contraction
  - Debt paydown contribution

### 5. Sensitivity Analysis
- Why **exit multiple** is the largest driver of returns
- How **leverage** amplifies returns (both upside and downside)
- The relationship between **operational improvement** (growth + margins) and returns
- Understanding the "20% hurdle rate" concept for PE

---

## Interview Talking Points

### "Walk me through an LBO."
> *A PE fund acquires a company using a significant amount of debt, typically 4-6x EBITDA. The equity return is driven by three levers: (1) growing EBITDA through revenue growth and margin expansion, (2) paying down debt with free cash flow — including a cash sweep mechanism, and (3) exiting at a favorable multiple. In my Hexaware model, the base case generates a 24.8% IRR and 3.04x MOIC over 5 years, with exit multiple being the dominant sensitivity — a ±2x change in exit EV/EBITDA swings IRR by ~15pp.*

### "What are the key value creation levers?"
> *In my model, value creation decomposes into three buckets: (1) EBITDA growth — I model 12% revenue CAGR with margin expansion from 19.5% to 23%, capturing digital transformation tailwinds; (2) Multiple expansion — from 18x entry to 20x exit, reflecting the scarcity premium for scaled IT services platforms; and (3) Debt paydown — the 50% cash sweep accelerates de-leveraging from 4.5x to under 2x, creating significant equity value.*

### "What does the cash sweep do?"
> *The excess cash flow sweep takes 50% of levered free cash flow after mandatory amortization and applies it to senior debt paydown. This accelerates de-leveraging beyond the mandatory 5% annual amortization. In my model, the cash sweep contributes approximately $200-300M of additional debt paydown over the hold period, directly accruing to equity value.*

---

## Disclaimer

This model is built for **educational and analytical purposes** to demonstrate LBO modeling proficiency. All financial figures are based on publicly available data and analyst estimates. This does not constitute investment advice.

---

*Built by [Your Name] | [Year]*
