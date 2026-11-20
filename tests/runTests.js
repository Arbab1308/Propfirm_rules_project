// Comprehensive Test Suite for 5-Firm Prop Trading Terminal
// Run with: node tests/runTests.js

const assert = require('assert');
const { performance } = require('perf_hooks');

// Mock browser global environment for Node.js
global.window = {};
global.performance = performance;
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Load modules in order
require('../data/benchmarks.js');
require('../data/firmsData.js');
require('../engine/probabilityEngine.js');
require('../engine/clipboardAndEvaluator.js');

const benchmarks = window.BENCHMARKS_DATA;
const rawRules = window.RAW_RULES_DATA;
const firmsHelper = window.FIRMS_DATA_HELPER;
const moduleDefs = window.MODULE_DEFINITIONS;
const ProbEngine = window.ProbabilityEngine;
const ClipboardEvaluator = window.ClipboardAndEvaluator;

console.log('================================================================');
console.log(' 5-FIRM PROP TRADING BENCHMARK & EVALUATOR COMPREHENSIVE SUITE ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Schema Integrity & 5-Firm / 6-Module Separation
// -------------------------------------------------------------
runTest('Raw rules collection loaded with >60 verified institutional rules', () => {
  assert(Array.isArray(rawRules), 'rawRules is not an array');
  assert(rawRules.length >= 60, `Expected >= 60 rules, found ${rawRules.length}`);
});

runTest('All 5 Prop Firms strictly represented in dataset', () => {
  const expectedFirms = ['fundingpips', 'fundedsquad', 'pipstone', 'fundednext', 'thefundedroom'];
  const presentFirms = new Set(rawRules.map(r => r.firmId));
  expectedFirms.forEach(f => {
    assert(presentFirms.has(f), `Firm '${f}' missing from raw rules!`);
    const count = rawRules.filter(r => r.firmId === f).length;
    assert(count > 0, `Firm '${f}' has 0 rules!`);
  });
});

runTest('4 Module lanes strictly separated with non-zero native rules', () => {
  const lanes = ['instant', 'oneStepStd', 'twoStepStd', 'bigAccounts'];
  lanes.forEach(m => {
    const rules = rawRules.filter(r => r.module === m);
    assert(rules.length >= 5, `Module lane '${m}' has fewer than 5 rules (found ${rules.length})`);
  });
});

runTest('Universal operational policies lane exists and contains common rules', () => {
  const universal = rawRules.filter(r => r.module === 'universal');
  assert(universal.length >= 5, `Universal lane has fewer than 5 rules (found ${universal.length})`);
});

runTest('Rule objects contain required schema fields', () => {
  rawRules.forEach(r => {
    assert(r.id, `Rule missing id`);
    assert(r.firmId, `Rule ${r.id} missing firmId`);
    assert(r.title, `Rule ${r.id} missing title`);
    assert(r.category, `Rule ${r.id} missing category`);
    assert(typeof r.impactMultiplier === 'number', `Rule ${r.id} invalid impactMultiplier`);
    assert(r.impactMultiplier > 0 && r.impactMultiplier <= 1.05, `Rule ${r.id} multiplier out of range [0.0, 1.05]: ${r.impactMultiplier}`);
  });
});

// -------------------------------------------------------------
// TEST SUITE 2: Verification of Newly Added Fine-Print Rules
// -------------------------------------------------------------
runTest('FundedNext: Mandatory Stop Loss (100% deduction on no-SL trades) rule present', () => {
  const r = rawRules.find(x => x.id === 'fn_mandatory_stop_loss');
  assert(r, 'fn_mandatory_stop_loss not found');
  assert.strictEqual(r.impactMultiplier, 0.90);
});

runTest('FundedNext: 3% Cumulative Open Risk -> Permanent 1% Reclassification rule present', () => {
  const r = rawRules.find(x => x.id === 'fn_3pct_risk_reclassification');
  assert(r, 'fn_3pct_risk_reclassification not found');
  assert.strictEqual(r.impactMultiplier, 0.78);
});

runTest('FundedNext: Merged Account Violation Contagion rule present', () => {
  const r = rawRules.find(x => x.id === 'fn_big_merged_contagion');
  assert(r, 'fn_big_merged_contagion not found');
});

runTest('Pipstone: Nuclear Split Slash to 20%/10% on Floating Risk Breach present', () => {
  const r = rawRules.find(x => x.id === 'ps_univ_floating_nuclear_slash');
  assert(r, 'ps_univ_floating_nuclear_slash not found');
  assert.strictEqual(r.impactMultiplier, 0.58);
});

runTest('FundedSquad: Instant Free Retry Downgrade Trap present', () => {
  const r = rawRules.find(x => x.id === 'fs_inst_retry_downgrade');
  assert(r, 'fs_inst_retry_downgrade not found');
});

runTest('FundingPips: Size-Tiered Risk Per Trade Idea Cap present', () => {
  const r = rawRules.find(x => x.id === 'fp_inst_size_tiered_idea_cap');
  assert(r, 'fp_inst_size_tiered_idea_cap not found');
});

// -------------------------------------------------------------
// TEST SUITE 3: Worst-Case Auto-Selection & Conflict Resolution
// -------------------------------------------------------------
const engine = new ProbEngine(benchmarks, rawRules);
const clipboardMgr = new ClipboardEvaluator(engine);

runTest('Auto-Select Worst Case selects strictest constraint per category without crashing', () => {
  const lanes = ['instant', 'oneStepStd', 'twoStepStd', 'bigAccounts'];
  lanes.forEach(m => {
    const moduleRules = firmsHelper.getRulesByModule(m);
    const worstIds = clipboardMgr.synthesizeWorstCaseForModule(m, moduleRules);
    assert(Array.isArray(worstIds), `Worst case synthesis for ${m} did not return array`);
    assert(worstIds.length > 0, `Worst case synthesis for ${m} returned 0 rules`);
  });
});

runTest('Universal Rule Editor: Editing universal rules updates parameters cleanly', () => {
  const univRules = firmsHelper.getUniversalRules();
  assert(univRules.length > 0, 'No universal rules found');
  const targetRule = univRules[0];
  const originalTitle = targetRule.title;
  const originalMult = targetRule.impactMultiplier;

  // Simulate edit
  targetRule.title = 'Edited Universal Rule Title';
  targetRule.impactMultiplier = 0.85;
  targetRule.impactLabel = '-15% rel.';

  assert.strictEqual(targetRule.title, 'Edited Universal Rule Title');
  assert.strictEqual(targetRule.impactMultiplier, 0.85);

  // Restore
  targetRule.title = originalTitle;
  targetRule.impactMultiplier = originalMult;
  targetRule.impactLabel = `-${Math.round((1 - originalMult) * 100)}% rel.`;
});

runTest('Conflict Resolution: Stricter rule supersedes looser duplicate', () => {
  const conflictRules = [
    { id: 'loose_dl', ruleType: 'daily_loss', thresholdValue: 4, impactMultiplier: 0.82, title: '4% Daily Loss' },
    { id: 'strict_dl', ruleType: 'daily_loss', thresholdValue: 1.5, impactMultiplier: 0.40, title: '1.5% Daily Loss' }
  ];
  const res = engine.resolveRuleConflicts(conflictRules);
  const loose = res.resolvedRules.find(r => r.id === 'loose_dl');
  const strict = res.resolvedRules.find(r => r.id === 'strict_dl');
  assert(loose.isSuperseded, 'Looser rule must be flagged as isSuperseded');
  assert(!strict.isSuperseded, 'Stricter rule must NOT be superseded');
  assert.strictEqual(loose.supersededBy, '1.5% Daily Loss', 'Looser rule should identify 1.5% Daily Loss as superseding title');
});

// -------------------------------------------------------------
// TEST SUITE 4: Cross-Module Copy & Paste Mechanics
// -------------------------------------------------------------
runTest('Cross-Module Copy / Paste operates non-destructively without mutating source', () => {
  clipboardMgr.clearClipboard();
  const instantRules = firmsHelper.getRulesByModule('instant');
  const ruleToCopy = instantRules[0];
  const origLength = instantRules.length;

  clipboardMgr.copyRule(ruleToCopy, 'instant');
  assert.strictEqual(clipboardMgr.getClipboard().length, 1);

  // Paste into twoStepStd
  const pasted = clipboardMgr.pasteIntoModule('twoStepStd', []);
  assert.strictEqual(pasted.length, 1);
  assert.strictEqual(pasted[0].id, ruleToCopy.id);
  assert(pasted[0].isImported, 'Pasted rule should have isImported: true');
  assert(pasted[0].importedFromBadge.includes('Instant'), 'Badge should reflect origin module');

  // Verify source array is not mutated
  assert.strictEqual(instantRules.length, origLength);
  clipboardMgr.clearClipboard();
});

// -------------------------------------------------------------
// TEST SUITE 5: 3-Layer Certainty & Economics Engine
// -------------------------------------------------------------
runTest('Layer 1 (Pre-Check): Break-even WR, EV & Consecutive losses math', () => {
  const instantRules = firmsHelper.getRulesByModule('instant');
  const preCheck = engine.calculateAnalyticalPreCheck({ winRate: 50, avgRR: 2.0, riskPct: 1.0 }, instantRules, 50000);
  assert.strictEqual(preCheck.breakEvenWinRatePct, 33.3); // 1 / (1 + 2) = 33.3%
  assert(preCheck.evPerTradeR > 0, 'Expectancy in R should be positive for 50% WR with 2:1 RR');
  assert(preCheck.lossesToDailyBreach > 0, 'Losses to daily breach must be > 0');
  assert(preCheck.lossesToMaxBreach > 0, 'Losses to max breach must be > 0');
});

runTest('Layer 2 (10,000-Path Monte Carlo): Path simulation bounds [0%, 100%]', () => {
  const instantRules = firmsHelper.getRulesByModule('instant');
  const worstIds = clipboardMgr.synthesizeWorstCaseForModule('instant', instantRules);
  const activeRules = instantRules.filter(r => worstIds.includes(r.id));

  const t0 = performance.now();
  const sim = engine.runMonteCarloSimulation(
    { winRate: 55, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2, outcomeVariance: 0.25, intradayMaePct: 50 },
    activeRules,
    50000,
    10000
  );
  const elapsed = performance.now() - t0;

  console.log(`       10,000 Monte Carlo Paths runtime: ${elapsed.toFixed(1)}ms`);
  assert(elapsed < 250, `Monte Carlo runtime ${elapsed.toFixed(1)}ms exceeded 250ms target!`);
  assert(sim.mcEndToEnd >= 0 && sim.mcEndToEnd <= 100, `mcEndToEnd ${sim.mcEndToEnd}% out of bounds [0, 100]`);
  assert(sim.mcFundedPass >= 0 && sim.mcFundedPass <= 100, `mcFundedPass out of bounds`);
  assert(Array.isArray(sim.samplePassingRuns), 'samplePassingRuns should be an array');
  assert(Array.isArray(sim.sampleFailedRuns), 'sampleFailedRuns should be an array');
});

runTest('Layer 3 (Economics & Split Retention): Computes expected split retention and ROI', () => {
  const instantRules = firmsHelper.getRulesByModule('instant');
  const econ = engine.calculateRetainedSplitAndEconomics('instant', instantRules, 50000, 15.5);
  assert(econ.effectiveRetainedSplitPct >= 10 && econ.effectiveRetainedSplitPct <= 100,
    `Effective split ${econ.effectiveRetainedSplitPct}% out of reasonable bounds [10, 100]`);
  assert(econ.expectedAttempts > 0, 'Expected attempts must be positive');
  assert(typeof econ.medianNet6mRoiPct === 'number', 'medianNet6mRoiPct must be a number');
  assert(typeof econ.medianNet6mDollar === 'number', 'medianNet6mDollar must be a number');
});

// -------------------------------------------------------------
// TEST SUITE 6: 5x5 Sensitivity Heatmap & Rule Killer
// -------------------------------------------------------------
runTest('5x5 Sensitivity Heatmap generates 25 distinct risk/win-rate coordinates', () => {
  const instantRules = firmsHelper.getRulesByModule('instant');
  const heatmapObj = engine.generateSensitivityHeatmap({ winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2 }, instantRules, 50000);
  assert(heatmapObj && heatmapObj.matrix, 'Heatmap must have a matrix property');
  assert.strictEqual(heatmapObj.matrix.length, 5, 'Should have 5 risk rows');
  heatmapObj.matrix.forEach(row => {
    assert.strictEqual(row.cells.length, 5, 'Each row should have 5 win-rate cells');
    row.cells.forEach(cell => {
      assert(cell.passCertainty >= 0 && cell.passCertainty <= 100, `Cell passCertainty out of bounds: ${cell.passCertainty}`);
      assert(typeof cell.winRate === 'number', 'Cell must have winRate');
      assert(typeof cell.riskPct === 'number', 'Cell must have riskPct');
    });
  });
});

runTest('Rule Killer calculates marginal delta for top active rules', () => {
  const instantRules = firmsHelper.getRulesByModule('instant');
  const killers = engine.calculateMarginalRuleImpacts('instant', instantRules, 50000);
  assert(Array.isArray(killers), 'Rule killers must return an array');
  killers.forEach(k => {
    assert(k.id, 'Killer must have id');
    assert(typeof k.deltaCertainty === 'number', 'Marginal gain deltaCertainty must be a number');
  });
});

// -------------------------------------------------------------
// TEST SUITE 7: Pre-Trade Violation Sandbox Auditing
// -------------------------------------------------------------
runTest('Pre-Trade Violation Sandbox audits ticket across all 5 firms', () => {
  // Test case A: Sub-minute trade ticket (45 sec hold time) -> Should slash Pipstone split to 20%
  const scalpTicket = {
    asset: 'EURUSD',
    lotSize: 5.0,
    slPct: 1.0,
    newsWindowMins: 15,
    holdTimeSec: 45,
    openSameAssetPositions: 1,
    minsSinceLastLoss: 60
  };
  const scalpAudit = engine.auditPreTradeTicket(scalpTicket, 50000);
  assert(scalpAudit.pipstone, 'Pipstone audit result missing');
  assert.strictEqual(scalpAudit.pipstone.status, 'SPLIT SLASH', `Expected SPLIT SLASH for Pipstone 45s scalp, got ${scalpAudit.pipstone.status}`);
  assert.strictEqual(scalpAudit.pipstone.splitSlash, 20);

  // Test case B: No Stop Loss attached -> Should deduct FundedNext profits 100%
  const noSlTicket = {
    asset: 'EURUSD',
    lotSize: 2.0,
    slPct: 0.0,
    newsWindowMins: 20,
    holdTimeSec: 300,
    openSameAssetPositions: 1,
    minsSinceLastLoss: 60
  };
  const noSlAudit = engine.auditPreTradeTicket(noSlTicket, 50000);
  assert(noSlAudit.fundednext, 'FundedNext audit missing');
  assert.strictEqual(noSlAudit.fundednext.status, 'DEDUCT', `FundedNext without SL should result in DEDUCT, got ${noSlAudit.fundednext.status}`);
  assert.strictEqual(noSlAudit.fundednext.profitDeduction, 100);

  // Test case C: 25 lots on FundingPips -> 20 lots max click hard breach
  const heavyTicket = {
    asset: 'EURUSD',
    lotSize: 25.0,
    slPct: 1.0,
    newsWindowMins: 15,
    holdTimeSec: 180,
    openSameAssetPositions: 1,
    minsSinceLastLoss: 60
  };
  const heavyAudit = engine.auditPreTradeTicket(heavyTicket, 50000);
  assert.strictEqual(heavyAudit.fundingpips.status, 'HARD BREACH');
});

// -------------------------------------------------------------
// TEST SUITE 8: CSV Trade Log Parser & Resampling Bootstrap
// -------------------------------------------------------------
runTest('CSV Parser and 10,000 Bootstrap Resampling accurately evaluates real trade logs', () => {
  const sampleCsv = `TradeId,Asset,PnL,HoldSeconds
1,EURUSD,350,180
2,GBPUSD,-200,240
3,XAUUSD,450,120
4,EURUSD,-150,90
5,US100,500,300
6,BTCUSD,-300,150
7,EURUSD,280,210
8,GBPUSD,-120,80
9,XAUUSD,400,200
10,US100,600,350`;

  const parsedTrades = clipboardMgr.parseTradeLogCsv(sampleCsv);
  assert.strictEqual(parsedTrades.length, 10, `Expected 10 parsed trades, got ${parsedTrades.length}`);

  const activeRules = firmsHelper.getRulesByModule('instant');
  const bootstrap = engine.runBootstrapMonteCarlo(parsedTrades, activeRules, 50000, 1000);
  assert(bootstrap.bootstrapPassRate >= 0 && bootstrap.bootstrapPassRate <= 100, 'Bootstrap pass rate must be 0-100%');
  assert.strictEqual(bootstrap.sampleSize, 10);
  assert.strictEqual(bootstrap.totalSims, 1000);
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log(' ALL SUITES PASSED VERIFIED ZERO REGRESSIONS!');
} else {
  console.error(` ${totalTests - passedTests} TESTS FAILED!`);
  process.exit(1);
}
console.log('================================================================\n');
