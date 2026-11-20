/**
 * Cross-Module Clipboard, Worst-Case Synthesizer, Pre-Trade Sandbox Evaluator, CSV Parser & Preset Manager
 */

class ClipboardAndEvaluator {
  constructor(probabilityEngine) {
    this.probEngine = probabilityEngine;
    this.clipboard = [];
    this.localStorageKey = "prop_rule_workbench_scenarios_v2";
  }

  // ==========================================
  // CROSS-MODULE CLIPBOARD
  // ==========================================

  copyRule(rule, fromModule) {
    if (!rule) return false;
    const exists = this.clipboard.some(c => c.id === rule.id);
    if (!exists) {
      this.clipboard.push({
        ...rule,
        copiedFromModule: fromModule || rule.module,
        copiedAt: Date.now()
      });
    }
    return true;
  }

  copyCheckedRules(rulesList, fromModule) {
    if (!rulesList || rulesList.length === 0) return 0;
    let addedCount = 0;
    rulesList.forEach(rule => {
      const exists = this.clipboard.some(c => c.id === rule.id);
      if (!exists) {
        this.clipboard.push({
          ...rule,
          copiedFromModule: fromModule || rule.module,
          copiedAt: Date.now()
        });
        addedCount++;
      }
    });
    return addedCount;
  }

  getClipboard() {
    return [...this.clipboard];
  }

  clearClipboard() {
    this.clipboard = [];
  }

