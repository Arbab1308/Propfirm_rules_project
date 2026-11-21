const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// ==========================================
// 1. UPDATE DATA/BENCHMARKS.JS
// ==========================================
const benchmarksPath = path.join(rootDir, 'data', 'benchmarks.js');
let benchmarksContent = fs.readFileSync(benchmarksPath, 'utf8');

// Add instant1k and instant2k5 to moduleBaselines if not present
if (!benchmarksContent.includes('instant1k: {')) {
  const target = 'moduleBaselines: {';
  const addition = `moduleBaselines: {
    instant1k: {
      id: "instant1k",
      name: "Instant $1K (Exclusive Micro)",
      p1PassRate: 100.0,
      p2PassRate: null,
      fundedSurvivalRate: 22.0,
      endToEndRate: 22.0,
      description: "Exclusive $1,000 Micro Instant Funded Account. No max loss limit, but strict -1.0% ($10.00) floating loss hard cap & 5% first payout cap ($50.00 max)."
    },
    instant2k5: {
      id: "instant2k5",
      name: "Instant $2.5K (Exclusive Starter)",
      p1PassRate: 100.0,
      p2PassRate: null,
      fundedSurvivalRate: 25.0,
      endToEndRate: 25.0,
      description: "Exclusive $2,500 Starter Instant Funded Account. No max loss limit, but strict -1.0% ($25.00) floating loss hard cap & 5% first payout cap ($125.00 max)."
    },`;
  benchmarksContent = benchmarksContent.replace(target, addition);
}

// Add 1000 and 2500 to accountSizeModifiers if not present
if (!benchmarksContent.includes('1000: {')) {
  const target = 'accountSizeModifiers: {';
  const addition = `accountSizeModifiers: {
    1000: {
      size: 1000,
      label: "$1K",
      multiplier: 0.82,
      reasoning: "Micro-capital execution friction, spread-to-stop drag, and strict -1.0% ($10.00) floating drawdown barrier."
    },
    2500: {
      size: 2500,
      label: "$2.5K",
      multiplier: 0.85,
      reasoning: "Starter micro-account sizing friction with strict -1.0% ($25.00) floating loss cap."
    },`;
  benchmarksContent = benchmarksContent.replace(target, addition);
}

fs.writeFileSync(benchmarksPath, benchmarksContent, 'utf8');
console.log('[OK] Updated data/benchmarks.js');

// ==========================================
// 2. UPDATE DATA/FIRMSDATA.JS
// ==========================================
const firmsDataPath = path.join(rootDir, 'data', 'firmsData.js');
let firmsDataContent = fs.readFileSync(firmsDataPath, 'utf8');

// Update MODULE_DEFINITIONS
if (!firmsDataContent.includes('id: "instant1k"')) {
  const modDefTarget = `const MODULE_DEFINITIONS = [
  { id: "instant", name: "Instant", subtitle: "Direct-to-Funded", badge: "Direct Entry" },`;
  
  const modDefReplacement = `const MODULE_DEFINITIONS = [
  { id: "instant", name: "Instant", subtitle: "Direct-to-Funded", badge: "Direct Entry" },
  { id: "instant1k", name: "Instant $1K", subtitle: "Exclusive $1K Micro", badge: "Exclusive $1K" },
  { id: "instant2k5", name: "Instant $2.5K", subtitle: "Exclusive $2.5K Starter", badge: "Exclusive $2.5K" },`;
  
  firmsDataContent = firmsDataContent.replace(modDefTarget, modDefReplacement);
}

