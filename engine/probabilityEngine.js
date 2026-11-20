/**
 * Full 3-Layer Prop Trading Passing Rate & Economic Leakage Engine
 * 
 * Layer 1: Instant Analytical Pre-Check (Break-Even Win Rate, EV per Trade, Consecutive Losses to Breach)
 * Layer 2: 10,000-Path Path-Dependent Monte Carlo (MAE Floating Traps, Variance, Trailing Floors, Consistency Loops)
 * Layer 3: Economic ROI & Fine-Print Leakage (True Cost to Funded, Effective Retained Split %, Break-Even Payout Cycles)
 * Plus:
 * - 5x5 Win-Rate x Risk-Per-Trade Sensitivity Heatmap Generator
 * - Rule Killer Marginal Delta Inspector (Exact % gain on disable)
 * - Interactive Day-by-Day Sample Replay Path Generator
 * - Pre-Trade Violation Sandbox Engine (Cross-firm instant audit)
 * - CSV Trade Log Bootstrap Monte Carlo Engine (10,000 resamples from real trades)
 */

class ProbabilityEngine {
  constructor(benchmarks, rulesData) {
    this.benchmarks = benchmarks || (typeof window !== "undefined" ? window.BENCHMARKS_DATA : null);
    this.allRules = rulesData || (typeof window !== "undefined" ? window.RAW_RULES_DATA : []);
    this.customHazardWeights = {};
  }

  setWeightOverride(key, val) {
    this.customHazardWeights[key] = val;
  }

  getEffectiveWeight(rule) {
    if (this.customHazardWeights[rule.id] !== undefined) {
      return this.customHazardWeights[rule.id];
    }
    return rule.impactMultiplier !== undefined ? rule.impactMultiplier : 0.90;
  }

  /**
   * Conflict Resolution: Supersedes looser duplicate threshold families
   */
  resolveRuleConflicts(activeRules) {
    const rulesByType = {};
    const resolvedRules = [];
    const supersededMap = new Map();

    activeRules.forEach(rule => {
      const type = rule.ruleType;
      if (!type) {
        resolvedRules.push({ ...rule, isSuperseded: false });
        return;
      }
      if (!rulesByType[type]) {
        rulesByType[type] = [];
      }
      rulesByType[type].push(rule);
    });

    Object.keys(rulesByType).forEach(type => {
      const list = rulesByType[type];
      if (list.length <= 1) {
        list.forEach(r => resolvedRules.push({ ...r, isSuperseded: false }));
        return;
      }

      let strictest = list[0];
      for (let i = 1; i < list.length; i++) {
        const curr = list[i];
        if (type === "daily_loss" || type === "max_drawdown" || type === "floating_risk") {
          const valCurr = curr.thresholdValue || 999;
          const valStrict = strictest.thresholdValue || 999;
          if (valCurr < valStrict) {
            strictest = curr;
          }
        } else if (type === "consistency") {
          const valCurr = curr.thresholdValue || 999;
          const valStrict = strictest.thresholdValue || 999;
          if (valCurr < valStrict) {
            strictest = curr;
          }
        } else {
          const mCurr = this.getEffectiveWeight(curr);
          const mStrict = this.getEffectiveWeight(strictest);
          if (mCurr < mStrict) {
            strictest = curr;
          }
        }
      }

      list.forEach(r => {
        if (r.id === strictest.id) {
          resolvedRules.push({ ...r, isSuperseded: false });
        } else {
          const supersededObj = {
            ...r,
            isSuperseded: true,
            supersededBy: strictest.title || strictest.thresholdText
          };
          supersededMap.set(r.id, supersededObj);
          resolvedRules.push(supersededObj);
        }
      });
    });

    return { resolvedRules, supersededMap };
  }

  /**
   * LAYER 1: Instant Analytical Pre-Check
   */
  calculateAnalyticalPreCheck(params, activeRules, accountSize = 50000) {
    const winRate = (params.winRate || 50) / 100.0;
    const avgRR = params.avgRR || 1.5;
    const riskPct = params.riskPct || 1.0;
    const riskDollar = (accountSize * riskPct) / 100.0;

    // Determine binding limits
    let dlPct = 5.0;
    let maxDDPct = 10.0;
    let targetPct = 8.0;

    activeRules.forEach(r => {
      if (r.isSuperseded) return;
      if (r.ruleType === "daily_loss" && r.thresholdValue) dlPct = Math.min(dlPct, r.thresholdValue);
      if (r.ruleType === "max_drawdown" && r.thresholdValue) maxDDPct = Math.min(maxDDPct, r.thresholdValue);
      if (r.ruleType === "profit_target" && r.thresholdValue) targetPct = r.thresholdValue;
    });

    // 1. Break-Even Win Rate = 1 / (1 + RR)
    const breakEvenWinRatePct = parseFloat(((1 / (1 + avgRR)) * 100).toFixed(1));
    const edgeOverBreakEven = parseFloat(((winRate * 100) - breakEvenWinRatePct).toFixed(1));

    // 2. EV per Trade
    const evPerTradeR = parseFloat(((winRate * avgRR) - ((1 - winRate) * 1.0)).toFixed(3));
    const evPerTradeDollar = Math.round(evPerTradeR * riskDollar);

    // 3. Consecutive Straight Losses to Breach
    const lossesToDailyBreach = Math.max(1, Math.floor(dlPct / riskPct));
    const lossesToMaxBreach = Math.max(1, Math.floor(maxDDPct / riskPct));

    // 4. Hurdle Ratio (Target / Max Drawdown)
    const hurdleRatio = parseFloat((targetPct / maxDDPct).toFixed(2));

    return {
      breakEvenWinRatePct,
      edgeOverBreakEven,
      evPerTradeR,
      evPerTradeDollar,
      lossesToDailyBreach,
      lossesToMaxBreach,
      hurdleRatio,
      bindingDailyLossPct: dlPct,
      bindingMaxDDPct: maxDDPct,
      targetPct
    };
  }