  pasteIntoModule(targetModule, existingImported = []) {
    if (this.clipboard.length === 0) return [];

    const newImports = [];
    this.clipboard.forEach(item => {
      const alreadyImported = existingImported.some(imp => imp.id === item.id);
      const isNative = item.module === targetModule;

      if (!alreadyImported && !isNative) {
        const originModuleDef = (typeof window !== "undefined" && window.MODULE_DEFINITIONS)
          ? window.MODULE_DEFINITIONS.find(m => m.id === item.copiedFromModule)
          : null;
        const originModuleName = originModuleDef ? originModuleDef.name : item.copiedFromModule;

        newImports.push({
          ...item,
          targetModule,
          isImported: true,
          importedFromBadge: `Imported from ${originModuleName} · ${item.modelName || item.firmName}`,
          uniqueInstanceId: `${item.id}_imp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
        });
      }
    });

    return newImports;
  }

  // ==========================================
  // WORST-CASE AUTO-SYNTHESIZER
  // ==========================================

  synthesizeWorstCaseForModule(moduleId, allModuleRules) {
    if (!allModuleRules || allModuleRules.length === 0) return [];

    const byCategory = {};
    allModuleRules.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = [];
      }
      byCategory[r.category].push(r);
    });

    const selectedWorstRuleIds = new Set();

    Object.keys(byCategory).forEach(cat => {
      const rules = byCategory[cat];
      const flagged = rules.filter(r => r.isWorstCase);
      if (flagged.length > 0) {
        flagged.forEach(f => selectedWorstRuleIds.add(f.id));
      } else {
        let harshest = rules[0];
        for (let i = 1; i < rules.length; i++) {
          if ((rules[i].impactMultiplier || 1) < (harshest.impactMultiplier || 1)) {
            harshest = rules[i];
          }
        }
        if (harshest) {
          selectedWorstRuleIds.add(harshest.id);
        }
      }
    });

    return Array.from(selectedWorstRuleIds);
  }

  // ==========================================
  // ALL-MODULES HEATMAP MATRIX
  // ==========================================

  generateAllModulesHeatmapMatrix(allRawRules) {
    const modules = (typeof window !== "undefined" && window.MODULE_DEFINITIONS)
      ? window.MODULE_DEFINITIONS
      : [
          { id: "instant", name: "Instant", subtitle: "Direct-to-Funded" },
          { id: "oneStepStd", name: "1-Step Std", subtitle: "Standard / Flex" },
          { id: "twoStepStd", name: "2-Step Std", subtitle: "Standard / Flex" },
          { id: "bigAccounts", name: "Big Accounts", subtitle: "$100K–$400K+" }
        ];

    const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000];
    const matrix = [];

    modules.forEach(mod => {
      const moduleNativeRules = allRawRules.filter(r => r.module === mod.id);
      const worstRuleIds = this.synthesizeWorstCaseForModule(mod.id, moduleNativeRules);
      const worstRules = moduleNativeRules.filter(r => worstRuleIds.includes(r.id));

      const row = {
        module: mod,
        worstRuleCount: worstRules.length,
        sizes: {}
      };

      accountSizes.forEach(size => {
        const result = this.probEngine.calculateCertainty(mod.id, worstRules, size);
        row.sizes[size] = {
          accountSize: size,
          endToEndCertainty: result.endToEndCertainty,
          p1Certainty: result.p1Certainty,
          fundedCertainty: result.fundedCertainty,
          riskGrade: result.riskGrade,
          gradeColor: result.gradeColor,
          gradeLabel: result.gradeLabel,
          primaryKiller: result.certaintyKillers[0] ? result.certaintyKillers[0].title : "N/A"
        };
      });

      matrix.push(row);
    });

    return matrix;
  }

  // ==========================================
  // PRE-TRADE SANDBOX EVALUATOR (5 FIRMS SIMULTANEOUS)
  // ==========================================

  evaluateTradeTicket(ticket, accountSize = 50000) {
    return this.probEngine.auditPreTradeTicket(ticket, accountSize);
  }

  // ==========================================
  // CSV PARSER
  // ==========================================

  parseTradeLogCsv(csvText) {
    if (!csvText || typeof csvText !== "string") return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/['"]/g, ""));
    const pnlIndex = header.findIndex(h => h.includes("pnl") || h.includes("profit") || h.includes("return") || h.includes("gain"));
    const holdIndex = header.findIndex(h => h.includes("hold") || h.includes("duration") || h.includes("sec") || h.includes("time"));
    const assetIndex = header.findIndex(h => h.includes("symbol") || h.includes("pair") || h.includes("asset"));

    const trades = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map(c => c.trim().replace(/['"]/g, ""));

      let pnlVal = 0;
      if (pnlIndex !== -1 && cols[pnlIndex]) {
        pnlVal = parseFloat(cols[pnlIndex].replace(/[^\d.-]/g, ""));
      } else {
        pnlVal = parseFloat(cols[0].replace(/[^\d.-]/g, ""));
      }

      if (isNaN(pnlVal)) continue;

      let holdSec = 120;
      if (holdIndex !== -1 && cols[holdIndex]) {
        holdSec = parseInt(cols[holdIndex].replace(/[^\d]/g, ""), 10) || 120;
      }

      trades.push({
        id: i,
        pnlPct: pnlVal,
        holdSec: holdSec,
        asset: (assetIndex !== -1 && cols[assetIndex]) ? cols[assetIndex] : "EURUSD"
      });
    }

    return trades;
  }

  generateSampleTrades() {
    const sample = [];
    for (let i = 1; i <= 60; i++) {
      const isWin = Math.random() < 0.52;
      const pnl = isWin ? parseFloat((Math.random() * 2.2 + 0.4).toFixed(2)) : -parseFloat((Math.random() * 1.0 + 0.3).toFixed(2));
      const hold = isWin ? Math.floor(Math.random() * 3600 + 180) : Math.floor(Math.random() * 1800 + 45);
      sample.push({
        id: i,
        pnlPct: pnl,
        holdSec: hold,
        asset: i % 3 === 0 ? "XAUUSD" : (i % 2 === 0 ? "US100" : "EURUSD")
      });
    }
    return sample;
  }

  // ==========================================
  // SCENARIO PRESETS & LOCALSTORAGE PERSISTENCE
  // ==========================================

  getPreloadedScenarios() {
    return [
      {
        id: "preset_vanilla_2step",
        name: "Vanilla Standard 2-Step Baseline",
        badge: "Industry Standard",
        description: "FundingPips & Pipstone 8%/5% targets, 5% daily loss, 10% static drawdown at $50K.",
        moduleId: "twoStepStd",
        accountSize: 50000,
        checkedRuleIds: ["fp_2s_std_target_dd", "ps_2s_target_dd", "fp_univ_news_soft", "fp_univ_inactivity"],
        importedRules: []
      },
      {
        id: "preset_instant_choke",
        name: "Maximum Hazard Instant Trap Stack",
        badge: "Extreme Hazard",
        description: "FundingPips Zero 5% Trailing + -1% Floating Breach + TFR 15% Dual Consistency + Pipstone Nuclear 60s & Floating Slash.",
        moduleId: "instant",
        accountSize: 25000,
        checkedRuleIds: [
          "fp_inst_dl3",
          "fp_inst_max_dd",
          "fp_inst_floating",
          "tfr_inst_dual_consistency",
          "ps_inst_std_hw",
          "ps_inst_hold_reversal",
          "ps_inst_floating_nuclear",
          "fp_inst_news_weekend"
        ],
        importedRules: []
      },
      {
        id: "preset_big_account_bottleneck",
        name: "FundedSquad $200K Execution Choke",
        badge: "High Capital Friction",
        description: "$200K account throttled by 8.0 FX / 4.0 Gold hard lot caps, 60s hold penalty, and $3K daily profit cap.",
        moduleId: "bigAccounts",
        accountSize: 200000,
        checkedRuleIds: [
          "fs_big_lot_caps",
          "fs_big_margin_layering",
          "fs_univ_hold_60s",
          "fp_big_dynamic_lev",
          "fn_big_tight_alloc",
          "fn_big_merged_contagion"
        ],
        importedRules: []
      },
      {
        id: "preset_fn_asymmetric_news",
        name: "FundedNext Mandatory SL & Asymmetric News Squeeze",
        badge: "News & SL Penalty",
        description: "Stellar 1-Step 6% static drawdown, Mandatory SL (100% deduction), 3% cumulative risk cap, and 40% news haircut.",
        moduleId: "oneStepStd",
        accountSize: 100000,
        checkedRuleIds: [
          "fn_1s_target_dd",
          "fn_1s_leverage_news",
          "fn_1s_eval_share",
          "fn_mandatory_stop_loss",
          "fn_3pct_risk_reclassification",
          "fn_univ_news_haircut"
        ],
        importedRules: []
      }
    ];
  }

  getSavedScenarios() {
    try {
      const raw = localStorage.getItem(this.localStorageKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  saveCustomScenario(scenario) {
    try {
      const current = this.getSavedScenarios();
      const updated = current.filter(s => s.id !== scenario.id);
      updated.unshift({
        ...scenario,
        savedAt: Date.now()
      });
      localStorage.setItem(this.localStorageKey, JSON.stringify(updated));
      return true;
    } catch (e) {
      return false;
    }
  }

  deleteCustomScenario(scenarioId) {
    try {
      const current = this.getSavedScenarios();
      const updated = current.filter(s => s.id !== scenarioId);
      localStorage.setItem(this.localStorageKey, JSON.stringify(updated));
      return true;
    } catch (e) {
      return false;
    }
  }
}

if (typeof window !== "undefined") {
  window.ClipboardAndEvaluator = ClipboardAndEvaluator;
  window.ClipboardAndPresetsManager = ClipboardAndEvaluator; // backwards compatibility
}