// New Rules for instant1k and instant2k5
const newExclusiveRules = `
  // ==========================================
  // MODULE: EXCLUSIVE $1K INSTANT MODEL
  // ==========================================

  // --- FundingPips Instant $1K Exclusive ---
  {
    id: "fp_1k_no_max_loss",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "Zero cumulative max loss limit. Account is never breached on overall drawdown as long as daily and floating limits are respected",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Traders enjoy unconstrained downside cushion across trading days with no lifetime trailing or static max loss cutoff.",
    defaultChecked: true
  },
  {
    id: "fp_1k_flt_1pct",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($10.00 on $1K) - Instant Breach",
    thresholdText: "Combined unrealized floating loss strictly cannot exceed -1.0% ($10.00 max open floating loss) at any time - Instant Hard Breach",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Unrealized adverse drawdown dips beyond -$10.00 trigger instant account liquidation and breach regardless of take-profit placement.",
    defaultChecked: true
  },
  {
    id: "fp_1k_payout_cap",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($50.00 Limit)",
    thresholdText: "Maximum allowable withdrawal strictly capped at 5% on 1st payout cycle ($50.00 maximum payout on $1K capital)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "First withdrawal is capped at $50.00; excess profits roll over or are subjected to dilution across subsequent cycles.",
    defaultChecked: true
  },
  {
    id: "fp_1k_split_payout",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_terms",
    thresholdValue: 80.0,
    title: "80% Base Profit Split (Bi-Weekly 14-Day Cycle)",
    thresholdText: "80% default trader payout split on eligible net profit with bi-weekly payout frequency",
    severity: "soft",
    isWorstCase: false,
    impactMultiplier: 0.95,
    impactLabel: "-5% rel.",
    impactStage: "funded",
    description: "Trader retains 80% of net profits above initial balance subject to consistency and minimum days criteria.",
    defaultChecked: true
  },
  {
    id: "fp_1k_dl",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "daily_loss",
    thresholdValue: 3.0,
    title: "Daily Loss Limit: 3% ($30.00 on $1K)",
    thresholdText: "3% Daily Loss calculated against higher of start-of-day balance or equity ($30.00 max daily loss)",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.74,
    impactLabel: "-26% rel.",
    impactStage: "both",
    description: "Daily loss recalculates upward if equity is higher than balance at 00:00 UTC rollover.",
    defaultChecked: true
  },
  {
    id: "fp_1k_min_days",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "consistency_buffer",
    ruleType: "profitable_days",
    thresholdValue: 5,
    title: "5 Minimum Profitable Days (>=0.5% move / $5.00)",
    thresholdText: "5 distinct trading days with at least 0.5% ($5.00) net gain required prior to 1st payout",
    severity: "soft",
    isWorstCase: false,
    impactMultiplier: 0.92,
    impactLabel: "-8% rel.",
    impactStage: "funded",
    description: "Requires minimum 5 profitable sessions to verify trading consistency before processing first withdrawal.",
    defaultChecked: false
  },
  {
    id: "fp_1k_consistency",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "consistency_buffer",
    ruleType: "consistency",
    thresholdValue: 20,
    title: "20% Single-Day Profit Consistency Cap",
    thresholdText: "No single trading day may represent more than 20% of total profit at withdrawal request",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.88,
    impactLabel: "-12% rel.",
    impactStage: "funded",
    description: "Windfall profits on a single day force the trader to continue trading until total profits dilute the peak day below 20%.",
    defaultChecked: false
  },
  {
    id: "fp_1k_hold_time",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "execution_news",
    ruleType: "hold_time",
    thresholdValue: 60,
    title: "60-Second Minimum Trade Hold Time",
    thresholdText: "Positions closed under 60 seconds are deemed high-frequency scalping and subject to profit cancellation",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.92,
    impactLabel: "-8% rel.",
    impactStage: "both",
    description: "Sub-minute ticks are disqualified and profits deducted from balance.",
    defaultChecked: false
  },
  {
    id: "fp_1k_news",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "execution_news",
    ruleType: "news",
    thresholdValue: 3,
    title: "High-Impact News Trading Restriction (3m Window)",
    thresholdText: "Trades executed within 3 minutes before/after high-impact economic releases have profits cancelled",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.90,
    impactLabel: "-10% rel.",
    impactStage: "both",
    description: "Strict 3-minute blackout window around red-folder economic releases.",
    defaultChecked: false
  },
  {
    id: "fp_1k_lot_throttle",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $1K Exclusive",
    module: "instant1k",
    category: "big_throttles",
    ruleType: "execution_trap",
    thresholdValue: 0.5,
    title: "Micro Position Sizing Cap: 0.50 Lots Max",
    thresholdText: "Total aggregate open position volume capped at 0.50 lots across all symbols on $1K capital",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.94,
    impactLabel: "-6% rel.",
    impactStage: "both",
    description: "Prevents overleveraging on micro-capital accounts.",
    defaultChecked: false
  },

  // --- FundedSquad Instant $1K Exclusive ---
  {
    id: "fs_1k_no_max_loss",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $1K Micro Direct",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall maximum loss limit or cumulative static/trailing drawdown barrier",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "FundedSquad micro direct has no cumulative max loss barrier; only daily loss and floating loss apply.",
    defaultChecked: false
  },
  {
    id: "fs_1k_flt_1pct",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $1K Micro Direct",
    module: "instant1k",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss 1.0% ($10 on $1K): 1st = Forced Close + Slashed 30% Split, 2nd = Breach",
    thresholdText: "Floating drawdown touching -1.0% ($10.00): 1st violation forces position closure & slashes payout split to 30%; 2nd violation is hard termination",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.50,
    impactLabel: "-50% rel.",
    impactStage: "both",
    description: "Two-strike floating penalty: 1st offense forces positions closed and reduces payout split to 30%; 2nd offense terminates account.",
    defaultChecked: false
  },
  {
    id: "fs_1k_payout_cap",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $1K Micro Direct",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($50.00 on $1K)",
    thresholdText: "Maximum payout capped at 5% of starting capital on 1st withdrawal cycle ($50.00 max payout)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "First withdrawal cannot exceed $50.00. Subsequent cycles unlock standard withdrawal terms.",
    defaultChecked: false
  },
  {
    id: "fs_1k_daily_loss",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $1K Micro Direct",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "daily_loss",
    thresholdValue: 2.5,
    title: "Daily Loss Limit: 2.5% ($25.00 on $1K)",
    thresholdText: "2.5% Daily Loss limit ($25.00) calculated against start-of-day balance",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.68,
    impactLabel: "-32% rel.",
    impactStage: "both",
    description: "Hard daily cutoff at -$25.00 loss in any single server day.",
    defaultChecked: false
  },

  // --- Pipstone Instant $1K Exclusive ---
  {
    id: "ps_1k_no_max_loss",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $1K Instant",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall maximum drawdown cutoff or cumulative loss barrier",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Pipstone $1K micro tier removes the cumulative max drawdown limit completely.",
    defaultChecked: false
  },
  {
    id: "ps_1k_flt_1pct",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $1K Instant",
    module: "instant1k",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($10 on $1K) = Nuclear 20% Split Slash + Closure",
    thresholdText: "Floating drawdown touching -1.0% ($10.00) slashes profit split to 20% and closes all positions immediately",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.45,
    impactLabel: "-55% rel.",
    impactStage: "both",
    description: "Nuclear floating risk penalty immediately liquidates active tickets and slashes profit split down to 20%.",
    defaultChecked: false
  },
  {
    id: "ps_1k_payout_cap",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $1K Instant",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($50.00 on $1K)",
    thresholdText: "First withdrawal cycle strictly capped at 5% ($50.00 limit)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "Initial withdrawal limited to $50.00.",
    defaultChecked: false
  },

  // --- FundedNext Instant $1K Exclusive ---
  {
    id: "fn_1k_no_max_loss",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $1K Stellar Instant",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall cumulative max loss limit. Zero lifetime drawdown breach",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Exclusively eliminates the cumulative max drawdown rule on the $1K micro account.",
    defaultChecked: false
  },
  {
    id: "fn_1k_flt_1pct",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $1K Stellar Instant",
    module: "instant1k",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($10.00 on $1K) - Hard Breach",
    thresholdText: "Floating unrealized equity loss strictly cannot exceed -1.0% ($10.00) at any millisecond - Hard Breach",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Hard breach triggered if floating equity drops -$10.00 below start-of-day balance.",
    defaultChecked: false
  },
  {
    id: "fn_1k_payout_cap",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $1K Stellar Instant",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($50.00 on $1K)",
    thresholdText: "Maximum 1st payout capped at 5% of starting capital ($50.00 limit)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "Trader may withdraw at most $50.00 on cycle 1.",
    defaultChecked: false
  },

  // --- The Funded Room Instant $1K Exclusive ---
  {
    id: "tfr_1k_no_max_loss",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $1K Micro Direct",
    module: "instant1k",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "Zero cumulative drawdown limit. Account never terminates on overall lifetime loss",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Lifetime maximum drawdown limit is eliminated on $1K micro tier.",
    defaultChecked: false
  },
  {
    id: "tfr_1k_flt_1pct",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $1K Micro Direct",
    module: "instant1k",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($10.00 on $1K) - Hard Breach",
    thresholdText: "Unrealized floating loss strictly capped at -1.0% ($10.00) - Instant Account Liquidation",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Instant liquidation if floating open positions drop -$10.00.",
    defaultChecked: false
  },
  {
    id: "tfr_1k_payout_cap",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $1K Micro Direct",
    module: "instant1k",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($50.00 on $1K) + 12-Hour Sunday Payout Window",
    thresholdText: "First payout capped at 5% ($50.00) and request must be submitted during 12-hour Sunday window (USDT)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.82,
    impactLabel: "-18% rel.",
    impactStage: "funded",
    description: "Combines 5% first withdrawal ceiling ($50.00) with strict Sunday 11:59 PM - Monday 12:00 PM IST window.",
    defaultChecked: false
  },

  // ==========================================
  // MODULE: EXCLUSIVE $2.5K INSTANT MODEL
  // ==========================================

  // --- FundingPips Instant $2.5K Exclusive ---
  {
    id: "fp_2k5_no_max_loss",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "Zero cumulative max loss limit. Account is never breached on overall drawdown as long as daily and floating limits are respected",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Traders enjoy unconstrained downside cushion across trading days with no lifetime trailing or static max loss cutoff.",
    defaultChecked: true
  },
  {
    id: "fp_2k5_flt_1pct",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($25.00 on $2.5K) - Instant Breach",
    thresholdText: "Combined unrealized floating loss strictly cannot exceed -1.0% ($25.00 max open floating loss) at any time - Instant Hard Breach",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Unrealized adverse drawdown dips beyond -$25.00 trigger instant account liquidation and breach regardless of take-profit placement.",
    defaultChecked: true
  },
  {
    id: "fp_2k5_payout_cap",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($125.00 Limit)",
    thresholdText: "Maximum allowable withdrawal strictly capped at 5% on 1st payout cycle ($125.00 maximum payout on $2.5K capital)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "First withdrawal is capped at $125.00; excess profits roll over or are subjected to dilution across subsequent cycles.",
    defaultChecked: true
  },
  {
    id: "fp_2k5_split_payout",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_terms",
    thresholdValue: 80.0,
    title: "80% Base Profit Split (Bi-Weekly 14-Day Cycle)",
    thresholdText: "80% default trader payout split on eligible net profit with bi-weekly payout frequency",
    severity: "soft",
    isWorstCase: false,
    impactMultiplier: 0.95,
    impactLabel: "-5% rel.",
    impactStage: "funded",
    description: "Trader retains 80% of net profits above initial balance subject to consistency and minimum days criteria.",
    defaultChecked: true
  },
  {
    id: "fp_2k5_dl",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "daily_loss",
    thresholdValue: 3.0,
    title: "Daily Loss Limit: 3% ($75.00 on $2.5K)",
    thresholdText: "3% Daily Loss calculated against higher of start-of-day balance or equity ($75.00 max daily loss)",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.74,
    impactLabel: "-26% rel.",
    impactStage: "both",
    description: "Daily loss recalculates upward if equity is higher than balance at 00:00 UTC rollover.",
    defaultChecked: true
  },
  {
    id: "fp_2k5_min_days",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "consistency_buffer",
    ruleType: "profitable_days",
    thresholdValue: 5,
    title: "5 Minimum Profitable Days (>=0.5% move / $12.50)",
    thresholdText: "5 distinct trading days with at least 0.5% ($12.50) net gain required prior to 1st payout",
    severity: "soft",
    isWorstCase: false,
    impactMultiplier: 0.92,
    impactLabel: "-8% rel.",
    impactStage: "funded",
    description: "Requires minimum 5 profitable sessions to verify trading consistency before processing first withdrawal.",
    defaultChecked: false
  },
  {
    id: "fp_2k5_consistency",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "consistency_buffer",
    ruleType: "consistency",
    thresholdValue: 20,
    title: "20% Single-Day Profit Consistency Cap",
    thresholdText: "No single trading day may represent more than 20% of total profit at withdrawal request",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.88,
    impactLabel: "-12% rel.",
    impactStage: "funded",
    description: "Windfall profits on a single day force the trader to continue trading until total profits dilute the peak day below 20%.",
    defaultChecked: false
  },
  {
    id: "fp_2k5_hold_time",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "execution_news",
    ruleType: "hold_time",
    thresholdValue: 60,
    title: "60-Second Minimum Trade Hold Time",
    thresholdText: "Positions closed under 60 seconds are deemed high-frequency scalping and subject to profit cancellation",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.92,
    impactLabel: "-8% rel.",
    impactStage: "both",
    description: "Sub-minute ticks are disqualified and profits deducted from balance.",
    defaultChecked: false
  },
  {
    id: "fp_2k5_news",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "execution_news",
    ruleType: "news",
    thresholdValue: 3,
    title: "High-Impact News Trading Restriction (3m Window)",
    thresholdText: "Trades executed within 3 minutes before/after high-impact economic releases have profits cancelled",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.90,
    impactLabel: "-10% rel.",
    impactStage: "both",
    description: "Strict 3-minute blackout window around red-folder economic releases.",
    defaultChecked: false
  },
  {
    id: "fp_2k5_lot_throttle",
    firmId: "fundingpips",
    firmName: "FundingPips",
    modelName: "Instant $2.5K Exclusive",
    module: "instant2k5",
    category: "big_throttles",
    ruleType: "execution_trap",
    thresholdValue: 1.25,
    title: "Starter Position Sizing Cap: 1.25 Lots Max",
    thresholdText: "Total aggregate open position volume capped at 1.25 lots across all symbols on $2.5K capital",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.94,
    impactLabel: "-6% rel.",
    impactStage: "both",
    description: "Limits aggregate exposure on starter accounts.",
    defaultChecked: false
  },

  // --- FundedSquad Instant $2.5K Exclusive ---
  {
    id: "fs_2k5_no_max_loss",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $2.5K Starter Direct",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall maximum loss limit or cumulative static/trailing drawdown barrier",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "FundedSquad starter direct has no cumulative max loss barrier; only daily loss and floating loss apply.",
    defaultChecked: false
  },
  {
    id: "fs_2k5_flt_1pct",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $2.5K Starter Direct",
    module: "instant2k5",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss 1.0% ($25 on $2.5K): 1st = Forced Close + Slashed 30% Split, 2nd = Breach",
    thresholdText: "Floating drawdown touching -1.0% ($25.00): 1st violation forces position closure & slashes payout split to 30%; 2nd violation is hard termination",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.50,
    impactLabel: "-50% rel.",
    impactStage: "both",
    description: "Two-strike floating penalty: 1st offense forces positions closed and reduces payout split to 30%; 2nd offense terminates account.",
    defaultChecked: false
  },
  {
    id: "fs_2k5_payout_cap",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $2.5K Starter Direct",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($125.00 on $2.5K)",
    thresholdText: "Maximum payout capped at 5% of starting capital on 1st withdrawal cycle ($125.00 max payout)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "First withdrawal cannot exceed $125.00. Subsequent cycles unlock standard withdrawal terms.",
    defaultChecked: false
  },
  {
    id: "fs_2k5_daily_loss",
    firmId: "fundedsquad",
    firmName: "FundedSquad",
    modelName: "Squad $2.5K Starter Direct",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "daily_loss",
    thresholdValue: 2.5,
    title: "Daily Loss Limit: 2.5% ($62.50 on $2.5K)",
    thresholdText: "2.5% Daily Loss limit ($62.50) calculated against start-of-day balance",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.68,
    impactLabel: "-32% rel.",
    impactStage: "both",
    description: "Hard daily cutoff at -$62.50 loss in any single server day.",
    defaultChecked: false
  },

  // --- Pipstone Instant $2.5K Exclusive ---
  {
    id: "ps_2k5_no_max_loss",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $2.5K Instant",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall maximum drawdown cutoff or cumulative loss barrier",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Pipstone $2.5K starter tier removes the cumulative max drawdown limit completely.",
    defaultChecked: false
  },
  {
    id: "ps_2k5_flt_1pct",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $2.5K Instant",
    module: "instant2k5",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($25 on $2.5K) = Nuclear 20% Split Slash + Closure",
    thresholdText: "Floating drawdown touching -1.0% ($25.00) slashes profit split to 20% and closes all positions immediately",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.45,
    impactLabel: "-55% rel.",
    impactStage: "both",
    description: "Nuclear floating risk penalty immediately liquidates active tickets and slashes profit split down to 20%.",
    defaultChecked: false
  },
  {
    id: "ps_2k5_payout_cap",
    firmId: "pipstone",
    firmName: "Pipstone Capital",
    modelName: "Pipstone $2.5K Instant",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($125.00 on $2.5K)",
    thresholdText: "First withdrawal cycle strictly capped at 5% ($125.00 limit)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "Initial withdrawal limited to $125.00.",
    defaultChecked: false
  },

  // --- FundedNext Instant $2.5K Exclusive ---
  {
    id: "fn_2k5_no_max_loss",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $2.5K Stellar Instant",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "No overall cumulative max loss limit. Zero lifetime drawdown breach",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Exclusively eliminates the cumulative max drawdown rule on the $2.5K starter account.",
    defaultChecked: false
  },
  {
    id: "fn_2k5_flt_1pct",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $2.5K Stellar Instant",
    module: "instant2k5",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($25.00 on $2.5K) - Hard Breach",
    thresholdText: "Floating unrealized equity loss strictly cannot exceed -1.0% ($25.00) at any millisecond - Hard Breach",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Hard breach triggered if floating equity drops -$25.00 below start-of-day balance.",
    defaultChecked: false
  },
  {
    id: "fn_2k5_payout_cap",
    firmId: "fundednext",
    firmName: "FundedNext",
    modelName: "FundedNext $2.5K Stellar Instant",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($125.00 on $2.5K)",
    thresholdText: "Maximum 1st payout capped at 5% of starting capital ($125.00 limit)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.85,
    impactLabel: "-15% rel.",
    impactStage: "funded",
    description: "Trader may withdraw at most $125.00 on cycle 1.",
    defaultChecked: false
  },

  // --- The Funded Room Instant $2.5K Exclusive ---
  {
    id: "tfr_2k5_no_max_loss",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $2.5K Starter Direct",
    module: "instant2k5",
    category: "targets_dd",
    ruleType: "no_max_loss",
    thresholdValue: 0,
    title: "No Max Loss Limit (Zero Cumulative Drawdown Barrier)",
    thresholdText: "Zero cumulative drawdown limit. Account never terminates on overall lifetime loss",
    severity: "safe",
    isWorstCase: false,
    impactMultiplier: 1.0,
    impactLabel: "Safe",
    impactStage: "both",
    description: "Lifetime maximum drawdown limit is eliminated on $2.5K starter tier.",
    defaultChecked: false
  },
  {
    id: "tfr_2k5_flt_1pct",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $2.5K Starter Direct",
    module: "instant2k5",
    category: "intraday_floating",
    ruleType: "floating_risk",
    thresholdValue: 1.0,
    title: "Floating Loss Hard Cap: -1.0% ($25.00 on $2.5K) - Hard Breach",
    thresholdText: "Unrealized floating loss strictly capped at -1.0% ($25.00) - Instant Account Liquidation",
    severity: "hard",
    isWorstCase: true,
    impactMultiplier: 0.52,
    impactLabel: "-48% rel.",
    impactStage: "both",
    description: "Instant liquidation if floating open positions drop -$25.00.",
    defaultChecked: false
  },
  {
    id: "tfr_2k5_payout_cap",
    firmId: "thefundedroom",
    firmName: "The Funded Room",
    modelName: "TFR $2.5K Starter Direct",
    module: "instant2k5",
    category: "payout_fees",
    ruleType: "payout_cap",
    thresholdValue: 5.0,
    title: "First Payout Cap: 5% Max ($125.00 on $2.5K) + 12-Hour Sunday Payout Window",
    thresholdText: "First payout capped at 5% ($125.00) and request must be submitted during 12-hour Sunday window (USDT)",
    severity: "soft",
    isWorstCase: true,
    impactMultiplier: 0.82,
    impactLabel: "-18% rel.",
    impactStage: "funded",
    description: "Combines 5% first withdrawal ceiling ($125.00) with strict Sunday 11:59 PM - Monday 12:00 PM IST window.",
    defaultChecked: false
  },
`;

