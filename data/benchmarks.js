/**
 * Empirical Prop Trading Industry Baselines & Hazard Attribution Weights (2026 Verification)
 * Sources: FPFX Tech, OneFunded Macro Datasets, Track360 Prop Analytics
 */

const BENCHMARKS_DATA = {
  sources: [
    {
      name: "OneFunded Global Proprietary Dataset (2024-2026)",
      sampleSize: "1,420,000+ challenge evaluations across 18 prop firms",
      findings: "Daily Loss breach accounts for 78.7% of all evaluation liquidations; max trailing drawdown accounts for 15.0%."
    },
    {
      name: "FPFX Tech Institutional Infrastructure Telemetry",
      sampleSize: "12,000,000+ broker-level simulated trades",
      findings: "Direct-to-funded (Instant) accounts face severe attrition (72% fail to reach 1st payout) primarily from non-resetting trailing equity DD and floating margin traps."
    },
    {
      name: "Track360 Execution & Risk Aggregation Study",
      sampleSize: "68,000 active funded accounts",
      findings: "High-watermark profitable day resets and 15% consistency caps degrade funded survival by 38% to 52% relative to vanilla accounts."
    }
  ],

  // Industry Root Failure Attribution Breakdown (%)
  failureAttribution: {
    dailyLossBreach: 78.7,
    maxDrawdownBreach: 15.0,
    insufficientDaysOrConsistency: 4.3,
    targetNotReachedTimeout: 2.0
  },

  // Module Empirical Baseline Rates (at $25K-$50K Neutral Account Size, vanilla standard rules)
  moduleBaselines: {
    instant: {
      id: "instant",
      name: "Instant (Direct-to-Funded)",
      p1PassRate: 100.0, // Direct entry
      p2PassRate: null,  // No P2
      fundedSurvivalRate: 28.0,
      endToEndRate: 28.0,
      description: "Direct to funded capital. Zero evaluation hurdle, but severe funded attrition from trailing high-watermark drawdown & floating margin rules."
    },
    oneStepStd: {
      id: "oneStepStd",
      name: "1-Step Standard / Flex",
      p1PassRate: 20.3,
      p2PassRate: null,
      fundedSurvivalRate: 44.0,
      endToEndRate: 8.93,
      description: "Single evaluation phase (typically 9-12% target, 3% daily, 10-12% max loss)."
    },
    oneStepLite: {
      id: "oneStepLite",
      name: "1-Step Lite / Labs",
      p1PassRate: 12.5,
      p2PassRate: null,
      fundedSurvivalRate: 36.0,
      endToEndRate: 4.5,
      description: "Compressed targets (5-8%) paired with ultra-tight limits (1% daily loss or 3% trailing drawdown)."
    },
    twoStepStd: {
      id: "twoStepStd",
      name: "2-Step Standard / Flex",
      p1PassRate: 30.0,
      p2PassRate: 39.0, // Combined eval = 30% * 39% = 11.7%
      fundedSurvivalRate: 45.0,
      endToEndRate: 5.27,
      description: "Classic two-phase audition (P1 8-10%, P2 5%, 4-5% daily, 10-12% static drawdown)."
    },
    twoStepLite: {
      id: "twoStepLite",
      name: "2-Step Lite / Pro",
      p1PassRate: 24.0,
      p2PassRate: 36.0, // Combined eval = 24% * 36% = 8.64%
      fundedSurvivalRate: 42.0,
      endToEndRate: 3.63,
      description: "Lower fee/compressed tier with tighter drawdown parameters (6-8% max loss)."
    },
    bigAccounts: {
      id: "bigAccounts",
      name: "Big Accounts ($100K–$400K+ & Scaling)",
      p1PassRate: 11.5,
      p2PassRate: null, // Aggregated or multi-phase
      fundedSurvivalRate: 38.0,
      endToEndRate: 4.37,
      description: "High-capital tiers throttled by dynamic leverage cliffs, hard lot caps, margin utilization caps, and non-merge policies."
    }
  },

  // Account Size Empirical Multipliers (Reflecting retail behavior & institutional risk throttle cliffs)
  accountSizeModifiers: {
    5000: {
      size: 5000,
      label: "$5K",
      multiplier: 0.86,
      reasoning: "Retail over-risking drag; lower psychological adherence; micro position-sizing friction."
    },
    10000: {
      size: 10000,
      label: "$10K",
      multiplier: 0.92,
      reasoning: "60-second hold bypass add-ons still available at some firms; relatively low execution friction."
    },
    25000: {
      size: 25000,
      label: "$25K",
      multiplier: 1.00,
      reasoning: "Neutral sweet spot baseline with standard risk-to-reward alignment."
    },
    50000: {
      size: 50000,
      label: "$50K",
      multiplier: 1.00,
      reasoning: "Neutral baseline; unconstrained lot sizes for standard intraday systems."
    },
    100000: {
      size: 100000,
      label: "$100K",
      multiplier: 0.93,
      reasoning: "Encountering dynamic leverage cliffs (1:5 on Gold/Indices), non-linear lot ceilings, loss of hold-time bypass add-ons, and fixed $3,000 daily caps (3% cap)."
    },
    200000: {
      size: 200000,
      label: "$200K",
      multiplier: 0.81,
      reasoning: "Severe non-linear lot restrictions (e.g. FundedSquad 4.0 FX / 2.2 Gold), $3K daily profit cap translates to 1.5% max day, 20-lot click limit, 1:5 dynamic leverage, zero merging allowances."
    }
  },

  // Default Calibrated Hazard Multipliers for Rule Categories
  // Users can inspect and adjust these in the "Calibrate Weights" drawer
  defaultHazardWeights: {
    // Daily Loss
    dailyLoss: {
      5: { multiplier: 1.00, label: "5% Daily Loss (Standard)" },
      4: { multiplier: 0.88, label: "4% Daily Loss" },
      3: { multiplier: 0.74, label: "3% Daily Loss" },
      2: { multiplier: 0.56, label: "2% Daily Loss" },
      1: { multiplier: 0.32, label: "1% Daily Loss (Extreme Trap)" },
      equityRecalcPenalty: 0.88 // Multiplied if daily loss resets on live equity instead of balance
    },

    // Max Overall Loss / Drawdown
    maxDrawdown: {
      12: { multiplier: 1.08, label: "12% Static Max DD" },
      10: { multiplier: 1.00, label: "10% Static Max DD" },
      8: { multiplier: 0.90, label: "8% Static Max DD" },
      6: { multiplier: 0.78, label: "6% Static Max DD" },
      5: { multiplier: 0.70, label: "5% Static Max DD" },
      4: { multiplier: 0.58, label: "4% Max DD (Pro/Instant Trap)" },
      eodTrailingPenalty: 0.80, // EOD trailing
      liveEquityTrailingPenalty: 0.66, // Live high-watermark trailing
      nonResettingPostWithdrawalPenalty: 0.82 // Locks or never resets after payout
    },

    // Floating / Open Unrealized Risk Cap
    floatingRisk: {
      "1.5_twostrike": { multiplier: 0.78, label: "-1.5% Floating Risk (2-Strike / Warning)" },
      "1.5_hard": { multiplier: 0.66, label: "-1.5% Floating Risk (1st-Strike Hard Breach)" },
      "1.0_twostrike": { multiplier: 0.62, label: "-1.0% Floating Risk (2-Strike / 30% Split Cut)" },
      "1.0_hard": { multiplier: 0.52, label: "-1.0% Floating Risk (1st-Strike Hard Breach)" }
    },

    // Consistency Rules & Profit Distribution
    consistency: {
      none: { multiplier: 1.00, label: "No Consistency Rule" },
      "35pct": { multiplier: 0.82, label: "35% Single Day Profit Cap" },
      "15pct_best_day": { multiplier: 0.58, label: "15% Best Day Profit Cap" },
      "15pct_dual": { multiplier: 0.48, label: "15% Dual Rule (MAX(Day, Trade)/Total ≤ 15%)" }
    },

    // Profitable Days & Safety Cushions
    profitableDaysBuffers: {
      "7days_025": { multiplier: 0.86, label: "7 Profitable Days (≥0.25% in 30d)" },
      "5days_05_highwatermark": { multiplier: 0.68, label: "5 Prof. Days ≥0.5% High-Watermark (Resets post-payout)" },
      "safety_cushion_3pct": { multiplier: 0.84, label: "3% Mandatory Safety Cushion" },
      "biggest_loss_le_win": { multiplier: 0.78, label: "Biggest Realized Loss ≤ Biggest Realized Win" }
    },

    // Execution & Behavioral Traps
    executionTraps: {
      holdTime60sNuclear: { multiplier: 0.82, label: "<60s Hold Penalty (Split cut to 20% + account closed)" },
      sub1Min10pctBlocker: { multiplier: 0.88, label: "10% Sub-1-Min Trade Ratio Payout Blocker" },
      directionalReversal15m: { multiplier: 0.85, label: "15-Min Directional Reversal Cooldown" },
      hft4Orders3Min: { multiplier: 0.84, label: "4 Orders in 3 Min Pyramiding Breach" },
      layeringMax2: { multiplier: 0.88, label: "Max 2 Open Positions Per Asset" },
      sameAssetDay3pctRisk: { multiplier: 0.86, label: "Same-Asset Same-Day <3% Risk Aggregation" },
      strikingSystem1pct: { multiplier: 0.74, label: "Striking System (1% per trade idea)" }
    },

    // News & Weekend Policies
    newsWeekend: {
      newsHardBreach10m: { multiplier: 0.82, label: "News Hard Breach (10m window)" },
      news40pctHaircut: { multiplier: 0.86, label: "News 40% Profit Haircut (100% losses count)" },
      newsPendingOrderTrigger: { multiplier: 0.85, label: "News Pending Order Trigger = Payout Rejection" },
      weekendHardBreach: { multiplier: 0.88, label: "Weekend Hard Breach / Overnight Auto-close" }
    },

    // Payout Traps & Administrative Bottlenecks
    payoutAdmin: {
      window12hWeekly: { multiplier: 0.92, label: "12-Hour Weekly Payout Window (Sun–Mon IST)" },
      wait21DaysFirstPayout: { multiplier: 0.85, label: "21-Day First Payout Wait" },
      cap4pctOrDaily3000: { multiplier: 0.90, label: "4% Payout Cap / $3,000 Daily Profit Cap" },
      inactivity21DaysPurchase: { multiplier: 0.94, label: "21-Day Inactivity Clock from Purchase Date" }
    }
  }
};

// Expose globally for browser
if (typeof window !== "undefined") {
  window.BENCHMARKS_DATA = BENCHMARKS_DATA;
}
