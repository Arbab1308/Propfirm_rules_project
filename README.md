# 5-Firm Prop Trading Modular Rule Checklist, Worst-Case Mixer & Passing Certainty Terminal

An industrial-grade, zero-dependency quantitative analytics terminal and interactive rule checklist covering **5 major prop trading firms**:
1. **FundingPips**
2. **FundedSquad**
3. **Pipstone Capital**
4. **FundedNext**
5. **The Funded Room (The Trade Room)**

---

## Key Features

1. **6 Strictly Separated Module Lanes:**
   - `Instant Funding (Direct-to-Funded)`
   - `1-Step Standard / Flex`
   - `1-Step Lite / Labs`
   - `2-Step Standard / Flex`
   - `2-Step Lite / Pro`
   - `Big Accounts ($100K–$400K+ & Scaling)`
   - *Collapsible Universal Policies & Fine-Print Lane*

2. **1-Click Worst-Case Auto-Mixer & Conflict Resolver:**
   - Synthesize the harshest constraints across all 5 firms in 1 click.
   - Automatically resolves duplicate rules by binding the strictest constraint (e.g., 1.5% daily loss supersedes 4% daily loss).

3. **Cross-Module Rule Clipboard:**
   - Copy any rule or batch of rules from one lane and paste into another without polluting the base datasets.

4. **3-Layer Passing Rate & Payout Certainty Calculator:**
   - **Layer 1 (Strategy Pre-Check):** Break-Even Win Rate, EV per Trade ($ & R), and consecutive losses to breach.
   - **Layer 2 (10,000-Path Monte Carlo):** Realistic R:R outcome variance, intraday adverse excursion (MAE dips against floating caps), static vs. live trailing floors, and consistency dilution.
   - **Layer 3 (Economics & Split Retention):** True Cost to Funded, expected challenge attempts, and **Effective Retained Profit Split %** (accounting for 20%/10% nuclear slashes, news haircuts, and retry downgrades).

5. **5×5 Sensitivity Heatmap & Rule Killer:**
   - Live matrix of Win Rate % vs. Risk per trade %, highlighting the optimal mathematical **Sweet Spot**.
   - Marginal impact inspector showing the exact percentage gain from disabling any killer rule.

6. **Pre-Trade Sandbox & CSV Importer:**
   - **Sandbox Ticket:** Cross-checks trade orders against all 5 firms simultaneously before execution.
   - **CSV Importer:** Drag & drop trade logs to run **10,000 bootstrap resampled Monte Carlo paths**.

---

## Live Demo & Usage

### Option 1: GitHub Pages (Online)
Enable GitHub Pages in repository settings (`Settings` -> `Pages` -> Source: `Deploy from branch main / root`).

### Option 2: Run Locally
Zero dependencies required (pure HTML5, CSS3, Vanilla JS):

```bash
# Using Python
python -m http.server 8085

# Or simply open index.html in any browser
```

### Option 3: Single-File Standalone Version
A completely self-contained version is located in the `single_file_bundle/` directory (`prop_terminal_standalone.html`). It has all CSS, JavaScript engines, and datasets inlined into one file — works 100% offline with zero dependencies!
