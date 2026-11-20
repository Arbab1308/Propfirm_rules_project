const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

// Mock browser global environment
global.window = {};
global.performance = performance;
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Load modules
require('../data/benchmarks.js');
require('../data/firmsData.js');
require('../engine/probabilityEngine.js');
require('../engine/clipboardAndEvaluator.js');

const benchmarks = window.BENCHMARKS_DATA;
const rawRules = window.RAW_RULES_DATA;
const firmsHelper = window.FIRMS_DATA_HELPER;
const ProbEngine = window.ProbabilityEngine;
const ClipboardEvaluator = window.ClipboardAndEvaluator;

const engine = new ProbEngine(benchmarks, rawRules);
const cm = new ClipboardEvaluator(engine);

console.log('Synthesizing TEST FIRM - Combining worst rules across Instant, 1-Step, 2-Step, Big Accounts & Universal...');

const modulesList = ['instant', 'oneStepStd', 'twoStepStd', 'bigAccounts', 'universal'];
const allWorstMap = new Map();

modulesList.forEach(mId => {
  const nativeRules = firmsHelper.getRulesByModule(mId);
  const worstIds = cm.synthesizeWorstCaseForModule(mId, nativeRules);
  nativeRules.filter(r => worstIds.includes(r.id)).forEach(r => {
    allWorstMap.set(r.id, r);
  });
});

const rawTestFirmRules = Array.from(allWorstMap.values());
const conflictResolution = engine.resolveRuleConflicts(rawTestFirmRules);
const testFirmRules = conflictResolution.resolvedRules.filter(r => !r.isSuperseded);

console.log('Total TEST FIRM Active Binding Rules:', testFirmRules.length);

