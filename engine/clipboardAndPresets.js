/**
 * Cross-Module Clipboard, Worst-Case Synthesizer, Scenario Presets & Heatmap Matrix Generator
 */

class ClipboardAndPresetsManager {
  constructor(probabilityEngine) {
    this.probEngine = probabilityEngine;
    this.clipboard = [];
    this.localStorageKey = "prop_rule_workbench_scenarios_v1";
  }

  // ==========================================
  // CROSS-MODULE CLIPBOARD
  // ==========================================

  /**
   * Copy a single rule to the clipboard
   */
  copyRule(rule, fromModule) {
    if (!rule) return false;
    // Avoid exact duplicate in clipboard
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

  /**
   * Copy all currently checked rules in the active module to clipboard
   */
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

  /**
   * Get items in clipboard
   */
  getClipboard() {
    return [...this.clipboard];
  }

  /**
   * Clear the clipboard
   */
  clearClipboard() {
    this.clipboard = [];
  }

  /**
   * Paste copied rules into a target module.
   * Returns newly formatted imported rule objects with crisp badge metadata.
   */
  pasteIntoModule(targetModule, existingImported = []) {
    if (this.clipboard.length === 0) return [];

    const newImports = [];
    this.clipboard.forEach(item => {
      // Don't import if it's already native to target module or already in imported list
      const alreadyImported = existingImported.some(imp => imp.id === item.id);
      const isNative = item.module === targetModule;

      if (!alreadyImported && !isNative) {
        // Tag with imported provenance badge
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
  // WORST-CASE SCENARIO AUTO-SYNTHESIZER
  // ==========================================

  /**
   * Auto-selects the harshest constraint across all 5 firms for every rule category in that module
   */
  synthesizeWorstCaseForModule(moduleId, allModuleRules) {
    if (!allModuleRules || allModuleRules.length === 0) return [];

    // Group rules by category
    const byCategory = {};
    allModuleRules.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = [];
      }
      byCategory[r.category].push(r);
    });

    const selectedWorstRuleIds = new Set();

    // In each category, find the worst-case rules
    Object.keys(byCategory).forEach(cat => {
      const rules = byCategory[cat];

      // If any rule explicitly flagged isWorstCase = true, select them
      const flagged = rules.filter(r => r.isWorstCase);
      if (flagged.length > 0) {
        flagged.forEach(f => selectedWorstRuleIds.add(f.id));
      } else {
        // Otherwise pick the rule with lowest multiplier (greatest damage)
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

  /**
   * Generate Full Cross-Module × Account-Size Worst-Case Heatmap Matrix
   * Computes certainty scores across all 6 modules and all 6 account sizes
   */
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
        harshestConstraint: worstRules.reduce((min, curr) => (curr.impactMultiplier < min.impactMultiplier ? curr : min), worstRules[0] || {}),
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
  // SCENARIO PRESETS & LOCALSTORAGE PERSISTENCE
  // ==========================================

  getPreloadedScenarios() {
    return [
      {
        id: "preset_vanilla_2step",
        name: "Vanilla Standard 2-Step Baseline",
        badge: "Industry Standard",
        description: "Standard FundingPips & Pipstone 8%/5% targets, 5% daily loss, 10% static drawdown at $50K.",
        moduleId: "twoStepStd",
        accountSize: 50000,
        checkedRuleIds: ["fp_2s_std_target_dd", "ps_2s_target_dd", "fp_univ_news_soft", "fp_univ_inactivity"],
        importedRules: []
      },
      {
        id: "preset_instant_choke",
        name: "Maximum Hazard Instant Trap Stack",
        badge: "Extreme Hazard",
        description: "FundingPips Zero 5% Trailing + -1% Floating Breach + TFR 15% Dual Consistency + Pipstone Nuclear 60s Hold.",
        moduleId: "instant",
        accountSize: 25000,
        checkedRuleIds: [
          "fp_inst_dl3",
          "fp_inst_max_dd",
          "fp_inst_floating",
          "tfr_inst_dual_consistency",
          "ps_inst_std_hw",
          "ps_inst_hold_reversal",
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
          "fn_big_tight_alloc"
        ],
        importedRules: []
      },
      {
        id: "preset_fn_asymmetric_news",
        name: "FundedNext Asymmetric News Squeeze",
        badge: "News Penalty",
        description: "Stellar 1-Step 6% static drawdown, 1:30 leverage squeeze, and 40% asymmetric news profit haircut.",
        moduleId: "oneStepStd",
        accountSize: 100000,
        checkedRuleIds: [
          "fn_1s_target_dd",
          "fn_1s_leverage_news",
          "fn_1s_eval_share",
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
      console.warn("Could not read scenarios from localStorage", e);
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
      console.error("Could not save scenario to localStorage", e);
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

// Expose globally
if (typeof window !== "undefined") {
  window.ClipboardAndPresetsManager = ClipboardAndPresetsManager;
}