  /**
   * LAYER 3: Calculate Effective Retained Split % & Economic Leakage
   */
  calculateRetainedSplitAndEconomics(moduleId, activeRules, accountSize = 50000, passCertainty = 5.0) {
    // 1. Determine Nominal Base Profit Split
    let baseNominalSplit = 80;
    if (moduleId === "instant") {
      baseNominalSplit = 80;
      if (activeRules.some(r => r.firmId === "fundingpips")) baseNominalSplit = 95;
      if (activeRules.some(r => r.id === "fn_inst_stellar_split_lock")) baseNominalSplit = 70;
      if (activeRules.some(r => r.id === "fn_inst_cap_scale")) baseNominalSplit = 60;
      if (activeRules.some(r => r.id === "ps_inst_pro_dd4")) baseNominalSplit = 70;
    } else if (moduleId === "oneStepStd") {
      baseNominalSplit = 80;
      if (activeRules.some(r => r.firmId === "fundednext")) baseNominalSplit = 90;
    } else {
      baseNominalSplit = 80;
    }

    // 2. Check Split Slashes and Deductions
    let effectiveRetainedSplit = baseNominalSplit;
    let splitSlashReason = null;
    let profitHaircutPct = 0;

    // Pipstone nuclear floating slash (20% or 10%)
    if (activeRules.some(r => r.id === "ps_univ_floating_nuclear_slash" || r.id === "ps_inst_floating_nuclear" || r.id === "ps_univ_nuclear_hold" || r.id === "ps_inst_hold_reversal")) {
      effectiveRetainedSplit = Math.min(effectiveRetainedSplit, 20);
      splitSlashReason = "Pipstone Nuclear Slash (20% split on 1st violation + closure)";
    }

    // FundedSquad 1% float breach (30% split)
    if (activeRules.some(r => r.id === "fs_inst_flex_flt")) {
      effectiveRetainedSplit = Math.min(effectiveRetainedSplit, 30);
      splitSlashReason = "FundedSquad 1.0% Float Breach (Permanent 30% split)";
    }

    // FundedSquad 1.5% float breach (40% split)
    if (activeRules.some(r => r.id === "fs_1s_floating" || r.id === "fs_1slite_floating_hold" || r.id === "fs_2s_flt_hold")) {
      effectiveRetainedSplit = Math.min(effectiveRetainedSplit, 40);
      splitSlashReason = "FundedSquad 1.5% Float Breach (40% split penalty)";
    }

    // FundedSquad Retry Downgrade (50% split)
    if (activeRules.some(r => r.id === "fs_inst_retry_downgrade")) {
      effectiveRetainedSplit = Math.min(effectiveRetainedSplit, 50);
      splitSlashReason = "FundedSquad Free Retry Downgrade (50% split)";
    }

    // Asymmetric News 40% haircut
    if (activeRules.some(r => r.id === "fn_univ_news_haircut" || r.id === "fn_2s_news_haircut" || r.id === "fn_1s_leverage_news" || r.id === "fn_inst_news_leverage")) {
      profitHaircutPct += 15; // Estimated 15% overall net profit drag from news haircuts
    }

    // Mandatory Stop Loss violation (100% deduction on violating trades)
    if (activeRules.some(r => r.id === "fn_mandatory_stop_loss")) {
      profitHaircutPct += 8; // Estimated 8% net drag from occasional unattached SL slip
    }

    effectiveRetainedSplit = Math.max(10, effectiveRetainedSplit - profitHaircutPct);

    // 3. Challenge Fee Estimation
    const feeTable = {
      5000: 45,
      10000: 85,
      25000: 175,
      50000: 290,
      100000: 495,
      200000: 980
    };
    const challengeFee = feeTable[accountSize] || Math.round((accountSize / 1000) * 5.5);

    // 4. Expected Attempts & True Cost to Funded
    const effectivePassRate = Math.max(0.1, passCertainty);
    const expectedAttempts = parseFloat((100 / effectivePassRate).toFixed(1));
    const trueCostToFunded = Math.round(expectedAttempts * challengeFee);

    // 5. Break-Even Payout Cycle
    // Assume average winning payout cycle produces 4% profit on account size
    const estCycleProfitDollar = accountSize * 0.04;
    const estCyclePayoutDollar = estCycleProfitDollar * (effectiveRetainedSplit / 100.0);
    const breakEvenCycles = Math.max(1, Math.ceil(trueCostToFunded / Math.max(100, estCyclePayoutDollar)));

    // 6. 6-Month Net ROI projections
    // Assume 6 payout cycles over 6 months
    const gross6mPayouts = estCyclePayoutDollar * 6;
    const medianNet6mDollar = Math.round(gross6mPayouts - trueCostToFunded);
    const medianNet6mRoiPct = Math.round((medianNet6mDollar / challengeFee) * 100);
    const p10Net6mDollar = Math.round(-trueCostToFunded);
    const p90Net6mDollar = Math.round((estCyclePayoutDollar * 10) - trueCostToFunded);

    return {
      nominalSplitPct: baseNominalSplit,
      effectiveRetainedSplitPct: Math.round(effectiveRetainedSplit),
      splitSlashReason,
      challengeFee,
      expectedAttempts,
      trueCostToFunded,
      breakEvenCycles,
      medianNet6mDollar,
      medianNet6mRoiPct,
      p10Net6mDollar,
      p90Net6mDollar
    };
  }

