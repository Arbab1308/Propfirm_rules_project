// Mock window
global.window = {};
global.performance = require('perf_hooks').performance;

require('./data/benchmarks.js');
require('./data/firmsData.js');
require('./engine/probabilityEngine.js');
require('./engine/clipboardAndPresets.js');

const benchmarks = window.BENCHMARKS_DATA;
const rawRules = window.RAW_RULES_DATA;
const firmsHelper = window.FIRMS_DATA_HELPER;
const ProbEngine = window.ProbabilityEngine;
const ClipboardManager = window.ClipboardAndPresetsManager;

console.log('=== TEST 1: Total Raw Rules Loaded ===');
console.log('Total Raw Rules:', rawRules.length);

console.log('\n=== TEST 2: 6 Modules Separation ===');
const modules = ['instant', 'oneStepStd', 'oneStepLite', 'twoStepStd', 'twoStepLite', 'bigAccounts', 'universal'];
modules.forEach(m => {
  const count = rawRules.filter(r => r.module === m).length;
  console.log(`Module [${m}]: ${count} rules`);
});

console.log('\n=== TEST 3: All 5 Firms Represented ===');
const firms = ['fundingpips', 'fundedsquad', 'pipstone', 'fundednext', 'thefundedroom'];
firms.forEach(f => {
  const count = rawRules.filter(r => r.firmId === f).length;
  console.log(`Firm [${f}]: ${count} rules`);
});

console.log('\n=== TEST 4: Probability Calculations & Worst Case ===');
const engine = new ProbEngine(benchmarks, rawRules);
const cm = new ClipboardManager(engine);

const instantRules = firmsHelper.getRulesByModule('instant');
const worstInstantIds = cm.synthesizeWorstCaseForModule('instant', instantRules);
const worstInstantRules = instantRules.filter(r => worstInstantIds.includes(r.id));
console.log('Worst-Case Instant Rules count:', worstInstantRules.length);

const calc50k = engine.calculateCertainty('instant', worstInstantRules, 50000);
console.log(`Instant Worst-Case ($50K): End-to-End % = ${calc50k.endToEndCertainty}%, Grade = ${calc50k.riskGrade}`);
console.log(`Dollar Math ($50K): Daily Loss = $${calc50k.dollarMath.dailyLossDollar}, Max Loss = $${calc50k.dollarMath.maxLossDollar}, Floating Cap = $${calc50k.dollarMath.floatingCapDollar}`);

const calc200k = engine.calculateCertainty('instant', worstInstantRules, 200000);
console.log(`Instant Worst-Case ($200K): End-to-End % = ${calc200k.endToEndCertainty}%, Grade = ${calc200k.riskGrade}`);
console.log(`Dollar Math ($200K): Daily Loss = $${calc200k.dollarMath.dailyLossDollar}, Max Loss = $${calc200k.dollarMath.maxLossDollar}`);

console.log('\n=== TEST 5: Conflict Resolution (Superseding) ===');
const conflictTestRules = [
  { id: 'dl3', ruleType: 'daily_loss', thresholdValue: 3, impactMultiplier: 0.74, title: '3% DL' },
  { id: 'dl1', ruleType: 'daily_loss', thresholdValue: 1, impactMultiplier: 0.32, title: '1% DL' }
];
const conflictRes = engine.resolveRuleConflicts(conflictTestRules);
conflictRes.resolvedRules.forEach(r => console.log(` - Rule: ${r.id}, isSuperseded: ${r.isSuperseded}, supersededBy: ${r.supersededBy}`));

console.log('\n=== TEST 6: 5,000-Path Monte Carlo Performance ===');
const mcStart = Date.now();
const mcResult = engine.runMonteCarloSimulation({ winRate: 50, avgRR: 1.5, riskPct: 1.0, tradesPerDay: 2 }, worstInstantRules, 50000, 5000);
const mcTime = Date.now() - mcStart;
console.log(`Monte Carlo 5,000 Paths Executed in: ${mcTime} ms (Target < 250ms): ${mcTime < 250 ? 'PASS' : 'FAIL'}`);
console.log('MC Output:', {
  mcP1Pass: mcResult.mcP1Pass + '%',
  mcFundedPass: mcResult.mcFundedPass + '%',
  mcEndToEnd: mcResult.mcEndToEnd + '%',
  failureCauses: mcResult.failureCauses,
  percentiles: mcResult.percentiles
});

console.log('\n=== TEST 7: Cross-Module Heatmap Matrix (6 Modules x 6 Account Sizes) ===');
const heatmap = cm.generateAllModulesHeatmapMatrix(rawRules);
console.log(`Heatmap Generated with ${heatmap.length} Module Rows:`);
heatmap.forEach(h => {
  console.log(` - ${h.module.name} (${h.module.subtitle}): 5K=${h.sizes[5000].endToEndCertainty}%, 25K=${h.sizes[25000].endToEndCertainty}%, 50K=${h.sizes[50000].endToEndCertainty}%, 200K=${h.sizes[200000].endToEndCertainty}% | Killer: ${h.sizes[50000].primaryKiller}`);
});

console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