// Run 10,000-Path Monte Carlo across multiple Win Rates and Risk levels for TEST FIRM ($50,000 base)
const baseAccountSize = 50000;
const testFirmMC = engine.runMonteCarloSimulation(
  { winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
  testFirmRules,
  baseAccountSize,
  10000
);

const testFirmCertainty = engine.calculateCertainty('instant', testFirmRules, baseAccountSize);
const testFirmPreCheck = engine.calculateAnalyticalPreCheck({ winRate: 50, avgRR: 1.5, riskPct: 1.0 }, testFirmRules, baseAccountSize);
const testFirmEcon = engine.calculateRetainedSplitAndEconomics('instant', testFirmRules, baseAccountSize, testFirmMC.mcEndToEnd);
const testFirmKillers = engine.calculateMarginalRuleImpacts('instant', testFirmRules, baseAccountSize);
const testFirmHeatmap = engine.generateSensitivityHeatmap({ winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2 }, testFirmRules, baseAccountSize);

// Pass Rates across multiple Win Rate benchmarks at 1.5:1 R:R (0.25%, 0.5% & 1.0% Risk)
const wrScenarios = [
  { label: 'Low Win Rate (Trend Follower)', wr: 40, rr: 2.0 },
  { label: 'Baseline Breakeven Margin', wr: 45, rr: 1.5 },
  { label: 'Solid Discretionary Trader', wr: 50, rr: 1.5 },
  { label: 'High Edge Day Trader', wr: 55, rr: 1.5 },
  { label: 'Elite Institutional Scalper', wr: 60, rr: 1.2 },
  { label: 'Hyper-Accurate Mean Reversion', wr: 65, rr: 1.0 }
];

const wrResults = wrScenarios.map(sc => {
  const mcRun1Pct = engine.runMonteCarloSimulation(
    { winRate: sc.wr, avgRR: sc.rr, riskPct: 1.0, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
    testFirmRules,
    baseAccountSize,
    5000
  );
  const mcRunHalfPct = engine.runMonteCarloSimulation(
    { winRate: sc.wr, avgRR: sc.rr, riskPct: 0.5, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
    testFirmRules,
    baseAccountSize,
    5000
  );
  const mcRunQuarterPct = engine.runMonteCarloSimulation(
    { winRate: sc.wr, avgRR: sc.rr, riskPct: 0.25, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
    testFirmRules,
    baseAccountSize,
    5000
  );
  const beWR = (1 / (1 + sc.rr)) * 100;
  const evR = (sc.wr / 100) * sc.rr - (1 - sc.wr / 100);

  return {
    ...sc,
    beWR: beWR.toFixed(1),
    evR: evR.toFixed(2),
    passRate1PctRisk: mcRun1Pct.mcEndToEnd.toFixed(1),
    passRateHalfPctRisk: mcRunHalfPct.mcEndToEnd.toFixed(1),
    passRateQuarterPctRisk: mcRunQuarterPct.mcEndToEnd.toFixed(1),
    p1Pass: mcRunHalfPct.mcP1Pass.toFixed(1),
    fundedPass: mcRunHalfPct.mcFundedPass.toFixed(1)
  };
});

// Passing Rates across Account Sizes ($5K to $200K)
const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000];
const sizeResults = accountSizes.map(sz => {
  const cert = engine.calculateCertainty('instant', testFirmRules, sz);
  const mc = engine.runMonteCarloSimulation(
    { winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
    testFirmRules,
    sz,
    5000
  );
  const dollarMath = cert.dollarMath;
  return {
    size: sz,
    sizeFormatted: '$' + (sz >= 1000 ? (sz / 1000) + 'K' : sz),
    passRateMC: mc.mcEndToEnd.toFixed(1),
    analyticalCert: cert.endToEndCertainty.toFixed(1),
    dailyFloorDollar: '$' + dollarMath.dailyLossDollar.toLocaleString(),
    maxFloorDollar: '$' + dollarMath.maxLossDollar.toLocaleString(),
    floatingCapDollar: '$' + dollarMath.floatingCapDollar.toLocaleString()
  };
});

// Per-Model Comparison breakdown
const modules = [
  { id: 'instant', name: 'Instant Funding (Direct-to-Funded)' },
  { id: 'oneStepStd', name: '1-Step Standard / Flex' },
  { id: 'twoStepStd', name: '2-Step Standard / Flex' },
  { id: 'bigAccounts', name: 'Big Accounts ($100K–$400K+)' }
];

const moduleBreakdowns = modules.map(m => {
  const nativeRules = firmsHelper.getRulesByModule(m.id);
  const worstIds = cm.synthesizeWorstCaseForModule(m.id, nativeRules);
  const worstRules = nativeRules.filter(r => worstIds.includes(r.id));
  const mc = engine.runMonteCarloSimulation(
    { winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2 },
    worstRules,
    baseAccountSize,
    5000
  );
  const econ = engine.calculateRetainedSplitAndEconomics(m.id, worstRules, baseAccountSize, mc.mcEndToEnd);
  const pre = engine.calculateAnalyticalPreCheck({ winRate: 50, avgRR: 1.5, riskPct: 1.0 }, worstRules, baseAccountSize);
  return {
    id: m.id,
    name: m.name,
    rulesCount: worstRules.length,
    mcPass: mc.mcEndToEnd.toFixed(1),
    retainedSplit: econ.effectiveRetainedSplitPct,
    dailyLossLosses: pre.lossesToDailyBreach,
    maxDDLosses: pre.lossesToMaxBreach
  };
});

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Generate the publication HTML
const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TEST FIRM: The Ultimate Worst-Case Prop Trading Challenge - Rules & Probability Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 7.5pt;
        color: #777;
      }
    }

    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.32;
      color: #111111;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4 { margin: 0; font-weight: 700; color: #111111; }
    h1 { font-size: 16pt; letter-spacing: -0.5px; }
    h2 { font-size: 11pt; border-bottom: 1.5px solid #111111; padding-bottom: 3px; margin-top: 12pt; margin-bottom: 6pt; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 9.5pt; margin-top: 8pt; margin-bottom: 4pt; }

    .header-banner {
      border-bottom: 3px solid #B68D40;
      padding-bottom: 6pt;
      margin-bottom: 10pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .badge-firm-header {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #B68D40;
      background: #FAF8F5;
      border: 1px solid #D1C2A5;
      padding: 2px 8px;
      border-radius: 3px;
      display: inline-block;
      margin-bottom: 3pt;
    }
    .report-meta {
      text-align: right;
      font-size: 7.5pt;
      color: #555555;
    }

    /* Executive Scorecard */
    .hero-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6pt;
      margin-bottom: 10pt;
      background: #FAF9F6;
      border: 1px solid #E5DFD5;
      border-radius: 4px;
      padding: 8pt;
    }
    .hero-stat {
      border-right: 1px solid #E5DFD5;
      padding-right: 5pt;
    }
    .hero-stat:last-child { border-right: none; }
    .hero-label {
      font-size: 6.8pt;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #666666;
      margin-bottom: 2pt;
    }
    .hero-val {
      font-size: 15pt;
      font-weight: 800;
      color: #111111;
      line-height: 1.1;
    }
    .hero-val.danger { color: #A61C1C; }
    .hero-val.gold { color: #8A6418; }
    .hero-sub {
      font-size: 6.8pt;
      color: #777777;
      margin-top: 2pt;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 8pt;
    }
    th, td {
      padding: 4pt 5pt;
      text-align: left;
      border-bottom: 1px solid #EAE6DF;
    }
    th {
      background: #F4F1EA;
      font-weight: 700;
      color: #222222;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.5px;
      border-top: 1px solid #DDD7CD;
      border-bottom: 1.5px solid #DDD7CD;
    }
    tr:nth-child(even) td { background: #FCFBF9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Badges */
    .badge {
      display: inline-block;
      font-size: 6.2pt;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .badge-hard { background: #FDE8E8; color: #9B1C1C; border: 1px solid #F8B4B4; }
    .badge-soft { background: #FEF08A; color: #854D0E; border: 1px solid #FDE047; }
    .badge-slash { background: #FFEDD5; color: #9A3412; border: 1px solid #FDBA74; }
    .badge-firm { background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; }

    /* Page Breaks */
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Sensitivity Matrix */
    .heatmap-table th, .heatmap-table td {
      padding: 3pt 3pt;
      font-size: 6.8pt;
      text-align: center;
    }
    .cell-sweet {
      font-weight: 800;
      border: 1.5px solid #065F46 !important;
      background: #D1FAE5 !important;
      color: #065F46 !important;
    }

    .alert-box {
      background: #FFF5F5;
      border-left: 3px solid #E02424;
      padding: 5pt 7pt;
      font-size: 7.2pt;
      color: #771D1D;
      margin-bottom: 8pt;
      border-radius: 0 4px 4px 0;
    }
    .alert-box strong { font-weight: 800; }

    .killer-chip {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 3px;
      padding: 2.5pt 5pt;
      margin-bottom: 2.5pt;
      display: flex;
      justify-content: space-between;
      font-size: 7.2pt;
    }
  </style>
</head>
<body>

  <!-- =========================================================
       PAGE 1: TEST FIRM EXECUTIVE OVERVIEW & WIN / PASS RATES
       ========================================================= -->
  <div class="header-banner">
    <div>
      <div class="badge-firm-header">OFFICIAL AUDIT SPECIFICATION · SYNTHETIC APEX CHALLENGE</div>
      <h1>TEST FIRM: The Ultimate Worst-Case Prop Firm</h1>
      <p style="font-size: 8pt; color: #555; margin-top: 2pt;">
        Full Synthesis of the Strictest Rules across <strong>Instant Funding, 1-Step, 2-Step, Big Accounts & Operational Policies</strong>
      </p>
    </div>
    <div class="report-meta">
      <div><strong>Synthetic Entity:</strong> TEST FIRM</div>
      <div><strong>Monte Carlo Engine:</strong> 10,000 Paths / 50 Trades</div>
      <div><strong>Benchmark Account:</strong> $50,000 Balance</div>
    </div>
  </div>

  <div class="alert-box">
    <strong>EXECUTIVE VERDICT:</strong> <strong>TEST FIRM</strong> synthesizes the most severe, capital-destructive constraints from <strong>FundingPips, FundedSquad, Pipstone Capital, FundedNext, and The Funded Room</strong>. Combining a 2% daily loss limit, 4% live trailing drawdown, -1% floating intraday liquidation, sub-60s nuclear split slashes (20%), mandatory stop loss profit forfeitures, and 15-minute directional locks yields a true end-to-end passing rate of <strong>${testFirmMC.mcEndToEnd.toFixed(2)}%</strong> with an Effective Retained Split of only <strong>${testFirmEcon.effectiveRetainedSplitPct}%</strong>.
  </div>

  <!-- Primary Scorecard -->
  <div class="hero-strip avoid-break">
    <div class="hero-stat">
      <div class="hero-label">TEST FIRM Passing Rate</div>
      <div class="hero-val danger">${testFirmMC.mcEndToEnd.toFixed(2)}%</div>
      <div class="hero-sub">10,000-Path Monte Carlo (Grade: ${testFirmCertainty.riskGrade})</div>
    </div>
    <div class="hero-stat">
      <div class="hero-label">Effective Retained Split</div>
      <div class="hero-val gold">${testFirmEcon.effectiveRetainedSplitPct}%</div>
      <div class="hero-sub">${esc(testFirmEcon.splitSlashReason)}</div>
    </div>
    <div class="hero-stat">
      <div class="hero-label">Break-Even Win Rate</div>
      <div class="hero-val">${testFirmPreCheck.breakEvenWinRatePct}%</div>
      <div class="hero-sub">At 1.5:1 Avg R:R (Edge: +${testFirmPreCheck.edgeOverBreakEven}%)</div>
    </div>
    <div class="hero-stat">
      <div class="hero-label">Consecutive Losses to Breach</div>
      <div class="hero-val danger">${testFirmPreCheck.lossesToDailyBreach} Daily / ${testFirmPreCheck.lossesToMaxBreach} Max</div>
      <div class="hero-sub">At 1.0% Risk / Trade ($50K Account)</div>
    </div>
  </div>

  <!-- SECTION 1: WIN RATE vs. PASSING RATE AUDIT -->
  <h2>1. Win Rate vs. Passing Rate Multi-Scenario Audit (TEST FIRM)</h2>
  <p style="font-size: 7.5pt; color: #555; margin-bottom: 5pt;">
    How strategy win rate, risk-to-reward ratio, and position sizing impact actual passing certainty under TEST FIRM's lethal rule stack:
  </p>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Trader Profile & Strategy</th>
        <th class="text-center">Win Rate %</th>
        <th class="text-center">Avg R:R</th>
        <th class="text-center">Break-Even WR %</th>
        <th class="text-center">Expected EV (R)</th>
        <th class="text-center">Pass Rate (1.0% Risk)</th>
        <th class="text-center" style="background: #FFF3E0; color: #E65100;">Pass Rate (0.5% Risk)</th>
        <th class="text-center" style="background: #E8F5E9; color: #1B5E20; font-weight: 800;">Pass Rate (0.25% Risk)</th>
        <th class="text-center">Phase 1 Pass</th>
        <th class="text-center">Funded Survival</th>
      </tr>
    </thead>
    <tbody>
      ${wrResults.map(r => `
        <tr>
          <td><strong>${esc(r.label)}</strong></td>
          <td class="text-center" style="font-weight: 700;">${r.wr}%</td>
          <td class="text-center">${r.rr}:1</td>
          <td class="text-center" style="color: #666;">${r.beWR}%</td>
          <td class="text-center" style="font-weight: 600; color: ${parseFloat(r.evR) >= 0 ? '#047857' : '#B91C1C'};">${r.evR} R</td>
          <td class="text-center" style="font-weight: 700; color: ${parseFloat(r.passRate1PctRisk) < 10 ? '#A61C1C' : '#047857'};">${r.passRate1PctRisk}%</td>
          <td class="text-center" style="font-weight: 700; background: #FFF8E1; color: #B78103;">${r.passRateHalfPctRisk}%</td>
          <td class="text-center" style="font-weight: 800; background: #F1F8E9; color: #1B5E20;">${r.passRateQuarterPctRisk}%</td>
          <td class="text-center">${r.p1Pass}%</td>
          <td class="text-center">${r.fundedPass}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 2: 5x5 SENSITIVITY HEATMAP -->
  <h3>TEST FIRM 5×5 Sensitivity Grid: Strategy Win Rate % vs. Risk Per Trade %</h3>
  <table class="heatmap-table avoid-break" style="margin-bottom: 8pt;">
    <thead>
      <tr>
        <th style="text-align: left;">Strategy Win Rate</th>
        ${testFirmHeatmap.matrix[0].cells.map(c => `<th>Risk ${c.riskPct.toFixed(2)}%</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${testFirmHeatmap.matrix.map(row => `
        <tr>
          <td style="text-align: left; font-weight: 700;">WR ${row.winRate}%</td>
          ${row.cells.map(c => {
            const isSweet = c.isSweetSpot;
            const bg = isSweet ? '#D1FAE5' : (c.passCertainty < 5 ? '#FEE2E2' : (c.passCertainty < 15 ? '#FEF3C7' : '#E0F2FE'));
            const color = isSweet ? '#065F46' : (c.passCertainty < 5 ? '#991B1B' : (c.passCertainty < 15 ? '#92400E' : '#075985'));
            return `<td style="background: ${bg}; color: ${color}; ${isSweet ? 'font-weight: 800; border: 1.5px solid #065F46;' : ''}">
              ${c.passCertainty.toFixed(1)}%
              ${isSweet ? '<br><span style="font-size: 5pt; text-transform: uppercase;">SWEET SPOT</span>' : ''}
            </td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 3: PASSING RATES ACROSS ACCOUNT SIZES -->
  <h3>Passing Rate & Dollar Thresholds Across Account Sizes ($5K to $200K)</h3>
  <table class="avoid-break" style="margin-bottom: 8pt;">
    <thead>
      <tr>
        <th>Account Size</th>
        <th class="text-center">Monte Carlo Pass Rate</th>
        <th class="text-center">Analytical Certainty</th>
        <th class="text-right">Daily Loss Dollar Limit</th>
        <th class="text-right">Max Trailing DD Dollar</th>
        <th class="text-right">Floating Risk Cap Dollar</th>
      </tr>
    </thead>
    <tbody>
      ${sizeResults.map(s => `
        <tr>
          <td><strong>${s.sizeFormatted} Challenge</strong></td>
          <td class="text-center" style="font-weight: 700; color: ${parseFloat(s.passRateMC) < 15 ? '#A61C1C' : '#047857'};">${s.passRateMC}%</td>
          <td class="text-center">${s.analyticalCert}%</td>
          <td class="text-right" style="color: #A61C1C; font-weight: 600;">-${s.dailyFloorDollar}</td>
          <td class="text-right" style="color: #A61C1C; font-weight: 600;">-${s.maxFloorDollar}</td>
          <td class="text-right" style="color: #C2410C; font-weight: 600;">-${s.floatingCapDollar}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Failure Root Causes & True Costs -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; margin-bottom: 8pt;" class="avoid-break">
    <div style="background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 4px; padding: 6pt;">
      <h3 style="font-size: 7.8pt; text-transform: uppercase; color: #444; border-bottom: 1px solid #DDD; padding-bottom: 2pt; margin-top: 0;">
        Monte Carlo Failure Attribution (Why Traders Fail)
      </h3>
      <table style="margin-bottom: 0;">
        <tbody>
          <tr>
            <td>Intraday Daily Loss Breach (2-3% Floor):</td>
            <td class="text-right" style="font-weight: 700; color: #A61C1C;">${testFirmMC.failureCauses.dailyLoss}%</td>
          </tr>
          <tr>
            <td>Max Drawdown Breach (4% Live Trailing):</td>
            <td class="text-right" style="font-weight: 700; color: #A61C1C;">${testFirmMC.failureCauses.maxDD}%</td>
          </tr>
          <tr>
            <td>Intraday Floating Risk Excursion (-1% Cap):</td>
            <td class="text-right" style="font-weight: 700; color: #C2410C;">${testFirmMC.failureCauses.floatingCap}%</td>
          </tr>
          <tr>
            <td>Consistency Dilution / Locking:</td>
            <td class="text-right" style="font-weight: 700;">${testFirmMC.failureCauses.consistencyCap}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 4px; padding: 6pt;">
      <h3 style="font-size: 7.8pt; text-transform: uppercase; color: #444; border-bottom: 1px solid #DDD; padding-bottom: 2pt; margin-top: 0;">
        Economic Leakage & True Cost to Funded
      </h3>
      <table style="margin-bottom: 0;">
        <tbody>
          <tr>
            <td>Expected Statistical Attempts:</td>
            <td class="text-right" style="font-weight: 700;">${testFirmEcon.expectedAttempts} attempts</td>
          </tr>
          <tr>
            <td>True Capital Outlay Required:</td>
            <td class="text-right" style="font-weight: 700; color: #A61C1C;">\$${testFirmEcon.trueCostToFunded.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Break-Even Payout Cycles:</td>
            <td class="text-right" style="font-weight: 700;">${testFirmEcon.breakEvenCycles} cycles</td>
          </tr>
          <tr>
            <td>Projected 6-Month Median Net PnL:</td>
            <td class="text-right" style="font-weight: 700; color: ${testFirmEcon.medianNet6mDollar >= 0 ? '#047857' : '#B91C1C'};">
              \$${testFirmEcon.medianNet6mDollar.toLocaleString()} (${testFirmEcon.medianNet6mRoiPct}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- =========================================================
       PAGE 2: COMPLETE INVENTORY OF ALL RULES IN TEST FIRM
       ========================================================= -->
  <div class="page-break"></div>
  <div class="header-banner">
    <div>
      <div class="badge-firm-header">TEST FIRM RULEBOOK · FULL ENUMERATION</div>
      <h1>TEST FIRM: Master Rule Inventory (${testFirmRules.length} Binding Rules)</h1>
    </div>
    <div class="report-meta">
      <div>Combined from 5 Prop Firms & 6 Model Lanes</div>
    </div>
  </div>

  <p style="font-size: 7.5pt; color: #555; margin-bottom: 6pt;">
    Every single active rule in <strong>TEST FIRM</strong> is listed below, classified by category with originating firm provenance, exact operational thresholds, breach severity, and mathematical impact multiplier.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Category Bucket</th>
        <th style="width: 38%;">Rule Title & Operational Mechanics</th>
        <th style="width: 15%;">Originating Firm</th>
        <th style="width: 15%;">Breach Penalty</th>
        <th class="text-right" style="width: 14%;">Hazard Multiplier</th>
      </tr>
    </thead>
    <tbody>
      ${testFirmRules.map(r => `
        <tr>
          <td style="font-size: 7pt; font-weight: 600; color: #444;">${esc(r.category.toUpperCase().replace(/_/g, ' '))}</td>
          <td>
            <strong>${esc(r.title)}</strong><br>
            <span style="font-size: 6.8pt; color: #666;">Threshold: ${esc(r.thresholdText || (r.thresholdValue ? r.thresholdValue + '%' : 'Enforced Policy'))}</span><br>
            <span style="font-size: 6.5pt; color: #888;">${esc(r.description || '')}</span>
          </td>
          <td>
            <span class="badge badge-firm">${esc(r.firmName)}</span><br>
            <span style="font-size: 6.2pt; color: #666;">${esc(r.modelName || r.module)}</span>
          </td>
          <td>
            <span class="badge ${r.severity === 'hard' ? 'badge-hard' : (r.severity === 'soft' ? 'badge-soft' : 'badge-slash')}">
              ${r.severity === 'hard' ? 'Hard Breach' : (r.severity === 'soft' ? 'Profit Forfeited' : 'Split Slashed')}
            </span>
          </td>
          <td class="text-right" style="font-weight: 700; color: ${r.impactMultiplier <= 0.6 ? '#991B1B' : (r.impactMultiplier <= 0.8 ? '#B45309' : '#1F2937')};">
            ${r.impactMultiplier.toFixed(2)}x
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Deadliest Rule Killers in TEST FIRM -->
  <h3 style="margin-top: 8pt;">Top 5 Deadliest Rule Killers in TEST FIRM (Marginal Impact Ranking)</h3>
  <div class="avoid-break">
    ${testFirmKillers.slice(0, 5).map((k, idx) => `
      <div class="killer-chip">
        <div>
          <strong>#${idx + 1}: ${esc(k.title)}</strong> (${esc(k.firmName)})
        </div>
        <div style="font-weight: 700; color: #047857;">
          Disabling this rule gains: +${k.deltaCertainty.toFixed(2)}% Absolute (${k.relGainPct}% Relative Pass Certainty)
        </div>
      </div>
    `).join('')}
  </div>

  <!-- =========================================================
       PAGE 3: PER-MODEL WORST-CASE BREAKDOWN & DEFENSE PROTOCOLS
       ========================================================= -->
  <div class="page-break"></div>
  <div class="header-banner">
    <div>
      <div class="badge-firm-header">CROSS-MODEL BREAKDOWN & SURVIVAL PROTOCOL</div>
      <h1>Module Benchmarks & Operational Defense Strategy</h1>
    </div>
    <div class="report-meta">
      <div>Zero-Discretion Execution Protocol</div>
    </div>
  </div>

  <h2>Model-by-Model Worst-Case Benchmark Comparison ($50,000 Base)</h2>
  <table class="avoid-break" style="margin-bottom: 12pt;">
    <thead>
      <tr>
        <th>Module Lane</th>
        <th class="text-center">Active Worst Rules</th>
        <th class="text-center">Monte Carlo Pass Rate</th>
        <th class="text-center">Effective Split %</th>
        <th class="text-center">Consecutive Losses to Daily Breach</th>
        <th class="text-center">Consecutive Losses to Max DD Breach</th>
      </tr>
    </thead>
    <tbody>
      ${moduleBreakdowns.map(m => `
        <tr>
          <td><strong>${esc(m.name)}</strong></td>
          <td class="text-center">${m.rulesCount} rules</td>
          <td class="text-center" style="font-weight: 700; color: ${parseFloat(m.mcPass) < 15 ? '#A61C1C' : '#047857'};">${m.mcPass}%</td>
          <td class="text-center" style="font-weight: 700; color: #8A6418;">${m.retainedSplit}%</td>
          <td class="text-center" style="color: #A61C1C; font-weight: 600;">${m.dailyLossLosses} trades</td>
          <td class="text-center" style="color: #A61C1C; font-weight: 600;">${m.maxDDLosses} trades</td>
        </tr>
      `).join('')}
      <tr style="background: #FFFBEB; font-weight: 700; border-top: 2px solid #B68D40;">
        <td><strong>TEST FIRM (ALL MODELS COMBINED)</strong></td>
        <td class="text-center">${testFirmRules.length} rules</td>
        <td class="text-center" style="color: #A61C1C;">${testFirmMC.mcEndToEnd.toFixed(1)}%</td>
        <td class="text-center" style="color: #8A6418;">${testFirmEcon.effectiveRetainedSplitPct}%</td>
        <td class="text-center" style="color: #A61C1C;">${testFirmPreCheck.lossesToDailyBreach} trades</td>
        <td class="text-center" style="color: #A61C1C;">${testFirmPreCheck.lossesToMaxBreach} trades</td>
      </tr>
    </tbody>
  </table>

  <h2>Actionable Survival Playbook: How to Beat TEST FIRM</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10pt;" class="avoid-break">
    <div style="background: #FAFAF9; border: 1px solid #E2DED6; border-radius: 4px; padding: 8pt;">
      <h3 style="color: #991B1B; margin-top: 0; font-size: 8.5pt;">1. Risk Budgeting & Sizing Invariance</h3>
      <ul style="padding-left: 12pt; margin: 0; font-size: 7.5pt; line-height: 1.45;">
        <li><strong>Fixed Risk at 0.50% Maximum:</strong> With a 2% Daily Loss floor, 1.0% risk leaves only 2 consecutive losses before liquidation. Capping risk at 0.50% gives 4 losses, improving pass rate from ${testFirmMC.mcEndToEnd.toFixed(1)}% to ${wrResults[2].passRateHalfPctRisk}%.</li>
        <li><strong>Intraday MAE Defense:</strong> Pipstone's -1.0% and Squad's -1.5% floating risk caps trigger during open drawdowns. Set hard stop losses at &lt;0.75% of capital to prevent adverse floating excursions from triggering liquidation.</li>
        <li><strong>Dynamic Leverage Cliff (FundingPips):</strong> Never exceed 0.49 lots on Gold (XAUUSD) or Nasdaq (US100); 0.50+ lots collapses leverage instantly to 1:5, triggering instant margin call.</li>
      </ul>

      <h3 style="color: #991B1B; margin-top: 8pt; font-size: 8.5pt;">2. Execution & Holding Window Rules</h3>
      <ul style="padding-left: 12pt; margin: 0; font-size: 7.5pt; line-height: 1.45;">
        <li><strong>Hard 75-Second Minimum Hold:</strong> Both Pipstone and FundedSquad impose nuclear penalties on sub-60s trades (Pipstone slashes split to 20% and closes account). Never close a scalp before 75 seconds.</li>
        <li><strong>15-Minute Reversal Freeze (Pipstone):</strong> After closing any losing trade, enter a mandatory 15-minute freeze before entering the opposite direction.</li>
        <li><strong>Pyramiding Ceiling (The Funded Room):</strong> Never enter more than 2 orders within a 3-minute window to avoid triggering the 4-order HFT trap.</li>
      </ul>
    </div>

    <div style="background: #FAFAF9; border: 1px solid #E2DED6; border-radius: 4px; padding: 8pt;">
      <h3 style="color: #991B1B; margin-top: 0; font-size: 8.5pt;">3. Mandatory Fine-Print Compliance</h3>
      <ul style="padding-left: 12pt; margin: 0; font-size: 7.5pt; line-height: 1.45;">
        <li><strong>Mandatory Hard Stop Loss (FundedNext):</strong> Every single order must have an SL attached. Closing even one winning trade without an SL results in 100% realized profit deduction.</li>
        <li><strong>3% Cumulative Risk Cap (FundedNext):</strong> Total risk across all open positions must never reach 3.0%. A second violation permanently downgrades the account to a 1.0% total risk ceiling.</li>
        <li><strong>Closed-Trade Inactivity Timer:</strong> Open positions do NOT pause the 30-day inactivity clock on FundingPips. Close at least one micro trade every 21 days.</li>
      </ul>

      <h3 style="color: #991B1B; margin-top: 8pt; font-size: 8.5pt;">4. Payout Window & Split Retention</h3>
      <ul style="padding-left: 12pt; margin: 0; font-size: 7.5pt; line-height: 1.45;">
        <li><strong>The 12-Hour Sunday Payout Gate (The Funded Room):</strong> Set alarms for Sunday between 11:59 AM UTC and 11:59 PM UTC. Missing this 12-hour window locks withdrawals for 7 days.</li>
        <li><strong>Asymmetric News Haircut (FundedNext):</strong> Avoid holding across high-impact red-folder news windows (5m before / 5m after). If profitable, 60% of profits are forfeited; if losing, 100% of loss is absorbed.</li>
      </ul>
    </div>
  </div>

  <div style="margin-top: 12pt; border-top: 1px solid #DDD; padding-top: 6pt; font-size: 7pt; color: #777; text-align: center;">
    TEST FIRM Comprehensive Quantitative Risk Audit · 10,000-Path Monte Carlo Engine · 5-Firm Prop Trading Terminal
  </div>

</body>
</html>`;

const outputHtmlPath = path.join(__dirname, '..', 'TEST_FIRM_WORST_CASE_RULES_REPORT.html');
const outputPdfPath = path.join(__dirname, '..', 'TEST_FIRM_WORST_CASE_RULES_REPORT.pdf');
const outputMdPath = path.join(__dirname, '..', 'TEST_FIRM_WORST_CASE_RULES_REPORT.md');

fs.writeFileSync(outputHtmlPath, htmlReport, 'utf8');
console.log('TEST FIRM HTML written to: ' + outputHtmlPath);

// Generate Markdown Version
let md = `# TEST FIRM: The Ultimate Worst-Case Prop Trading Challenge
**Quantitative Risk Memorandum & Passing Certainty Report**
*Firm Name: TEST FIRM | Combined Worst Scenarios: Instant, 1-Step, 2-Step, Big Accounts & Operational Fine Print*

---

## 1. Executive Summary: TEST FIRM Scorecard
- **Firm Name:** \`TEST FIRM\` (Apex Toxic Synthesis)
- **Monte Carlo End-to-End Passing Rate:** \`${testFirmMC.mcEndToEnd.toFixed(2)}%\` (Grade: \`${testFirmCertainty.riskGrade}\`)
- **Effective Retained Profit Split:** \`${testFirmEcon.effectiveRetainedSplitPct}%\` (Reason: \`${testFirmEcon.splitSlashReason}\`)
- **Break-Even Win Rate:** \`${testFirmPreCheck.breakEvenWinRatePct}%\` (at 1.5:1 R:R)
- **Consecutive Losses to Daily Breach:** \`${testFirmPreCheck.lossesToDailyBreach} trades\` (at 1.0% risk)
- **Consecutive Losses to Max DD Breach:** \`${testFirmPreCheck.lossesToMaxBreach} trades\`
- **Expected Challenge Attempts to 1st Payout:** \`${testFirmEcon.expectedAttempts} attempts\`
- **True Capital Required to First Payout:** \`$${testFirmEcon.trueCostToFunded.toLocaleString()}\`

---

## 2. Win Rate vs. Passing Rate Multi-Scenario Audit (TEST FIRM)

| Strategy Profile | Win Rate % | Avg R:R | Break-Even WR % | Expected EV (R) | Pass Rate (1.0% Risk) | Pass Rate (0.5% Risk) | Pass Rate (0.25% Risk) | Phase 1 Pass | Funded Survival |
|---|---|---|---|---|---|---|---|---|---|
${wrResults.map(r => `| **${r.label}** | ${r.wr}% | ${r.rr}:1 | ${r.beWR}% | ${r.evR} R | **${r.passRate1PctRisk}%** | **${r.passRateHalfPctRisk}%** | **${r.passRateQuarterPctRisk}%** | ${r.p1Pass}% | ${r.fundedPass}% |`).join('\n')}

---

## 3. Passing Rates Across Account Sizes ($5K to $200K)

| Account Size | Monte Carlo Pass Rate | Analytical Certainty | Daily Loss Floor ($) | Max Trailing DD ($) | Floating Risk Cap ($) |
|---|---|---|---|---|---|
${sizeResults.map(s => `| **${s.sizeFormatted}** | **${s.passRateMC}%** | ${s.analyticalCert}% | -${s.dailyFloorDollar} | -${s.maxFloorDollar} | -${s.floatingCapDollar} |`).join('\n')}

---

## 4. Master Rule Inventory for TEST FIRM (${testFirmRules.length} Binding Rules)

| Originating Firm | Category | Rule Title & Threshold | Breach Penalty | Multiplier |
|---|---|---|---|---|
${testFirmRules.map(r => `| **${r.firmName}** | \`${r.category}\` | **${r.title}**<br>*Threshold: ${r.thresholdText || (r.thresholdValue ? r.thresholdValue + '%' : 'Strict Constraint')}* | \`${r.severity}\` | \`${r.impactMultiplier.toFixed(2)}x\` |`).join('\n')}

---

## 5. Top 5 Deadliest Rule Killers in TEST FIRM

${testFirmKillers.slice(0, 5).map((k, i) => `${i + 1}. **${k.title}** (${k.firmName}): Disabling gains **+${k.deltaCertainty.toFixed(2)}% absolute** (${k.relGainPct}% relative pass rate)`).join('\n')}

---

## 6. Model-by-Model Worst-Case Comparison

| Module Lane | Active Constraints | Monte Carlo Pass % | Retained Split % | Daily Breach Buffer | Max DD Buffer |
|---|---|---|---|---|---|
${moduleBreakdowns.map(m => `| **${m.name}** | ${m.rulesCount} rules | **${m.mcPass}%** | **${m.retainedSplit}%** | ${m.dailyLossLosses} losses | ${m.maxDDLosses} losses |`).join('\n')}
| **TEST FIRM (COMBINED)** | **${testFirmRules.length} rules** | **${testFirmMC.mcEndToEnd.toFixed(1)}%** | **${testFirmEcon.effectiveRetainedSplitPct}%** | **${testFirmPreCheck.lossesToDailyBreach} losses** | **${testFirmPreCheck.lossesToMaxBreach} losses** |

---

## 7. Actionable Execution Protocol
1. **0.50% Maximum Risk Per Trade:** Improves passing rate from ${testFirmMC.mcEndToEnd.toFixed(1)}% to ${wrResults[2].passRateHalfPctRisk}%.
2. **75-Second Minimum Hold:** Avoids Pipstone 20% split slash and account closure.
3. **Mandatory Stop Loss on Every Trade:** Prevents FundedNext 100% profit confiscation.
4. **Dynamic Leverage Cliff (&lt;0.50 lots):** Prevents 1:5 margin squeeze on FundingPips.
5. **Sunday 12-Hour Withdrawal Window:** Set calendar alarms for The Funded Room payout window.
`;

fs.writeFileSync(outputMdPath, md, 'utf8');
console.log('TEST FIRM Markdown written to: ' + outputMdPath);

// Generate PDF via Microsoft Edge Headless
const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (fs.existsSync(edgeExecutable)) {
  console.log('Printing PDF via Microsoft Edge headless to: ' + outputPdfPath);
  const printCmd = `"${edgeExecutable}" --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=${outputPdfPath}" "${outputHtmlPath}"`;
  try {
    execSync(printCmd, { stdio: 'inherit' });
    console.log('PDF SUCCESSFULLY GENERATED: ' + outputPdfPath);
  } catch (err) {
    console.error('PDF generation error:', err.message);
  }
} else {
  console.error('Edge executable not found at: ' + edgeExecutable);
}