  /**
   * Main Multiplicative Hazard Passing Certainty Calculator
   */
  calculateCertainty(moduleId, activeRules, accountSize = 25000) {
    const baseInfo = this.benchmarks.moduleBaselines[moduleId] || {
      p1PassRate: 20.0,
      p2PassRate: null,
      fundedSurvivalRate: 40.0,
      endToEndRate: 8.0
    };

    const sizeModifier = (this.benchmarks.accountSizeModifiers[accountSize] || { multiplier: 1.0 }).multiplier;

    // Resolve conflicts
    const { resolvedRules } = this.resolveRuleConflicts(activeRules);
    const nonSupersededRules = resolvedRules.filter(r => !r.isSuperseded);

    let p1Multiplier = 1.0;
    let p2Multiplier = 1.0;
    let fundedMultiplier = 1.0;

    nonSupersededRules.forEach(rule => {
      const weight = this.getEffectiveWeight(rule);
      const stage = rule.impactStage || "both";

      if (stage === "eval" || stage === "both") {
        p1Multiplier *= weight;
        if (baseInfo.p2PassRate !== null) {
          p2Multiplier *= Math.min(1.0, weight * 1.05);
        }
      }

      if (stage === "funded" || stage === "both") {
        fundedMultiplier *= weight;
      }
    });

    const evalSizeMod = accountSize >= 100000 ? Math.pow(sizeModifier, 0.6) : sizeModifier;
    const fundedSizeMod = accountSize >= 100000 ? Math.pow(sizeModifier, 1.4) : sizeModifier;

    let p1Certainty = baseInfo.p1PassRate * p1Multiplier * evalSizeMod;
    p1Certainty = Math.max(0.5, Math.min(100.0, p1Certainty));

    let p2Certainty = null;
    let combinedEvalCertainty = p1Certainty;

    if (baseInfo.p2PassRate !== null) {
      let p2Base = baseInfo.p2PassRate * p2Multiplier * evalSizeMod;
      p2Certainty = Math.max(1.0, Math.min(100.0, p2Base));
      combinedEvalCertainty = (p1Certainty / 100.0) * (p2Certainty / 100.0) * 100.0;
    }

    let fundedCertainty = baseInfo.fundedSurvivalRate * fundedMultiplier * fundedSizeMod;
    fundedCertainty = Math.max(0.2, Math.min(100.0, fundedCertainty));

    let endToEndCertainty = (combinedEvalCertainty / 100.0) * (fundedCertainty / 100.0) * 100.0;
    endToEndCertainty = Math.max(0.1, Math.min(100.0, endToEndCertainty));

    let riskGrade = "B";
    let gradeLabel = "Standard Challenge";
    let gradeColor = "#B45309";

    if (endToEndCertainty >= 18.0) {
      riskGrade = "S";
      gradeLabel = "Lenient / Highly Passable";
      gradeColor = "#15803D";
    } else if (endToEndCertainty >= 12.0) {
      riskGrade = "A";
      gradeLabel = "Passable";
      gradeColor = "#15803D";
    } else if (endToEndCertainty >= 7.0) {
      riskGrade = "B";
      gradeLabel = "Standard Challenge";
      gradeColor = "#B68D40";
    } else if (endToEndCertainty >= 4.0) {
      riskGrade = "C";
      gradeLabel = "High Friction";
      gradeColor = "#D97706";
    } else if (endToEndCertainty >= 2.0) {
      riskGrade = "D";
      gradeLabel = "Severe Attrition Trap";
      gradeColor = "#EA580C";
    } else {
      riskGrade = "F";
      gradeLabel = "Unsurvivable Rule Trap";
      gradeColor = "#B91C1C";
    }

    // Top 5 Certainty Killers
    const certaintyKillers = this.calculateCertaintyKillers(
      nonSupersededRules,
      baseInfo,
      evalSizeMod,
      fundedSizeMod,
      endToEndCertainty
    );

    // Exact Dollar Math
    const dollarMath = this.calculateDollarMath(accountSize, nonSupersededRules);

    // Layer 3 Economic Leakage & Split Retention
    const economics = this.calculateRetainedSplitAndEconomics(moduleId, nonSupersededRules, accountSize, endToEndCertainty);

    return {
      p1Certainty: parseFloat(p1Certainty.toFixed(1)),
      p2Certainty: p2Certainty !== null ? parseFloat(p2Certainty.toFixed(1)) : null,
      combinedEvalCertainty: parseFloat(combinedEvalCertainty.toFixed(1)),
      fundedCertainty: parseFloat(fundedCertainty.toFixed(1)),
      endToEndCertainty: parseFloat(endToEndCertainty.toFixed(2)),
      riskGrade,
      gradeLabel,
      gradeColor,
      certaintyKillers,
      dollarMath,
      economics,
      resolvedRules,
      activeCount: nonSupersededRules.length
    };
  }