if (!firmsDataContent.includes('id: "fp_1k_no_max_loss"')) {
  const insertionPoint = '  // ==========================================\n  // UNIVERSAL / OPERATIONAL POLICIES';
  firmsDataContent = firmsDataContent.replace(insertionPoint, newExclusiveRules + '\n' + insertionPoint);
}

fs.writeFileSync(firmsDataPath, firmsDataContent, 'utf8');
console.log('[OK] Updated data/firmsData.js');

// ==========================================
// 3. UPDATE INDEX.HTML
// ==========================================
const indexPath = path.join(rootDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

if (!indexContent.includes('data-size="1000"')) {
  const sizePillsTarget = '<div class="size-pills" id="sizePillsContainer">\n            <button class="size-pill-btn" data-size="5000">$5K</button>';
  const sizePillsReplacement = '<div class="size-pills" id="sizePillsContainer">\n            <button class="size-pill-btn" data-size="1000">$1K</button>\n            <button class="size-pill-btn" data-size="2500">$2.5K</button>\n            <button class="size-pill-btn" data-size="5000">$5K</button>';
  indexContent = indexContent.replace(sizePillsTarget, sizePillsReplacement);
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('[OK] Updated index.html');
}

// ==========================================
// 4. UPDATE ENGINE/CLIPBOARDANDEVALUATOR.JS
// ==========================================
const clipboardPath = path.join(rootDir, 'engine', 'clipboardAndEvaluator.js');
let clipboardContent = fs.readFileSync(clipboardPath, 'utf8');

if (!clipboardContent.includes('1000, 2500, 5000')) {
  clipboardContent = clipboardContent.replace(
    'const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000];',
    'const accountSizes = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 200000];'
  );
  fs.writeFileSync(clipboardPath, clipboardContent, 'utf8');
  console.log('[OK] Updated engine/clipboardAndEvaluator.js');
}

console.log('[ALL DATA UPDATES COMPLETED SUCCESSFULLY]');
