# TEST FIRM: The Ultimate Worst-Case Prop Trading Challenge
**Quantitative Risk Memorandum & Passing Certainty Report**
*Firm Name: TEST FIRM | Combined Worst Scenarios: Instant, 1-Step, 2-Step, Big Accounts & Operational Fine Print*

---

## 1. Executive Summary: TEST FIRM Scorecard
- **Firm Name:** `TEST FIRM` (Apex Toxic Synthesis)
- **Monte Carlo End-to-End Passing Rate:** `0.00%` (Grade: `F`)
- **Effective Retained Profit Split:** `20%` (Reason: `FundedSquad Free Retry Downgrade (50% split)`)
- **Break-Even Win Rate:** `40%` (at 1.5:1 R:R)
- **Consecutive Losses to Daily Breach:** `3 trades` (at 1.0% risk)
- **Consecutive Losses to Max DD Breach:** `4 trades`
- **Expected Challenge Attempts to 1st Payout:** `1000 attempts`
- **True Capital Required to First Payout:** `$2,90,000`

---

## 2. Win Rate vs. Passing Rate Multi-Scenario Audit (TEST FIRM)

| Strategy Profile | Win Rate % | Avg R:R | Break-Even WR % | Expected EV (R) | Pass Rate (1.0% Risk) | Pass Rate (0.5% Risk) | Pass Rate (0.25% Risk) | Phase 1 Pass | Funded Survival |
|---|---|---|---|---|---|---|---|---|---|
| **Low Win Rate (Trend Follower)** | 40% | 2:1 | 33.3% | 0.20 R | **0.0%** | **4.4%** | **7.2%** | 8.3% | 53.6% |
| **Baseline Breakeven Margin** | 45% | 1.5:1 | 40.0% | 0.13 R | **0.0%** | **4.8%** | **3.5%** | 9.0% | 54.0% |
| **Solid Discretionary Trader** | 50% | 1.5:1 | 40.0% | 0.25 R | **0.0%** | **11.8%** | **10.5%** | 15.3% | 77.1% |
| **High Edge Day Trader** | 55% | 1.5:1 | 40.0% | 0.38 R | **0.0%** | **21.5%** | **21.0%** | 23.4% | 91.8% |
| **Elite Institutional Scalper** | 60% | 1.2:1 | 45.5% | 0.32 R | **0.0%** | **24.1%** | **16.5%** | 25.5% | 94.3% |
| **Hyper-Accurate Mean Reversion** | 65% | 1:1 | 50.0% | 0.30 R | **0.0%** | **28.2%** | **15.1%** | 29.2% | 96.5% |

---

## 3. Passing Rates Across Account Sizes ($5K to $200K)

| Account Size | Monte Carlo Pass Rate | Analytical Certainty | Daily Loss Floor ($) | Max Trailing DD ($) | Floating Risk Cap ($) |
|---|---|---|---|---|---|
| **$5K** | **0.0%** | 0.1% | -$150 | -$200 | -$50 |
| **$10K** | **0.0%** | 0.1% | -$300 | -$400 | -$100 |
| **$25K** | **0.0%** | 0.1% | -$750 | -$1,000 | -$250 |
| **$50K** | **0.0%** | 0.1% | -$1,500 | -$2,000 | -$500 |
| **$100K** | **0.0%** | 0.1% | -$3,000 | -$4,000 | -$1,000 |
| **$200K** | **0.0%** | 0.1% | -$6,000 | -$8,000 | -$2,000 |

---

## 4. Master Rule Inventory for TEST FIRM (14 Binding Rules)