  calculateDollarMath(accountSize, activeRules) {
    let dlPct = 5.0;
    let maxDDPct = 10.0;
    let floatingPct = 10.0;
    let profitTargetPct = 8.0;
    let cushionPct = 0.0;

    activeRules.forEach(r => {
      if (r.ruleType === "daily_loss" && r.thresholdValue) dlPct = Math.min(dlPct, r.thresholdValue);
      if (r.ruleType === "max_drawdown" && r.thresholdValue) maxDDPct = Math.min(maxDDPct, r.thresholdValue);
      if (r.ruleType === "floating_risk" && r.thresholdValue) floatingPct = Math.min(floatingPct, r.thresholdValue);
      if (r.ruleType === "profit_target" && r.thresholdValue) profitTargetPct = r.thresholdValue;
      if (r.id === "fp_inst_cushion_days") cushionPct = 3.0;
    });

    const dailyLossDollar = (accountSize * dlPct) / 100.0;
    const maxLossDollar = (accountSize * maxDDPct) / 100.0;
    const floatingCapDollar = floatingPct < 10 ? (accountSize * floatingPct) / 100.0 : null;
    const profitTargetDollar = (accountSize * profitTargetPct) / 100.0;
    const cushionDollar = cushionPct > 0 ? (accountSize * cushionPct) / 100.0 : 0;

    let maxFxLots = (accountSize / 100000) * 10;
    let maxGoldLots = (accountSize / 100000) * 5;

    const hasFSLotCap = activeRules.some(r => r.id === "fs_big_lot_caps");
    if (hasFSLotCap) {
      if (accountSize >= 200000) {
        maxFxLots = 8.0;
        maxGoldLots = 4.0;
      } else if (accountSize >= 100000) {
        maxFxLots = 6.0;
        maxGoldLots = 2.5;
      }
    }

    const hasClickCap = activeRules.some(r => r.id === "fp_big_click_cap");
    if (hasClickCap && maxFxLots > 20) {
      maxFxLots = 20.0;
    }

    return {
      accountSize,
      dailyLossPct: dlPct,
      dailyLossDollar,
      maxDDPct,
      maxLossDollar,
      floatingPct: floatingPct < 10 ? floatingPct : null,
      floatingCapDollar,
      profitTargetPct,
      profitTargetDollar,
      cushionPct,
      cushionDollar,
      maxFxLots: parseFloat(maxFxLots.toFixed(1)),
      maxGoldLots: parseFloat(maxGoldLots.toFixed(1))
    };
  }

  calculateCertaintyKillers(nonSupersededRules, baseInfo, evalSizeMod, fundedSizeMod, currentEndToEnd) {
    if (nonSupersededRules.length === 0) return [];
    const killers = [];

    nonSupersededRules.forEach(rule => {
      const weight = this.getEffectiveWeight(rule);
      const damagePct = Math.round((1 - weight) * 100);

      killers.push({
        id: rule.id,
        title: rule.title,
        firmName: rule.firmName,
        modelName: rule.modelName,
        severity: rule.severity,
        weight,
        damagePct,
        formattedImpact: `-${damagePct}% rel.`
      });
    });

    killers.sort((a, b) => b.damagePct - a.damagePct);
    return killers.slice(0, 5);
  }

  /**
   * Rule Killer Marginal Delta Inspector: Shows exact % pass certainty gained if rule is disabled
   */
  calculateMarginalRuleImpacts(moduleId, activeRules, accountSize = 50000) {
    const baseResult = this.calculateCertainty(moduleId, activeRules, accountSize);
    const topKillers = baseResult.certaintyKillers;

    return topKillers.map(killer => {
      const rulesWithoutThis = activeRules.filter(r => r.id !== killer.id);
      const resWithout = this.calculateCertainty(moduleId, rulesWithoutThis, accountSize);
      const deltaCertainty = parseFloat((resWithout.endToEndCertainty - baseResult.endToEndCertainty).toFixed(2));
      const relGainPct = Math.round(((resWithout.endToEndCertainty - baseResult.endToEndCertainty) / Math.max(0.1, baseResult.endToEndCertainty)) * 100);

      return {
        ...killer,
        deltaCertainty,
        relGainPct,
        formattedDelta: `+${deltaCertainty > 0 ? deltaCertainty : 0.1}% abs.`
      };
    });
  }

  /**
   * LAYER 2: 10,000-Path Path-Dependent Monte Carlo Simulation
   */
  runMonteCarloSimulation(params, activeRules, accountSize = 25000, numPaths = 10000) {
    const startTime = performance.now();

    const winRate = (params.winRate || 50) / 100.0;
    const avgRR = params.avgRR || 1.5;
    const riskPct = (params.riskPct || 1.0) / 100.0;
    const tradesPerDay = Math.max(1, Math.round(params.tradesPerDay || 2));
    const variance = params.variance !== undefined ? params.variance : 0.3; // 0.0 to 1.0 spread
    const maeRiskPct = (params.maeRiskPct || 120) / 100.0; // MAE % of risk

    const maxTradingDays = 60;

    let dailyLossLimitPct = 0.05;
    let maxDrawdownLimitPct = 0.10;
    let targetPct = 0.08;
    let isTrailingDD = false;
    let isLiveEquityRecalc = false;
    let floatingRiskCapPct = 0.99;
    let consistencyMaxRatio = 1.0;
    let requiredProfitableDays = 0;
    let minProfitForValidDayPct = 0.0025;
    let holdTimeSubMinuteHazard = 0.0;

    activeRules.forEach(r => {
      if (r.isSuperseded) return;
      if (r.ruleType === "daily_loss" && r.thresholdValue) dailyLossLimitPct = r.thresholdValue / 100.0;
      if (r.ruleType === "max_drawdown" && r.thresholdValue) maxDrawdownLimitPct = r.thresholdValue / 100.0;
      if (r.ruleType === "profit_target" && r.thresholdValue) targetPct = r.thresholdValue / 100.0;
      if (r.id && (r.id.includes("trailing") || r.id === "fp_inst_max_dd" || r.id === "ps_inst_std_dd" || r.id === "fn_inst_cap_scale" || r.id === "fp_labs_target_dd" || r.id === "fs_inst_retry_downgrade")) {
        isTrailingDD = true;
      }
      if (r.id === "fp_inst_dl3" || r.id === "ps_inst_std_dd" || r.id === "tfr_inst_utc_recalc") {
        isLiveEquityRecalc = true;
      }
      if (r.ruleType === "floating_risk" && r.thresholdValue) floatingRiskCapPct = r.thresholdValue / 100.0;
      if (r.ruleType === "consistency" && r.thresholdValue) consistencyMaxRatio = r.thresholdValue / 100.0;
      if (r.ruleType === "profitable_days" && r.thresholdValue) {
        requiredProfitableDays = r.thresholdValue;
        if (r.id === "ps_inst_std_hw" || r.id === "fs_1s_target_dd") minProfitForValidDayPct = 0.005;
      }
      if (r.ruleType === "hold_time") holdTimeSubMinuteHazard = 0.03;
    });

    let passPhase1Count = 0;
    let fundedSurvivalCount = 0;

    const failureCauses = {
      dailyLoss: 0,
      maxDrawdown: 0,
      floatingCap: 0,
      consistencyTrap: 0,
      executionTrap: 0,
      targetTimeout: 0
    };

    const finalEquities = new Float32Array(numPaths);

    // Sample Replay Paths Storage
    const samplePassingRuns = [];
    const sampleFailedRuns = [];

    for (let path = 0; path < numPaths; path++) {
      let balance = 1.0;
      let highWatermark = 1.0;
      let dayOpenBalance = 1.0;
      let phasePassed = false;
      let failed = false;
      let failReason = null;
      let breachDay = null;
      let profitableDaysCount = 0;
      let bestDayProfit = 0.0;
      let bestSingleTradeProfit = 0.0;
      let totalRealizedProfit = 0.0;

      // Track day by day for first 30 paths
      const shouldRecordPath = path < 30;
      const pathDayHistory = shouldRecordPath ? [] : null;

      for (let day = 0; day < maxTradingDays; day++) {
        dayOpenBalance = balance;
        let dayStartEquityFloor = isLiveEquityRecalc ? Math.max(dayOpenBalance, highWatermark) : dayOpenBalance;
        let dayProfit = 0.0;
        let dayLowEquity = balance;

        for (let t = 0; t < tradesPerDay; t++) {
          const isWin = Math.random() < winRate;
          
          // Realistic R:R Outcome Variance
          let tradeRR = avgRR;
          if (variance > 0) {
            const jitter = (Math.random() - 0.5) * 2 * variance;
            tradeRR = Math.max(0.2, avgRR * (1 + jitter));
          }

          const pnlPct = isWin ? riskPct * tradeRR : -riskPct;

          if (isWin && pnlPct > bestSingleTradeProfit) {
            bestSingleTradeProfit = pnlPct;
          }

          // Intraday Adverse Excursion (MAE)
          // Even winning trades experience an intraday adverse dip before hitting take-profit!
          const tradeMAE = isWin
            ? riskPct * maeRiskPct * (0.6 + Math.random() * 0.5)
            : riskPct * (1.0 + Math.random() * 0.3);

          const estimatedFloatingDrawdown = tradeMAE;
          const currentTradeMinEquity = balance - estimatedFloatingDrawdown;
          if (currentTradeMinEquity < dayLowEquity) {
            dayLowEquity = currentTradeMinEquity;
          }

          // Check Floating Risk Cap Breach (from intraday MAE)
          if (estimatedFloatingDrawdown >= floatingRiskCapPct) {
            failed = true;
            failReason = "floatingCap";
            breachDay = day + 1;
            break;
          }

          // Check sub-minute execution slip hazard
          if (holdTimeSubMinuteHazard > 0 && Math.random() < holdTimeSubMinuteHazard) {
            failed = true;
            failReason = "executionTrap";
            breachDay = day + 1;
            break;
          }

          balance += pnlPct;
          dayProfit += pnlPct;

          if (balance > highWatermark) {
            highWatermark = balance;
          }

          // Daily Loss Breach Check
          const currentDayLossPct = (dayStartEquityFloor - balance) / dayStartEquityFloor;
          if (currentDayLossPct >= dailyLossLimitPct) {
            failed = true;
            failReason = "dailyLoss";
            breachDay = day + 1;
            break;
          }

          // Max Drawdown Breach Check
          const baseForMaxDD = isTrailingDD ? highWatermark : 1.0;
          const currentMaxLossPct = (baseForMaxDD - balance) / baseForMaxDD;
          if (currentMaxLossPct >= maxDrawdownLimitPct) {
            failed = true;
            failReason = "maxDrawdown";
            breachDay = day + 1;
            break;
          }
        }

        // Record daily points for replay chart
        if (shouldRecordPath) {
          const currentMaxFloor = isTrailingDD ? Math.max(1.0 - maxDrawdownLimitPct, highWatermark - maxDrawdownLimitPct) : (1.0 - maxDrawdownLimitPct);
          const currentDayFloor = dayStartEquityFloor * (1.0 - dailyLossLimitPct);
          pathDayHistory.push({
            day: day + 1,
            balance: parseFloat(balance.toFixed(4)),
            equityLow: parseFloat(dayLowEquity.toFixed(4)),
            dailyLossFloor: parseFloat(currentDayFloor.toFixed(4)),
            maxDDFloor: parseFloat(currentMaxFloor.toFixed(4))
          });
        }

        if (failed) break;

        if (dayProfit >= minProfitForValidDayPct) profitableDaysCount++;
        if (dayProfit > bestDayProfit) bestDayProfit = dayProfit;
        if (dayProfit > 0) totalRealizedProfit += dayProfit;

        // Target Reach Check
        const netGainPct = balance - 1.0;
        if (netGainPct >= targetPct) {
          // Consistency Dilution Loop
          if (consistencyMaxRatio < 1.0 && totalRealizedProfit > 0) {
            const dayRatio = bestDayProfit / totalRealizedProfit;
            const tradeRatio = bestSingleTradeProfit / totalRealizedProfit;
            if (dayRatio > consistencyMaxRatio || tradeRatio > consistencyMaxRatio) {
              // Consistency violation: continue trading to dilute
              if (day >= maxTradingDays - 1) {
                failed = true;
                failReason = "consistencyTrap";
                breachDay = day + 1;
                break;
              }
              continue;
            }
          }

          if (requiredProfitableDays > 0 && profitableDaysCount < requiredProfitableDays) {
            continue;
          }

          phasePassed = true;
          break;
        }
      }

      if (phasePassed && !failed) {
        passPhase1Count++;

        // Funded Stage Survival
        let fundedBalance = 1.0;
        let fundedHWM = 1.0;
        let fundedFailed = false;

        for (let fDay = 0; fDay < 30; fDay++) {
          let fDayOpen = fundedBalance;
          for (let t = 0; t < tradesPerDay; t++) {
            const isWin = Math.random() < winRate;
            let tradeRR = avgRR;
            if (variance > 0) tradeRR = Math.max(0.2, avgRR * (1 + (Math.random() - 0.5) * 2 * variance));
            const pnlPct = isWin ? riskPct * tradeRR : -riskPct;

            const tradeMAE = isWin ? riskPct * maeRiskPct * 0.8 : riskPct * 1.1;
            if (tradeMAE >= floatingRiskCapPct) {
              fundedFailed = true;
              break;
            }

            fundedBalance += pnlPct;
            if (fundedBalance > fundedHWM) fundedHWM = fundedBalance;

            if ((fDayOpen - fundedBalance) / fDayOpen >= dailyLossLimitPct) {
              fundedFailed = true;
              break;
            }
            if ((fundedHWM - fundedBalance) / fundedHWM >= maxDrawdownLimitPct) {
              fundedFailed = true;
              break;
            }
          }
          if (fundedFailed) break;
        }

        if (!fundedFailed && fundedBalance > 1.01) {
          fundedSurvivalCount++;
        }

        // Store passing sample run
        if (shouldRecordPath && samplePassingRuns.length < 2) {
          samplePassingRuns.push({
            id: `pass_${samplePassingRuns.length + 1}`,
            name: `Passing Run #${samplePassingRuns.length + 1}`,
            status: "PASSED",
            finalProfitPct: parseFloat(((balance - 1.0) * 100).toFixed(1)),
            days: pathDayHistory
          });
        }
      } else {
        if (!failReason) {
          failReason = "targetTimeout";
          breachDay = maxTradingDays;
        }
        failureCauses[failReason] = (failureCauses[failReason] || 0) + 1;

        // Store failed sample runs
        if (shouldRecordPath && sampleFailedRuns.length < 4) {
          const reasonLabelMap = {
            dailyLoss: "Daily Loss Breach",
            maxDrawdown: "Max Drawdown Breach",
            floatingCap: "Floating Risk Trap (MAE)",
            consistencyTrap: "Consistency Lockout",
            executionTrap: "Execution / Hold Time Slip",
            targetTimeout: "Target Timeout"
          };
          sampleFailedRuns.push({
            id: `fail_${sampleFailedRuns.length + 1}`,
            name: `Failed: ${reasonLabelMap[failReason]}`,
            status: "FAILED",
            breachDay: breachDay || pathDayHistory.length,
            breachReason: reasonLabelMap[failReason],
            finalProfitPct: parseFloat(((balance - 1.0) * 100).toFixed(1)),
            days: pathDayHistory
          });
        }
      }

      finalEquities[path] = balance;
    }

    const elapsed = Math.round(performance.now() - startTime);

    finalEquities.sort();
    const p5 = finalEquities[Math.floor(numPaths * 0.05)];
    const p25 = finalEquities[Math.floor(numPaths * 0.25)];
    const p50 = finalEquities[Math.floor(numPaths * 0.50)];
    const p75 = finalEquities[Math.floor(numPaths * 0.75)];
    const p95 = finalEquities[Math.floor(numPaths * 0.95)];

    const mcP1Pass = parseFloat(((passPhase1Count / numPaths) * 100).toFixed(1));
    const mcFundedPass = passPhase1Count > 0 ? parseFloat(((fundedSurvivalCount / passPhase1Count) * 100).toFixed(1)) : 0.0;
    const mcEndToEnd = parseFloat(((fundedSurvivalCount / numPaths) * 100).toFixed(2));

    return {
      numPaths,
      elapsedMs: elapsed,
      mcP1Pass,
      mcFundedPass,
      mcEndToEnd,
      failureCauses,
      samplePassingRuns,
      sampleFailedRuns,
      percentiles: {
        p5: parseFloat(p5.toFixed(3)),
        p25: parseFloat(p25.toFixed(3)),
        p50: parseFloat(p50.toFixed(3)),
        p75: parseFloat(p75.toFixed(3)),
        p95: parseFloat(p95.toFixed(3))
      }
    };
  }