| Originating Firm | Category | Rule Title & Threshold | Breach Penalty | Multiplier |
|---|---|---|---|---|
| **FundingPips** | `targets_dd` | **Daily Loss Limit: 3% (Higher of Open Bal / Equity)**<br>*Threshold: 3% Daily Loss calculated against higher of start-of-day balance or equity* | `hard` | `0.74x` |
| **Pipstone Capital** | `targets_dd` | **Ultra-Tight 4% Max Drawdown & $20K Capital Cap**<br>*Threshold: Max 4% Total Drawdown limit; account sizes capped at $20K maximum; 70% split* | `hard` | `0.58x` |
| **FundingPips** | `intraday_floating` | **Floating Risk Cap: -1% Hard Breach (Instant Liquidation)**<br>*Threshold: -1.0% maximum open unrealized drawdown at any split second = Immediate Hard Breach* | `hard` | `0.52x` |
| **The Funded Room** | `execution_news` | **4 Orders in 3 Min Pyramiding Breach & 10% Sub-1-Min Ratio Blocker**<br>*Threshold: 4 orders in 3 minutes = HFT Hard Breach (2nd violation = permanent ban); <1m trades must be ≤10% total* | `hard` | `0.74x` |
| **FundingPips** | `consistency_buffer` | **15% Single Day Profit Consistency Score Cap**<br>*Threshold: No single day's profit can exceed 15% of total realized profit* | `soft` | `0.58x` |
| **Pipstone Capital** | `consistency_buffer` | **5 Profitable Days (≥0.5% Above High-Watermark, Resets to 0 Post-Payout)**<br>*Threshold: Must log 5 days making ≥0.5% above the highest-ever previous balance; all 5 days reset to 0 after each payout* | `hard` | `0.68x` |
| **FundingPips** | `execution_news` | **News & Weekend Hard Breach (10m Window)**<br>*Threshold: Hard Breach if holding open trades 10 min before/after high-impact red-folder news or over weekends* | `hard` | `0.76x` |
| **FundedSquad** | `targets_dd` | **Instant Free Retry Downgrade Trap (1.5% DL, 3% Trailing DD, 50% Split)**<br>*Threshold: Free retry account drops to 1.5% daily loss, 3% trailing max loss, 4% target, 6 days, and 50% split (40% after 1st 1% float breach)* | `hard` | `0.52x` |
| **FundedNext** | `payout_fees` | **Stellar Instant Split & Lock (70% Tiers 1–2 → 80% Cap Tier 3+)**<br>*Threshold: 70% split (Tiers 1–2) → 80% cap (Tier 3+); min 1% cycle growth required; trading before transferring after EOD 5% disables payout until next EOD; 3 purchase attempts max* | `hard` | `0.78x` |
| **Pipstone Capital** | `execution_news` | **Nuclear <60s Hold Penalty (20% Split + Account Closure) + 15m Reversal Lock**<br>*Threshold: 1st <60s trade = profit split slashed to 20% & account terminated; 15-min cooldown after losing trade* | `hard` | `0.70x` |
| **FundingPips** | `targets_dd` | **Target: 5% | Daily Loss: 1% Hard Breach | Max Loss: 3% EOD Trailing**<br>*Threshold: 5% Target; 1% Daily Loss Hard Breach; 3% EOD Trailing DD (locks at BE at +3%); $100K only* | `hard` | `0.32x` |
| **FundedSquad** | `big_throttles` | **Severe Non-Linear Hard Lot Caps ($200K: 8.0 FX / 4.0 Gold)**<br>*Threshold: $100K: 6.0 FX / 2.5 Gold; $200K: 8.0 FX / 4.0 Gold (Instant $200K: 4.0 FX / 2.2 Gold)* | `hard` | `0.70x` |
| **The Funded Room** | `big_throttles` | **$100K Max Single Account Ceiling (No $200K Tier Available)**<br>*Threshold: Firm does not offer any single account above $100K; flat 80% profit split cap even after scaling* | `hard` | `0.82x` |
| **FundedSquad** | `payout_fees` | **21-Day Inactivity Clock Starts on Purchase Date (Not 1st Trade)**<br>*Threshold: Account expires if 1st trade is not placed within 21 days of purchase date* | `hard` | `0.94x` |

---

## 5. Top 5 Deadliest Rule Killers in TEST FIRM

1. **Target: 5% | Daily Loss: 1% Hard Breach | Max Loss: 3% EOD Trailing** (FundingPips): Disabling gains **+0.00% absolute** (0% relative pass rate)
2. **Floating Risk Cap: -1% Hard Breach (Instant Liquidation)** (FundingPips): Disabling gains **+0.00% absolute** (0% relative pass rate)
3. **Instant Free Retry Downgrade Trap (1.5% DL, 3% Trailing DD, 50% Split)** (FundedSquad): Disabling gains **+0.00% absolute** (0% relative pass rate)
4. **Ultra-Tight 4% Max Drawdown & $20K Capital Cap** (Pipstone Capital): Disabling gains **+0.00% absolute** (0% relative pass rate)
5. **15% Single Day Profit Consistency Score Cap** (FundingPips): Disabling gains **+0.00% absolute** (0% relative pass rate)

---

## 6. Model-by-Model Worst-Case Comparison

| Module Lane | Active Constraints | Monte Carlo Pass % | Retained Split % | Daily Breach Buffer | Max DD Buffer |
|---|---|---|---|---|---|
| **Instant Funding (Direct-to-Funded)** | 23 rules | **0.0%** | **10%** | 3 losses | 4 losses |
| **1-Step Standard / Flex** | 9 rules | **32.0%** | **25%** | 5 losses | 10 losses |
| **1-Step Lite / Labs** | 4 rules | **83.6%** | **40%** | 5 losses | 10 losses |
| **2-Step Standard / Flex** | 11 rules | **30.1%** | **25%** | 5 losses | 10 losses |
| **2-Step Lite / Pro** | 4 rules | **85.4%** | **80%** | 5 losses | 10 losses |
| **Big Accounts ($100K–$400K+)** | 9 rules | **84.0%** | **80%** | 5 losses | 10 losses |
| **TEST FIRM (COMBINED)** | **14 rules** | **0.0%** | **20%** | **3 losses** | **4 losses** |

---

## 7. Actionable Execution Protocol
1. **0.50% Maximum Risk Per Trade:** Improves passing rate from 0.0% to 11.8%.
2. **75-Second Minimum Hold:** Avoids Pipstone 20% split slash and account closure.
3. **Mandatory Stop Loss on Every Trade:** Prevents FundedNext 100% profit confiscation.
4. **Dynamic Leverage Cliff (&lt;0.50 lots):** Prevents 1:5 margin squeeze on FundingPips.
5. **Sunday 12-Hour Withdrawal Window:** Set calendar alarms for The Funded Room payout window.