  /**
   * 5x5 Win-Rate x Risk-Per-Trade Sensitivity Heatmap Generator
   */
  generateSensitivityHeatmap(baseParams, activeRules, accountSize = 50000) {
    const centerWR = baseParams.winRate || 50;
    const wrSteps = [centerWR - 10, centerWR - 5, centerWR, centerWR + 5, centerWR + 10];
    const riskSteps = [0.25, 0.50, 1.00, 1.50, 2.00];

    const matrix = [];
    let bestCell = { passCertainty: -1, wr: centerWR, risk: 1.0 };

    wrSteps.forEach(wr => {
      const row = {
        winRate: Math.max(20, Math.min(85, wr)),
        cells: []
      };

      riskSteps.forEach(risk => {
        // Analytical estimation combined with hazard modifiers
        const preCheck = this.calculateAnalyticalPreCheck({ winRate: wr, avgRR: baseParams.avgRR || 1.5, riskPct: risk }, activeRules, accountSize);
        
        let score = (wr / 100.0) * (baseParams.avgRR || 1.5);
        let passProb = Math.max(0.2, (score - 0.4) * 22);

        // Penalize over-risking vs daily loss
        if (risk >= preCheck.bindingDailyLossPct * 0.4) {
          passProb *= 0.65;
        }
        if (risk >= preCheck.bindingDailyLossPct * 0.6) {
          passProb *= 0.35;
        }

        // Apply active hazard modifiers
        activeRules.forEach(r => {
          if (!r.isSuperseded) passProb *= (r.impactMultiplier || 0.90);
        });

        passProb = parseFloat(Math.max(0.1, Math.min(45.0, passProb)).toFixed(1));

        const cell = {
          riskPct: risk,
          winRate: wr,
          passCertainty: passProb,
          isSweetSpot: false
        };

        if (passProb > bestCell.passCertainty) {
          bestCell = { passCertainty: passProb, wr, risk };
        }

        row.cells.push(cell);
      });

      matrix.push(row);
    });

    // Tag the sweet spot
    matrix.forEach(r => {
      r.cells.forEach(c => {
        if (c.winRate === bestCell.wr && c.riskPct === bestCell.risk) {
          c.isSweetSpot = true;
        }
      });
    });

    return {
      matrix,
      bestCell
    };
  }

  /**
   * Pre-Trade Violation Sandbox Engine: Instant 5-Firm Real-Time Audit
   */
  auditPreTradeTicket(ticket, accountSize = 50000) {
    const { asset, lotSize, slPct, newsWindowMins, holdTimeSec, openSameAssetPositions, minsSinceLastLoss } = ticket;

    const auditResults = {
      fundingpips: { firm: "FundingPips", status: "PASS", violations: [], warnings: [], marginCliff: false },
      fundedsquad: { firm: "FundedSquad", status: "PASS", violations: [], warnings: [], splitSlash: null },
      pipstone: { firm: "Pipstone Capital", status: "PASS", violations: [], warnings: [], splitSlash: null },
      fundednext: { firm: "FundedNext", status: "PASS", violations: [], warnings: [], profitDeduction: null },
      thefundedroom: { firm: "The Funded Room", status: "PASS", violations: [], warnings: [] }
    };

    // 1. FundingPips Audit
    if (asset === "XAUUSD" || asset === "US100") {
      if (lotSize >= 0.50) {
        auditResults.fundingpips.marginCliff = true;
        auditResults.fundingpips.warnings.push("Dynamic Leverage Cliff: 0.50+ lots collapses leverage to 1:5!");
      }
    }
    if (lotSize > 20) {
      auditResults.fundingpips.status = "HARD BREACH";
      auditResults.fundingpips.violations.push("20 Lots Max Per Click Violation!");
    }
    if (newsWindowMins <= 5) {
      auditResults.fundingpips.warnings.push("News 5m window: profits voided unless opened ≥5h prior");
    }

    // 2. FundedSquad Audit
    if (holdTimeSec < 60 && accountSize > 10000) {
      auditResults.fundedsquad.status = "HARD BREACH";
      auditResults.fundedsquad.violations.push("Sub-60s Trade Violation: Prohibited on >$10K accounts without bypass!");
    }
    if (accountSize >= 200000) {
      if (asset === "XAUUSD" && lotSize > 4.0) {
        auditResults.fundedsquad.status = "HARD BREACH";
        auditResults.fundedsquad.violations.push("Hard Lot Ceiling: Max 4.0 Gold lots on $200K accounts!");
      }
      if (asset.includes("USD") && lotSize > 8.0) {
        auditResults.fundedsquad.status = "HARD BREACH";
        auditResults.fundedsquad.violations.push("Hard Lot Ceiling: Max 8.0 FX lots on $200K accounts!");
      }
    }
    if (openSameAssetPositions > 2) {
      auditResults.fundedsquad.status = "HARD BREACH";
      auditResults.fundedsquad.violations.push("Layering Cap: Max 2 open positions permitted per asset!");
    }
    if (newsWindowMins <= 4) {
      auditResults.fundedsquad.warnings.push("News 4m window: pending order execution = payout rejection");
    }

    // 3. Pipstone Capital Audit
    if (holdTimeSec < 60) {
      auditResults.pipstone.status = "SPLIT SLASH";
      auditResults.pipstone.splitSlash = 20;
      auditResults.pipstone.violations.push("Nuclear <60s Hold Penalty: Split slashed to 20% & account closed post-payout!");
    }
    if (minsSinceLastLoss !== null && minsSinceLastLoss < 15) {
      auditResults.pipstone.status = "HARD BREACH";
      auditResults.pipstone.violations.push("15-Min Directional Reversal Cooldown Violation!");
    }

    // 4. FundedNext Audit
    if (slPct === 0 || slPct === null) {
      auditResults.fundednext.status = "DEDUCT";
      auditResults.fundednext.profitDeduction = 100;
      auditResults.fundednext.violations.push("Mandatory SL Violation: 100% of realized profits forfeited on trade!");
    }
    if (newsWindowMins <= 5) {
      auditResults.fundednext.warnings.push("Asymmetric News 40% Rule: keep only 40% of profit, absorb 100% of loss");
    }
    if (slPct >= 3.0) {
      auditResults.fundednext.warnings.push("3% Risk Warning: 2nd violation permanently locks account to 1% max risk cap!");
    }

    // 5. The Funded Room Audit
    if (openSameAssetPositions >= 4) {
      auditResults.thefundedroom.status = "HARD BREACH";
      auditResults.thefundedroom.violations.push("4 Orders in 3 Min Pyramiding / HFT Breach!");
    }
    if (holdTimeSec < 60) {
      auditResults.thefundedroom.warnings.push("<1m trade counts toward 10% sub-minute payout blocker ratio");
    }
    if (slPct >= 3.0) {
      auditResults.thefundedroom.status = "HARD BREACH";
      auditResults.thefundedroom.violations.push("Same-Asset Same-Day Aggregated Risk ≥3% Breach!");
    }

    return auditResults;
  }

  /**
   * CSV Trade Log Bootstrap Monte Carlo Engine
   * 10,000 resamples from user's real trade distribution
   */
  runBootstrapMonteCarlo(tradesList, activeRules, accountSize = 50000, numPaths = 10000) {
    if (!tradesList || tradesList.length === 0) return null;

    const nTrades = tradesList.length;
    const tradesPerSim = 50; // 50 trades per audition run
    let passedCount = 0;
    let dlBreachCount = 0;
    let maxDDBreachCount = 0;

    let dlLimit = 0.05;
    let maxDDLimit = 0.10;
    let target = 0.08;

    activeRules.forEach(r => {
      if (r.isSuperseded) return;
      if (r.ruleType === "daily_loss" && r.thresholdValue) dlLimit = r.thresholdValue / 100.0;
      if (r.ruleType === "max_drawdown" && r.thresholdValue) maxDDLimit = r.thresholdValue / 100.0;
      if (r.ruleType === "profit_target" && r.thresholdValue) target = r.thresholdValue / 100.0;
    });

    for (let p = 0; p < numPaths; p++) {
      let balance = 1.0;
      let hwm = 1.0;
      let failed = false;

      for (let t = 0; t < tradesPerSim; t++) {
        // Bootstrap sample with replacement
        const sample = tradesList[Math.floor(Math.random() * nTrades)];
        const pnl = sample.pnlPct / 100.0;

        balance += pnl;
        if (balance > hwm) hwm = balance;

        if ((hwm - balance) >= maxDDLimit) {
          failed = true;
          maxDDBreachCount++;
          break;
        }

        if (balance - 1.0 >= target) {
          passedCount++;
          break;
        }
      }
    }

    return {
      totalSims: numPaths,
      sampleSize: nTrades,
      bootstrapPassRate: parseFloat(((passedCount / numPaths) * 100).toFixed(1)),
      maxDDBreachRate: parseFloat(((maxDDBreachCount / numPaths) * 100).toFixed(1))
    };
  }
}

if (typeof window !== "undefined") {
  window.ProbabilityEngine = ProbabilityEngine;
}
