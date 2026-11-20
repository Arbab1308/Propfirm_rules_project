/**
 * 5-Firm Prop Trading Modular Rule Checklist, Worst-Case Mixer & Passing Certainty Terminal
 * Upgraded Full Reactive Application Controller (3-Layer Engine, 5x5 Heatmap, Sandbox, Replay & CSV Importer)
 */

(function () {
  "use strict";

  const state = {
    currentModule: "instant",
    accountSize: 50000,
    firmFilters: new Set(["all", "fundingpips", "fundedsquad", "pipstone", "fundednext", "thefundedroom"]),

    checkedRulesByModule: {
      instant: new Set(),
      oneStepStd: new Set(),
      oneStepLite: new Set(),
      twoStepStd: new Set(),
      twoStepLite: new Set(),
      bigAccounts: new Set()
    },

    importedRulesByModule: {
      instant: [],
      oneStepStd: [],
      oneStepLite: [],
      twoStepStd: [],
      twoStepLite: [],
      bigAccounts: []
    },

    customRulesByModule: {
      instant: [],
      oneStepStd: [],
      oneStepLite: [],
      twoStepStd: [],
      twoStepLite: [],
      bigAccounts: []
    },

    checkedUniversalRules: new Set(),

    universalCollapsed: false,
    collapsedBuckets: new Set(),

    // Monte Carlo parameters (10,000 Paths, Variance & MAE Excursions)
    mcParams: {
      winRate: 50,
      avgRR: 1.5,
      riskPct: 1.0,
      tradesPerDay: 2,
      variance: 0.3,
      maeRiskPct: 120
    },

    // Sample replay paths from Monte Carlo
    sampleRuns: [],
    selectedRunId: "pass_1",
    scrubberDay: 60,

    // Parsed CSV Trades
    parsedCsvTrades: [],

    // Engines
    probEngine: null,
    clipboardManager: null
  };

  const DOM = {};

  function init() {
    state.probEngine = new ProbabilityEngine(window.BENCHMARKS_DATA, window.RAW_RULES_DATA);
    state.clipboardManager = new (window.ClipboardAndEvaluator || window.ClipboardAndPresetsManager)(state.probEngine);

    cacheDOMElements();
    initDefaultSelections();
    bindEvents();
    renderModuleTabs();
    renderActiveModule();
    renderUniversalRules();
    recalculateAll();

    // Initial 10,000-path simulation
    runMonteCarlo();
  }

  function cacheDOMElements() {
    DOM.moduleTabsContainer = document.getElementById("moduleTabsContainer");
    DOM.sizePillsContainer = document.getElementById("sizePillsContainer");
    DOM.firmFilterGroup = document.getElementById("firmFilterGroup");

    DOM.activeModuleTitle = document.getElementById("activeModuleTitle");
    DOM.activeModuleBadge = document.getElementById("activeModuleBadge");
    DOM.activeModuleRulesCount = document.getElementById("activeModuleRulesCount");
    DOM.activeModuleMeta = document.getElementById("activeModuleMeta");

    DOM.clipboardNotificationBanner = document.getElementById("clipboardNotificationBanner");
    DOM.clipboardBannerMsg = document.getElementById("clipboardBannerMsg");
    DOM.btnPasteClipboard = document.getElementById("btnPasteClipboard");
    DOM.btnClearClipboard = document.getElementById("btnClearClipboard");

    DOM.btnAutoWorstCase = document.getElementById("btnAutoWorstCase");
    DOM.btnCopyCheckedRules = document.getElementById("btnCopyCheckedRules");
    DOM.btnAddCustomRule = document.getElementById("btnAddCustomRule");

    DOM.universalToggleHeader = document.getElementById("universalToggleHeader");
    DOM.universalChevron = document.getElementById("universalChevron");
    DOM.universalRulesContainer = document.getElementById("universalRulesContainer");
    DOM.ruleBucketsContainer = document.getElementById("ruleBucketsContainer");

    // Twin Hero Scorecard
    DOM.heroCertaintyScore = document.getElementById("heroCertaintyScore");
    DOM.heroRiskGrade = document.getElementById("heroRiskGrade");
    DOM.heroGradeDesc = document.getElementById("heroGradeDesc");
    DOM.heroRetainedSplitScore = document.getElementById("heroRetainedSplitScore");
    DOM.heroSplitStatusBadge = document.getElementById("heroSplitStatusBadge");
    DOM.heroRetainedSplitDesc = document.getElementById("heroRetainedSplitDesc");

    // Layer 1 Analytical Pre-Check
    DOM.layer1EdgeLabel = document.getElementById("layer1EdgeLabel");
    DOM.cellBreakEvenWR = document.getElementById("cellBreakEvenWR");
    DOM.cellEvPerTrade = document.getElementById("cellEvPerTrade");
    DOM.cellEvPerTradeDollar = document.getElementById("cellEvPerTradeDollar");
    DOM.cellLossesToDaily = document.getElementById("cellLossesToDaily");
    DOM.cellDailyMarginSub = document.getElementById("cellDailyMarginSub");
    DOM.cellLossesToMax = document.getElementById("cellLossesToMax");
    DOM.cellHurdleSub = document.getElementById("cellHurdleSub");

    // Stage Funnels
    DOM.funnelP1Row = document.getElementById("funnelP1Row");
    DOM.funnelP1Val = document.getElementById("funnelP1Val");
    DOM.funnelP1Bar = document.getElementById("funnelP1Bar");
    DOM.funnelP2Row = document.getElementById("funnelP2Row");
    DOM.funnelP2Val = document.getElementById("funnelP2Val");
    DOM.funnelP2Bar = document.getElementById("funnelP2Bar");
    DOM.funnelFundedVal = document.getElementById("funnelFundedVal");
    DOM.funnelFundedBar = document.getElementById("funnelFundedBar");
    DOM.funnelEndToEndVal = document.getElementById("funnelEndToEndVal");
    DOM.funnelEndToEndBar = document.getElementById("funnelEndToEndBar");

    // Layer 3 Economic ROI
    DOM.layer3AttemptsLabel = document.getElementById("layer3AttemptsLabel");
    DOM.cellChallengeFee = document.getElementById("cellChallengeFee");
    DOM.cellTrueCost = document.getElementById("cellTrueCost");
    DOM.cellBreakEvenCycles = document.getElementById("cellBreakEvenCycles");
    DOM.cellMedianRoi = document.getElementById("cellMedianRoi");
    DOM.cellMedianRoiPct = document.getElementById("cellMedianRoiPct");

    // Dollar Math
    DOM.dollarMathSizeLabel = document.getElementById("dollarMathSizeLabel");
    DOM.cellDailyLoss = document.getElementById("cellDailyLoss");
    DOM.cellDailyLossPct = document.getElementById("cellDailyLossPct");
    DOM.cellMaxLoss = document.getElementById("cellMaxLoss");
    DOM.cellMaxLossPct = document.getElementById("cellMaxLossPct");
    DOM.cellFloatingCap = document.getElementById("cellFloatingCap");
    DOM.cellFloatingCapPct = document.getElementById("cellFloatingCapPct");
    DOM.cellProfitTarget = document.getElementById("cellProfitTarget");
    DOM.cellProfitTargetPct = document.getElementById("cellProfitTargetPct");
    DOM.cellCushion = document.getElementById("cellCushion");
    DOM.cellCushionSub = document.getElementById("cellCushionSub");
    DOM.cellMaxLots = document.getElementById("cellMaxLots");

    // 5x5 Sensitivity Heatmap
    DOM.sensitivityHeatmapBody = document.getElementById("sensitivityHeatmapBody");

    // Top 5 Killers
    DOM.certaintyKillersList = document.getElementById("certaintyKillersList");

    // Day-by-Day Replay
    DOM.replayRunSelect = document.getElementById("replayRunSelect");
    DOM.replayDayScrubber = document.getElementById("replayDayScrubber");
    DOM.replayDayDisplay = document.getElementById("replayDayDisplay");
    DOM.replaySvgChart = document.getElementById("replaySvgChart");
    DOM.replayBreachStatus = document.getElementById("replayBreachStatus");

    // Monte Carlo
    DOM.mcSliderWinRate = document.getElementById("mcSliderWinRate");
    DOM.mcValWinRate = document.getElementById("mcValWinRate");
    DOM.mcSliderRR = document.getElementById("mcSliderRR");
    DOM.mcValRR = document.getElementById("mcValRR");
    DOM.mcSliderRisk = document.getElementById("mcSliderRisk");
    DOM.mcValRisk = document.getElementById("mcValRisk");
    DOM.mcSliderTradesDay = document.getElementById("mcSliderTradesDay");
    DOM.mcValTradesDay = document.getElementById("mcValTradesDay");
    DOM.mcSliderVariance = document.getElementById("mcSliderVariance");
    DOM.mcValVariance = document.getElementById("mcValVariance");
    DOM.mcSliderMAE = document.getElementById("mcSliderMAE");
    DOM.mcValMAE = document.getElementById("mcValMAE");
    DOM.btnRunMonteCarlo = document.getElementById("btnRunMonteCarlo");
    DOM.mcExecutionBadge = document.getElementById("mcExecutionBadge");
    DOM.mcMetricEval = document.getElementById("mcMetricEval");
    DOM.mcMetricFunded = document.getElementById("mcMetricFunded");
    DOM.mcMetricEndToEnd = document.getElementById("mcMetricEndToEnd");
    DOM.mcFailureTags = document.getElementById("mcFailureTags");

    // Modals & Sandbox
    DOM.btnOpenSandbox = document.getElementById("btnOpenSandbox");
    DOM.modalSandbox = document.getElementById("modalSandbox");
    DOM.btnCloseSandbox = document.getElementById("btnCloseSandbox");
    DOM.btnCloseSandbox2 = document.getElementById("btnCloseSandbox2");
    DOM.tabBtnSandboxTicket = document.getElementById("tabBtnSandboxTicket");
    DOM.tabBtnCsvImporter = document.getElementById("tabBtnCsvImporter");
    DOM.sandboxTicketView = document.getElementById("sandboxTicketView");
    DOM.csvImporterView = document.getElementById("csvImporterView");

    DOM.sbAsset = document.getElementById("sbAsset");
    DOM.sbLotSize = document.getElementById("sbLotSize");
    DOM.sbSlPct = document.getElementById("sbSlPct");
    DOM.sbNewsWindow = document.getElementById("sbNewsWindow");
    DOM.sbHoldTime = document.getElementById("sbHoldTime");
    DOM.sbSameAssetPos = document.getElementById("sbSameAssetPos");
    DOM.sbMinsSinceLoss = document.getElementById("sbMinsSinceLoss");
    DOM.btnRunSandboxAudit = document.getElementById("btnRunSandboxAudit");
    DOM.firmAuditGrid = document.getElementById("firmAuditGrid");

    DOM.csvDropzone = document.getElementById("csvDropzone");
    DOM.csvFileInput = document.getElementById("csvFileInput");
    DOM.btnLoadSampleCsv = document.getElementById("btnLoadSampleCsv");
    DOM.btnRunBootstrapMc = document.getElementById("btnRunBootstrapMc");
    DOM.bootstrapResultsBox = document.getElementById("bootstrapResultsBox");
    DOM.bootPassRate = document.getElementById("bootPassRate");
    DOM.bootDDBreachRate = document.getElementById("bootDDBreachRate");
    DOM.bootTradesCount = document.getElementById("bootTradesCount");

    DOM.btnOpenHeatmap = document.getElementById("btnOpenHeatmap");
    DOM.modalHeatmap = document.getElementById("modalHeatmap");
    DOM.btnCloseHeatmap = document.getElementById("btnCloseHeatmap");
    DOM.btnCloseHeatmap2 = document.getElementById("btnCloseHeatmap2");
    DOM.heatmapTableBody = document.getElementById("heatmapTableBody");
    DOM.btnExportHeatmapMd = document.getElementById("btnExportHeatmapMd");

    DOM.btnOpenPresets = document.getElementById("btnOpenPresets");
    DOM.drawerPresets = document.getElementById("drawerPresets");
    DOM.panelPresets = document.getElementById("panelPresets");
    DOM.btnClosePresets = document.getElementById("btnClosePresets");
    DOM.preloadedPresetsList = document.getElementById("preloadedPresetsList");
    DOM.userScenariosList = document.getElementById("userScenariosList");

    DOM.btnOpenCalibration = document.getElementById("btnOpenCalibration");
    DOM.drawerCalibration = document.getElementById("drawerCalibration");
    DOM.panelCalibration = document.getElementById("panelCalibration");
    DOM.btnCloseCalibration = document.getElementById("btnCloseCalibration");

    DOM.btnSaveCurrentScenario = document.getElementById("btnSaveCurrentScenario");
    DOM.btnExportMarkdown = document.getElementById("btnExportMarkdown");
    DOM.btnExportJson = document.getElementById("btnExportJson");
    DOM.btnPrintPdf = document.getElementById("btnPrintPdf");

    DOM.modalAddCustomRule = document.getElementById("modalAddCustomRule");
    DOM.btnCloseAddRule = document.getElementById("btnCloseAddRule");
    DOM.btnCloseAddRule2 = document.getElementById("btnCloseAddRule2");
    DOM.btnSaveCustomRule = document.getElementById("btnSaveCustomRule");

    DOM.modalEditRule = document.getElementById("modalEditRule");
    DOM.btnCloseEditRule = document.getElementById("btnCloseEditRule");
    DOM.btnCloseEditRule2 = document.getElementById("btnCloseEditRule2");
    DOM.btnSaveEditRule = document.getElementById("btnSaveEditRule");

    DOM.toastContainer = document.getElementById("toastContainer");
  }

  function initDefaultSelections() {
    const universalRules = window.FIRMS_DATA_HELPER.getUniversalRules();
    universalRules.forEach(r => {
      if (r.defaultChecked !== false) {
        state.checkedUniversalRules.add(r.id);
      }
    });

    const twoStepRules = window.FIRMS_DATA_HELPER.getRulesByModule("twoStepStd");
    twoStepRules.forEach(r => {
      if (r.id === "fp_2s_std_target_dd" || r.id === "ps_2s_target_dd") {
        state.checkedRulesByModule.twoStepStd.add(r.id);
      }
    });

    const instantRules = window.FIRMS_DATA_HELPER.getRulesByModule("instant");
    instantRules.forEach(r => {
      if (r.id === "fp_inst_dl3" || r.id === "fp_inst_max_dd" || r.id === "fp_inst_floating") {
        state.checkedRulesByModule.instant.add(r.id);
      }
    });
  }

  function bindEvents() {
    // Module Tabs
    DOM.moduleTabsContainer.addEventListener("click", e => {
      const tabBtn = e.target.closest(".module-tab-btn");
      if (!tabBtn) return;
      const modId = tabBtn.dataset.module;
      if (modId && modId !== state.currentModule) {
        switchModule(modId);
      }
    });

    // Account Size Selector
    DOM.sizePillsContainer.addEventListener("click", e => {
      const pill = e.target.closest(".size-pill-btn");
      if (!pill) return;
      const size = parseInt(pill.dataset.size, 10);
      if (size && size !== state.accountSize) {
        state.accountSize = size;
        document.querySelectorAll(".size-pill-btn").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        recalculateAll();
        showToast(`Account Size: $${size.toLocaleString()}`);
      }
    });

    // Firm Filter Chips
    DOM.firmFilterGroup.addEventListener("click", e => {
      const chip = e.target.closest(".firm-chip");
      if (!chip) return;
      const firm = chip.dataset.firm;
      if (firm === "all") {
        const isAllActive = chip.classList.contains("active");
        document.querySelectorAll(".firm-chip").forEach(c => {
          if (isAllActive) {
            c.classList.remove("active");
            state.firmFilters.clear();
          } else {
            c.classList.add("active");
            state.firmFilters.add(c.dataset.firm);
          }
        });
      } else {
        chip.classList.toggle("active");
        if (chip.classList.contains("active")) {
          state.firmFilters.add(firm);
        } else {
          state.firmFilters.delete(firm);
          document.querySelector('.firm-chip[data-firm="all"]').classList.remove("active");
        }
      }
      renderActiveModule();
      renderUniversalRules();
    });

    // Auto-Select Worst Case
    DOM.btnAutoWorstCase.addEventListener("click", () => {
      const nativeRules = window.FIRMS_DATA_HELPER.getRulesByModule(state.currentModule);
      const worstIds = state.clipboardManager.synthesizeWorstCaseForModule(state.currentModule, nativeRules);
      
      state.checkedRulesByModule[state.currentModule].clear();
      worstIds.forEach(id => state.checkedRulesByModule[state.currentModule].add(id));

      renderActiveModule();
      recalculateAll();
      showToast(`Activated Worst-Case Constraints for ${state.currentModule}`);
    });

    // Copy Checked Rules
    DOM.btnCopyCheckedRules.addEventListener("click", () => {
      const activeChecked = getActiveCheckedRules();
      const count = state.clipboardManager.copyCheckedRules(activeChecked, state.currentModule);
      updateClipboardUI();
      showToast(`Copied ${count} checked rules to cross-module clipboard!`);
    });

    // Paste Clipboard Rules
    DOM.btnPasteClipboard.addEventListener("click", () => {
      const newImports = state.clipboardManager.pasteIntoModule(
        state.currentModule,
        state.importedRulesByModule[state.currentModule]
      );
      if (newImports.length === 0) {
        showToast("No new foreign rules to paste into this module.");
        return;
      }
      newImports.forEach(imp => {
        state.importedRulesByModule[state.currentModule].push(imp);
        state.checkedRulesByModule[state.currentModule].add(imp.id);
      });
      renderActiveModule();
      updateClipboardUI();
      recalculateAll();
      showToast(`Pasted ${newImports.length} foreign rules into ${state.currentModule}!`);
    });

    DOM.btnClearClipboard.addEventListener("click", () => {
      state.clipboardManager.clearClipboard();
      updateClipboardUI();
      showToast("Cross-module clipboard cleared.");
    });

    // Universal Policies Header Collapse Toggle
    DOM.universalToggleHeader.addEventListener("click", () => {
      state.universalCollapsed = !state.universalCollapsed;
      DOM.universalRulesContainer.style.display = state.universalCollapsed ? "none" : "flex";
      DOM.universalChevron.style.transform = state.universalCollapsed ? "rotate(-90deg)" : "rotate(0deg)";
    });

    // Rule Buckets Header Collapse Delegation & Actions
    DOM.ruleBucketsContainer.addEventListener("click", e => {
      const header = e.target.closest(".rule-bucket-header");
      if (header) {
        const catId = header.dataset.category;
        const body = document.getElementById(`bucketBody_${catId}`);
        const chevron = document.getElementById(`bucketChevron_${catId}`);
        if (body) {
          const isHidden = body.style.display === "none";
          body.style.display = isHidden ? "flex" : "none";
          if (chevron) chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
          if (isHidden) state.collapsedBuckets.delete(catId);
          else state.collapsedBuckets.add(catId);
        }
        return;
      }

      // Checkbox click
      const checkbox = e.target.closest(".rule-checkbox");
      if (checkbox) {
        const ruleId = checkbox.dataset.ruleId;
        const isChecked = checkbox.checked;
        const ruleCard = document.getElementById(`card_${ruleId}`);

        if (isChecked) {
          state.checkedRulesByModule[state.currentModule].add(ruleId);
          if (ruleCard) ruleCard.classList.add("checked");
        } else {
          state.checkedRulesByModule[state.currentModule].delete(ruleId);
          if (ruleCard) ruleCard.classList.remove("checked");
        }
        recalculateAll();
        return;
      }

      // Copy Rule
      const copyBtn = e.target.closest(".btn-copy-rule");
      if (copyBtn) {
        const ruleId = copyBtn.dataset.ruleId;
        const rule = findRuleById(ruleId);
        if (rule) {
          state.clipboardManager.copyRule(rule, state.currentModule);
          updateClipboardUI();
          showToast(`Rule "${rule.title}" copied to clipboard!`);
        }
        return;
      }

      // Remove Imported
      const removeBtn = e.target.closest(".btn-remove-imported");
      if (removeBtn) {
        const ruleId = removeBtn.dataset.ruleId;
        state.importedRulesByModule[state.currentModule] = state.importedRulesByModule[state.currentModule].filter(r => r.id !== ruleId);
        state.checkedRulesByModule[state.currentModule].delete(ruleId);
        renderActiveModule();
        recalculateAll();
        showToast("Removed imported rule from module.");
        return;
      }

      // Edit Rule
      const editBtn = e.target.closest(".btn-edit-rule");
      if (editBtn) {
        const ruleId = editBtn.dataset.ruleId;
        const rule = findRuleById(ruleId);
        if (rule) openEditRuleModal(rule);
        return;
      }
    });

    // 1-Click "Disable & Test" on Rule Killers
    DOM.certaintyKillersList.addEventListener("click", e => {
      const disableBtn = e.target.closest(".btn-disable-killer");
      if (!disableBtn) return;
      const ruleId = disableBtn.dataset.ruleId;

      if (state.checkedRulesByModule[state.currentModule].has(ruleId)) {
        state.checkedRulesByModule[state.currentModule].delete(ruleId);
      }
      if (state.checkedUniversalRules.has(ruleId)) {
        state.checkedUniversalRules.delete(ruleId);
      }

      const card = document.getElementById(`card_${ruleId}`);
      if (card) {
        card.classList.remove("checked");
        const cb = card.querySelector(".rule-checkbox");
        if (cb) cb.checked = false;
      }

      recalculateAll();
      showToast(`Disabled killer rule. Passing rate recalculated!`);
    });

    // Universal Checkbox clicks
    DOM.universalRulesContainer.addEventListener("click", e => {
      const checkbox = e.target.closest(".rule-checkbox");
      if (checkbox) {
        const ruleId = checkbox.dataset.ruleId;
        const isChecked = checkbox.checked;
        const ruleCard = document.getElementById(`card_${ruleId}`);

        if (isChecked) {
          state.checkedUniversalRules.add(ruleId);
          if (ruleCard) ruleCard.classList.add("checked");
        } else {
          state.checkedUniversalRules.delete(ruleId);
          if (ruleCard) ruleCard.classList.remove("checked");
        }
        recalculateAll();
      }
    });

    // Monte Carlo Sliders (Interactive Layer 1 & 2 recalculation)
    DOM.mcSliderWinRate.addEventListener("input", e => {
      state.mcParams.winRate = parseFloat(e.target.value);
      DOM.mcValWinRate.textContent = `${state.mcParams.winRate}%`;
      recalculateAll();
    });
    DOM.mcSliderRR.addEventListener("input", e => {
      state.mcParams.avgRR = parseFloat(e.target.value);
      DOM.mcValRR.textContent = `${state.mcParams.avgRR.toFixed(2)}R`;
      recalculateAll();
    });
    DOM.mcSliderRisk.addEventListener("input", e => {
      state.mcParams.riskPct = parseFloat(e.target.value);
      DOM.mcValRisk.textContent = `${state.mcParams.riskPct.toFixed(2)}%`;
      recalculateAll();
    });
    DOM.mcSliderTradesDay.addEventListener("input", e => {
      state.mcParams.tradesPerDay = parseInt(e.target.value, 10);
      DOM.mcValTradesDay.textContent = state.mcParams.tradesPerDay;
    });
    DOM.mcSliderVariance.addEventListener("input", e => {
      state.mcParams.variance = parseFloat(e.target.value);
      DOM.mcValVariance.textContent = state.mcParams.variance.toFixed(2);
    });
    DOM.mcSliderMAE.addEventListener("input", e => {
      state.mcParams.maeRiskPct = parseInt(e.target.value, 10);
      DOM.mcValMAE.textContent = `${state.mcParams.maeRiskPct}%`;
    });

    DOM.btnRunMonteCarlo.addEventListener("click", () => {
      runMonteCarlo();
    });

    // Day-by-Day Replay Controls
    DOM.replayRunSelect.addEventListener("change", e => {
      state.selectedRunId = e.target.value;
      renderReplayChart();
    });

    DOM.replayDayScrubber.addEventListener("input", e => {
      state.scrubberDay = parseInt(e.target.value, 10);
      DOM.replayDayDisplay.textContent = `${state.scrubberDay}/60`;
      renderReplayChart();
    });

    // Pre-Trade Sandbox Modal Controls
    DOM.btnOpenSandbox.addEventListener("click", () => {
      DOM.modalSandbox.classList.add("open");
      runSandboxAudit();
    });
    DOM.btnCloseSandbox.addEventListener("click", () => DOM.modalSandbox.classList.remove("open"));
    DOM.btnCloseSandbox2.addEventListener("click", () => DOM.modalSandbox.classList.remove("open"));

    DOM.tabBtnSandboxTicket.addEventListener("click", () => {
      DOM.tabBtnSandboxTicket.classList.add("active");
      DOM.tabBtnCsvImporter.classList.remove("active");
      DOM.sandboxTicketView.style.display = "block";
      DOM.csvImporterView.style.display = "none";
    });

    DOM.tabBtnCsvImporter.addEventListener("click", () => {
      DOM.tabBtnCsvImporter.classList.add("active");
      DOM.tabBtnSandboxTicket.classList.remove("active");
      DOM.csvImporterView.style.display = "block";
      DOM.sandboxTicketView.style.display = "none";
    });

    DOM.btnRunSandboxAudit.addEventListener("click", () => {
      runSandboxAudit();
    });

    // CSV Drag and drop / file upload
    DOM.csvDropzone.addEventListener("click", () => DOM.csvFileInput.click());
    DOM.csvFileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          handleCsvContent(ev.target.result);
        };
        reader.readAsText(file);
      }
    });

    DOM.btnLoadSampleCsv.addEventListener("click", () => {
      const sample = state.clipboardManager.generateSampleTrades();
      state.parsedCsvTrades = sample;
      DOM.btnRunBootstrapMc.removeAttribute("disabled");
      showToast(`Loaded ${sample.length} sample institutional trades. Click "Run 10,000 Bootstrap Resamples"!`);
    });

    DOM.btnRunBootstrapMc.addEventListener("click", () => {
      runBootstrapSimulation();
    });

    // Heatmap Modal
    DOM.btnOpenHeatmap.addEventListener("click", () => {
      renderHeatmapModal();
      DOM.modalHeatmap.classList.add("open");
    });
    DOM.btnCloseHeatmap.addEventListener("click", () => DOM.modalHeatmap.classList.remove("open"));
    DOM.btnCloseHeatmap2.addEventListener("click", () => DOM.modalHeatmap.classList.remove("open"));
    DOM.btnExportHeatmapMd.addEventListener("click", () => exportHeatmapMarkdown());

    DOM.heatmapTableBody.addEventListener("click", e => {
      const cell = e.target.closest(".heatmap-cell");
      if (!cell) return;
      const modId = cell.dataset.module;
      const size = parseInt(cell.dataset.size, 10);
      if (modId && size) {
        DOM.modalHeatmap.classList.remove("open");
        switchModule(modId);
        state.accountSize = size;
        document.querySelectorAll(".size-pill-btn").forEach(p => {
          if (parseInt(p.dataset.size, 10) === size) p.classList.add("active");
          else p.classList.remove("active");
        });
        DOM.btnAutoWorstCase.click();
        showToast(`Jumped to ${modId} ($${size.toLocaleString()}) in Worst-Case Mode!`);
      }
    });

    // Presets Drawer
    DOM.btnOpenPresets.addEventListener("click", () => {
      renderPresetsDrawer();
      DOM.drawerPresets.classList.add("open");
      DOM.panelPresets.classList.add("open");
    });
    DOM.btnClosePresets.addEventListener("click", () => {
      DOM.drawerPresets.classList.remove("open");
      DOM.panelPresets.classList.remove("open");
    });

    DOM.panelPresets.addEventListener("click", e => {
      const loadBtn = e.target.closest(".btn-load-preset");
      if (loadBtn) {
        loadScenarioById(loadBtn.dataset.presetId);
        DOM.btnClosePresets.click();
        return;
      }
      const delBtn = e.target.closest(".btn-delete-preset");
      if (delBtn) {
        state.clipboardManager.deleteCustomScenario(delBtn.dataset.presetId);
        renderPresetsDrawer();
        showToast("Custom scenario deleted.");
      }
    });

    // Calibrate Weights Drawer
    DOM.btnOpenCalibration.addEventListener("click", () => {
      DOM.drawerCalibration.classList.add("open");
      DOM.panelCalibration.classList.add("open");
    });
    DOM.btnCloseCalibration.addEventListener("click", () => {
      DOM.drawerCalibration.classList.remove("open");
      DOM.panelCalibration.classList.remove("open");
    });

    const setupCalibSlider = (sliderId, labelId, ruleKey, defaultVal) => {
      const slider = document.getElementById(sliderId);
      const label = document.getElementById(labelId);
      if (!slider || !label) return;
      slider.addEventListener("input", e => {
        const val = parseFloat(e.target.value);
        state.probEngine.setWeightOverride(ruleKey, val);
        const penalty = Math.round((1 - val) * 100);
        label.textContent = `${val.toFixed(2)}x (-${penalty}% rel.)`;
        recalculateAll();
      });
    };
    setupCalibSlider("calibDL3", "calibDL3Val", "fp_inst_dl3", 0.74);
    setupCalibSlider("calibDL1", "calibDL1Val", "fp_labs_target_dd", 0.32);
    setupCalibSlider("calibFlt1", "calibFlt1Val", "fp_inst_floating", 0.52);
    setupCalibSlider("calibCons15", "calibCons15Val", "tfr_inst_dual_consistency", 0.48);
    setupCalibSlider("calibHold60", "calibHold60Val", "ps_inst_hold_reversal", 0.70);

    document.getElementById("btnResetCalibration").addEventListener("click", () => {
      state.probEngine.customHazardWeights = {};
      recalculateAll();
      showToast("Weights reset to verified empirical baselines.");
    });

    // Custom Rule Modal
    DOM.btnAddCustomRule.addEventListener("click", () => DOM.modalAddCustomRule.classList.add("open"));
    DOM.btnCloseAddRule.addEventListener("click", () => DOM.modalAddCustomRule.classList.remove("open"));
    DOM.btnCloseAddRule2.addEventListener("click", () => DOM.modalAddCustomRule.classList.remove("open"));
    DOM.btnSaveCustomRule.addEventListener("click", () => {
      const title = document.getElementById("customRuleTitle").value.trim();
      const cat = document.getElementById("customRuleCategory").value;
      const thresh = document.getElementById("customRuleThreshold").value.trim();
      const severity = document.getElementById("customRuleSeverity").value;
      const mult = parseFloat(document.getElementById("customRuleMultiplier").value) || 0.85;

      if (!title) {
        showToast("Please enter a rule title.");
        return;
      }

      const customObj = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        firmId: "custom",
        firmName: "Custom Rule",
        modelName: "User Defined",
        module: state.currentModule,
        category: cat,
        ruleType: "custom",
        title: title,
        thresholdText: thresh || title,
        thresholdValue: null,
        severity: severity,
        isWorstCase: false,
        impactMultiplier: mult,
        impactLabel: `-${Math.round((1 - mult) * 100)}% rel.`,
        impactStage: "both",
        description: "User-defined custom prop firm constraint.",
        isCustom: true
      };

      state.customRulesByModule[state.currentModule].push(customObj);
      state.checkedRulesByModule[state.currentModule].add(customObj.id);

      DOM.modalAddCustomRule.classList.remove("open");
      renderActiveModule();
      recalculateAll();
      showToast(`Added custom rule: ${title}`);
    });

    // Edit Rule Modal
    DOM.btnCloseEditRule.addEventListener("click", () => DOM.modalEditRule.classList.remove("open"));
    DOM.btnCloseEditRule2.addEventListener("click", () => DOM.modalEditRule.classList.remove("open"));
    DOM.btnSaveEditRule.addEventListener("click", () => {
      const ruleId = document.getElementById("editRuleId").value;
      const title = document.getElementById("editRuleTitle").value.trim();
      const threshText = document.getElementById("editRuleThresholdText").value.trim();
      const mult = parseFloat(document.getElementById("editRuleMultiplier").value) || 0.90;

      const rule = findRuleById(ruleId);
      if (rule) {
        rule.title = title;
        rule.thresholdText = threshText;
        rule.impactMultiplier = mult;
        rule.impactLabel = `-${Math.round((1 - mult) * 100)}% rel.`;

        DOM.modalEditRule.classList.remove("open");
        renderActiveModule();
        recalculateAll();
        showToast(`Rule updated: ${title}`);
      }
    });

    // Save & Export
    DOM.btnSaveCurrentScenario.addEventListener("click", () => {
      const scenarioName = prompt("Enter a name for this Scenario Preset:", `${state.currentModule.toUpperCase()} Custom Setup`);
      if (!scenarioName) return;

      const scenario = {
        id: `scenario_${Date.now()}`,
        name: scenarioName,
        badge: "Custom",
        description: `Saved with ${state.checkedRulesByModule[state.currentModule].size} active rules at $${state.accountSize.toLocaleString()}`,
        moduleId: state.currentModule,
        accountSize: state.accountSize,
        checkedRuleIds: Array.from(state.checkedRulesByModule[state.currentModule]),
        importedRules: [...state.importedRulesByModule[state.currentModule]],
        customRules: [...state.customRulesByModule[state.currentModule]]
      };

      state.clipboardManager.saveCustomScenario(scenario);
      showToast(`Scenario "${scenarioName}" saved!`);
    });

    DOM.btnExportMarkdown.addEventListener("click", () => exportPlaybookMarkdown());
    DOM.btnExportJson.addEventListener("click", () => exportPlaybookJson());
    DOM.btnPrintPdf.addEventListener("click", () => window.print());
  }

  // ==========================================
  // RENDER CONTROLLERS
  // ==========================================

  function renderModuleTabs() {
    DOM.moduleTabsContainer.innerHTML = "";
    window.MODULE_DEFINITIONS.forEach(mod => {
      const btn = document.createElement("button");
      btn.className = `module-tab-btn ${mod.id === state.currentModule ? "active" : ""}`;
      btn.dataset.module = mod.id;
      btn.innerHTML = `
        <span class="tab-name">${mod.name}</span>
        <span class="tab-sub">${mod.subtitle}</span>
      `;
      DOM.moduleTabsContainer.appendChild(btn);
    });
  }

  function switchModule(modId) {
    state.currentModule = modId;
    document.querySelectorAll(".module-tab-btn").forEach(btn => {
      if (btn.dataset.module === modId) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    const modDef = window.MODULE_DEFINITIONS.find(m => m.id === modId);
    if (modDef) {
      DOM.activeModuleTitle.textContent = `${modDef.name} (${modDef.subtitle})`;
      DOM.activeModuleBadge.textContent = modDef.badge;
    }

    const baseInfo = window.BENCHMARKS_DATA.moduleBaselines[modId];
    if (baseInfo) {
      DOM.activeModuleMeta.textContent = baseInfo.description;
    }

    renderActiveModule();
    updateClipboardUI();
    recalculateAll();
  }

  function updateClipboardUI() {
    const clipboard = state.clipboardManager.getClipboard();
    const foreignItems = clipboard.filter(c => c.copiedFromModule !== state.currentModule);

    if (foreignItems.length > 0) {
      DOM.clipboardNotificationBanner.style.display = "flex";
      DOM.clipboardBannerMsg.textContent = `Clipboard contains ${foreignItems.length} copied rule(s) ready to paste here.`;
    } else {
      DOM.clipboardNotificationBanner.style.display = "none";
    }
  }

  function renderActiveModule() {
    const nativeRules = window.FIRMS_DATA_HELPER.getRulesByModule(state.currentModule);
    const importedRules = state.importedRulesByModule[state.currentModule] || [];
    const customRules = state.customRulesByModule[state.currentModule] || [];
    const allModuleRules = [...nativeRules, ...importedRules, ...customRules];

    const visibleRules = allModuleRules.filter(r => {
      if (r.isCustom) return true;
      if (state.firmFilters.has("all")) return true;
      return state.firmFilters.has(r.firmId);
    });

    DOM.activeModuleRulesCount.textContent = `${visibleRules.length} rules loaded (${nativeRules.length} native, ${importedRules.length} imported)`;

    const byCategory = {};
    window.RULE_CATEGORIES.forEach(cat => byCategory[cat.id] = []);
    visibleRules.forEach(rule => {
      if (!byCategory[rule.category]) byCategory[rule.category] = [];
      byCategory[rule.category].push(rule);
    });

    DOM.ruleBucketsContainer.innerHTML = "";

    window.RULE_CATEGORIES.forEach(cat => {
      const rules = byCategory[cat.id] || [];
      if (rules.length === 0) return;

      const checkedCount = rules.filter(r => state.checkedRulesByModule[state.currentModule].has(r.id)).length;
      const isCollapsed = state.collapsedBuckets.has(cat.id);

      const bucketCard = document.createElement("div");
      bucketCard.className = "rule-bucket-card";
      bucketCard.id = `bucketCard_${cat.id}`;

      bucketCard.innerHTML = `
        <div class="rule-bucket-header" data-category="${cat.id}">
          <div class="bucket-header-left">
            <span class="bucket-title">${cat.name}</span>
            <span class="bucket-counter font-mono">(${checkedCount}/${rules.length} active)</span>
          </div>
          <svg id="bucketChevron_${cat.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: ${isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="bucket-body" id="bucketBody_${cat.id}" style="display: ${isCollapsed ? 'none' : 'flex'};">
          ${rules.map(rule => renderRuleCardHtml(rule)).join("")}
        </div>
      `;

      DOM.ruleBucketsContainer.appendChild(bucketCard);
    });
  }

  function renderUniversalRules() {
    const universalRules = window.FIRMS_DATA_HELPER.getUniversalRules();
    const visibleUniversal = universalRules.filter(r => {
      if (state.firmFilters.has("all")) return true;
      return state.firmFilters.has(r.firmId);
    });

    DOM.universalRulesContainer.innerHTML = visibleUniversal.map(rule => {
      const isChecked = state.checkedUniversalRules.has(rule.id);
      return renderRuleCardHtml(rule, isChecked, true);
    }).join("");
  }

  function renderRuleCardHtml(rule, forceChecked = null, isUniversal = false) {
    const isChecked = forceChecked !== null ? forceChecked : state.checkedRulesByModule[state.currentModule].has(rule.id);
    const firmInfo = window.FIRMS_INFO[rule.firmId] || { shortName: "FX", name: rule.firmName || "Prop" };
    
    let firmTagClass = "firm-tag";
    if (rule.firmId === "fundingpips") firmTagClass += " firm-tag-fp";
    else if (rule.firmId === "fundedsquad") firmTagClass += " firm-tag-fs";
    else if (rule.firmId === "pipstone") firmTagClass += " firm-tag-ps";
    else if (rule.firmId === "fundednext") firmTagClass += " firm-tag-fn";
    else if (rule.firmId === "thefundedroom") firmTagClass += " firm-tag-tfr";

    let severityBadge = "";
    if (rule.severity === "hard") {
      severityBadge = '<span class="badge badge-hard">Hard Breach</span>';
    } else if (rule.severity === "soft") {
      severityBadge = '<span class="badge badge-soft">Soft Breach / Penalty</span>';
    } else {
      severityBadge = '<span class="badge badge-friction">Friction</span>';
    }

    let impactClass = "impact-med";
    if (rule.impactMultiplier <= 0.65) impactClass = "impact-high";
    else if (rule.impactMultiplier > 1.0) impactClass = "impact-positive";

    const importedBadge = rule.isImported
      ? `<span class="badge badge-imported">${rule.importedFromBadge}</span>`
      : "";

    const deleteBtn = rule.isImported
      ? `<button class="action-icon-btn danger btn-remove-imported" data-rule-id="${rule.id}" title="Remove imported rule">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
         </button>`
      : "";

    return `
      <div class="rule-card ${isChecked ? 'checked' : ''}" id="card_${rule.id}">
        <div class="rule-checkbox-wrapper">
          <input type="checkbox" class="rule-checkbox" data-rule-id="${rule.id}" ${isChecked ? 'checked' : ''}>
        </div>

        <div class="rule-content">
          <div class="rule-header-row">
            <span class="rule-title">${rule.title}</span>
            <span id="supersededBadge_${rule.id}" class="badge badge-superseded" style="display: none;">Superseded</span>
          </div>

          <div class="rule-threshold-text">${rule.thresholdText}</div>
          <div class="rule-desc">${rule.description || ""}</div>

          <div class="rule-provenance-row">
            <span class="${firmTagClass}">${firmInfo.name}</span>
            <span class="badge badge-friction">${rule.modelName}</span>
            ${severityBadge}
            ${importedBadge}
          </div>
        </div>

        <div class="rule-actions-col">
          <span class="impact-pill ${impactClass}">${rule.impactLabel || '-10% rel.'}</span>
          ${!isUniversal ? `
            <button class="action-icon-btn btn-copy-rule" data-rule-id="${rule.id}" title="Copy to cross-module clipboard">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="action-icon-btn btn-edit-rule" data-rule-id="${rule.id}" title="Edit threshold live">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          ` : ''}
          ${deleteBtn}
        </div>
      </div>
    `;
  }

  function getActiveCheckedRules() {
    const checkedIds = state.checkedRulesByModule[state.currentModule];
    const native = window.FIRMS_DATA_HELPER.getRulesByModule(state.currentModule);
    const imported = state.importedRulesByModule[state.currentModule] || [];
    const custom = state.customRulesByModule[state.currentModule] || [];
    const all = [...native, ...imported, ...custom];

    const activeList = all.filter(r => checkedIds.has(r.id));
    const universal = window.FIRMS_DATA_HELPER.getUniversalRules();
    const activeUniversal = universal.filter(u => state.checkedUniversalRules.has(u.id));

    return [...activeList, ...activeUniversal];
  }

  function findRuleById(ruleId) {
    const raw = window.RAW_RULES_DATA.find(r => r.id === ruleId);
    if (raw) return raw;

    for (const mod in state.importedRulesByModule) {
      const imp = state.importedRulesByModule[mod].find(r => r.id === ruleId);
      if (imp) return imp;
    }
    for (const mod in state.customRulesByModule) {
      const cust = state.customRulesByModule[mod].find(r => r.id === ruleId);
      if (cust) return cust;
    }
    return null;
  }

  // ==========================================
  // RECALCULATE CERTAINTY TELEMETRY & 3 LAYERS
  // ==========================================

  function recalculateAll() {
    const activeRules = getActiveCheckedRules();
    const result = state.probEngine.calculateCertainty(state.currentModule, activeRules, state.accountSize);

    // 1. Update Twin Hero Scores
    DOM.heroCertaintyScore.textContent = result.endToEndCertainty.toFixed(2);
    DOM.heroRiskGrade.textContent = `GRADE ${result.riskGrade}`;
    DOM.heroRiskGrade.style.color = result.gradeColor;
    DOM.heroRiskGrade.style.borderColor = result.gradeColor;
    DOM.heroRiskGrade.style.backgroundColor = `${result.gradeColor}10`;
    DOM.heroGradeDesc.textContent = `${result.gradeLabel} (${result.activeCount} active rules)`;

    // Retained Split Hero
    const econ = result.economics;
    DOM.heroRetainedSplitScore.textContent = econ.effectiveRetainedSplitPct;
    if (econ.effectiveRetainedSplitPct < econ.nominalSplitPct) {
      DOM.heroSplitStatusBadge.textContent = `SPLIT CUT: -${econ.nominalSplitPct - econ.effectiveRetainedSplitPct}%`;
      DOM.heroSplitStatusBadge.className = "badge badge-hard font-mono";
      DOM.heroRetainedSplitDesc.textContent = econ.splitSlashReason || "Penalty split reduction applied";
    } else {
      DOM.heroSplitStatusBadge.textContent = `NOMINAL ${econ.nominalSplitPct}%`;
      DOM.heroSplitStatusBadge.className = "badge badge-friction font-mono";
      DOM.heroRetainedSplitDesc.textContent = "Full nominal profit retention";
    }

    // 2. LAYER 1: Strategy Analytical Pre-Check
    const preCheck = state.probEngine.calculateAnalyticalPreCheck(state.mcParams, activeRules, state.accountSize);
    DOM.cellBreakEvenWR.textContent = `${preCheck.breakEvenWinRatePct}%`;
    DOM.layer1EdgeLabel.textContent = `Edge: ${preCheck.edgeOverBreakEven > 0 ? '+' : ''}${preCheck.edgeOverBreakEven}%`;
    DOM.layer1EdgeLabel.style.color = preCheck.edgeOverBreakEven >= 0 ? "var(--forest-text)" : "var(--crimson-text)";
    DOM.cellEvPerTrade.textContent = `${preCheck.evPerTradeR > 0 ? '+' : ''}${preCheck.evPerTradeR} R`;
    DOM.cellEvPerTradeDollar.textContent = `${preCheck.evPerTradeDollar > 0 ? '+' : ''}$${preCheck.evPerTradeDollar.toLocaleString()} / trade`;
    DOM.cellLossesToDaily.textContent = `${preCheck.lossesToDailyBreach} Trades`;
    DOM.cellDailyMarginSub.textContent = `at ${state.mcParams.riskPct}% risk`;
    DOM.cellLossesToMax.textContent = `${preCheck.lossesToMaxBreach} Trades`;
    DOM.cellHurdleSub.textContent = `Hurdle: ${preCheck.hurdleRatio}x`;

    // 3. Stage Funnels
    DOM.funnelP1Val.textContent = `${result.p1Certainty.toFixed(1)}%`;
    DOM.funnelP1Bar.style.width = `${Math.min(100, result.p1Certainty)}%`;

    if (result.p2Certainty !== null) {
      DOM.funnelP2Row.style.display = "flex";
      DOM.funnelP2Val.textContent = `${result.p2Certainty.toFixed(1)}%`;
      DOM.funnelP2Bar.style.width = `${Math.min(100, result.p2Certainty)}%`;
    } else {
      DOM.funnelP2Row.style.display = "none";
    }

    DOM.funnelFundedVal.textContent = `${result.fundedCertainty.toFixed(1)}%`;
    DOM.funnelFundedBar.style.width = `${Math.min(100, result.fundedCertainty)}%`;

    DOM.funnelEndToEndVal.textContent = `${result.endToEndCertainty.toFixed(2)}%`;
    DOM.funnelEndToEndBar.style.width = `${Math.min(100, result.endToEndCertainty * 2)}%`;

    // 4. LAYER 3: Economic ROI & Leakage Strip
    DOM.layer3AttemptsLabel.textContent = `${econ.expectedAttempts}x Attempts`;
    DOM.cellChallengeFee.textContent = `$${econ.challengeFee}`;
    DOM.cellTrueCost.textContent = `$${econ.trueCostToFunded.toLocaleString()}`;
    DOM.cellBreakEvenCycles.textContent = `${econ.breakEvenCycles} Payouts`;
    DOM.cellMedianRoi.textContent = `${econ.medianNet6mDollar >= 0 ? '+' : ''}$${econ.medianNet6mDollar.toLocaleString()}`;
    DOM.cellMedianRoi.style.color = econ.medianNet6mDollar >= 0 ? "var(--forest-text)" : "var(--crimson-text)";
    DOM.cellMedianRoiPct.textContent = `${econ.medianNet6mRoiPct >= 0 ? '+' : ''}${econ.medianNet6mRoiPct}% ROI`;

    // 5. Exact Dollar Math
    const dMath = result.dollarMath;
    DOM.dollarMathSizeLabel.textContent = `$${state.accountSize.toLocaleString()}`;
    DOM.cellDailyLoss.textContent = `$${Math.round(dMath.dailyLossDollar).toLocaleString()}`;
    DOM.cellDailyLossPct.textContent = `${dMath.dailyLossPct}% limit`;
    DOM.cellMaxLoss.textContent = `$${Math.round(dMath.maxLossDollar).toLocaleString()}`;
    DOM.cellMaxLossPct.textContent = `${dMath.maxDDPct}% max loss`;

    if (dMath.floatingCapDollar !== null) {
      DOM.cellFloatingCap.textContent = `$${Math.round(dMath.floatingCapDollar).toLocaleString()}`;
      DOM.cellFloatingCapPct.textContent = `-${dMath.floatingPct}% open limit`;
    } else {
      DOM.cellFloatingCap.textContent = "None";
      DOM.cellFloatingCapPct.textContent = "Unrestricted";
    }

    DOM.cellProfitTarget.textContent = `$${Math.round(dMath.profitTargetDollar).toLocaleString()}`;
    DOM.cellProfitTargetPct.textContent = `${dMath.profitTargetPct}% target`;

    if (dMath.cushionDollar > 0) {
      DOM.cellCushion.textContent = `$${Math.round(dMath.cushionDollar).toLocaleString()}`;
      DOM.cellCushionSub.textContent = "3.0% lock buffer";
    } else {
      DOM.cellCushion.textContent = "$0";
      DOM.cellCushionSub.textContent = "No cushion required";
    }
    DOM.cellMaxLots.textContent = `${dMath.maxFxLots} FX / ${dMath.maxGoldLots} Gold`;

    // 6. Conflict Resolution Badges
    activeRules.forEach(r => {
      const badge = document.getElementById(`supersededBadge_${r.id}`);
      const card = document.getElementById(`card_${r.id}`);
      if (!badge) return;
      if (r.isSuperseded) {
        badge.style.display = "inline-flex";
        badge.textContent = `Superseded by stricter rule (${r.supersededBy || ''})`;
        if (card) card.classList.add("superseded");
      } else {
        badge.style.display = "none";
        if (card) card.classList.remove("superseded");
      }
    });

    // 7. Top 5 Certainty Killers & Marginal Delta Inspector
    renderCertaintyKillersWithDelta(activeRules);

    // 8. 5x5 Sensitivity Heatmap
    renderSensitivityHeatmap(activeRules);

    // Update bucket counters in UI
    window.RULE_CATEGORIES.forEach(cat => {
      const bucketCard = document.getElementById(`bucketCard_${cat.id}`);
      if (bucketCard) {
        const counter = bucketCard.querySelector(".bucket-counter");
        const cards = bucketCard.querySelectorAll(".rule-card");
        const checked = bucketCard.querySelectorAll(".rule-card.checked");
        if (counter) counter.textContent = `(${checked.length}/${cards.length} active)`;
      }
    });
  }

  function renderCertaintyKillersWithDelta(activeRules) {
    const killers = state.probEngine.calculateMarginalRuleImpacts(state.currentModule, activeRules, state.accountSize);

    if (!killers || killers.length === 0) {
      DOM.certaintyKillersList.innerHTML = `
        <div style="font-size: 11px; color: var(--text-muted); padding: 8px; text-align: center;">
          No active constraints selected. Checking rules displays marginal probability delta.
        </div>
      `;
      return;
    }

    DOM.certaintyKillersList.innerHTML = killers.map((k, index) => {
      return `
        <div class="killer-item">
          <div class="killer-left">
            <span class="killer-title">#${index + 1} ${k.title}</span>
            <span class="killer-provenance font-mono">${k.firmName} · ${k.modelName}</span>
          </div>
          <div class="killer-right">
            <span class="killer-delta-badge" title="Pass rate gained if disabled">${k.formattedDelta}</span>
            <button class="btn btn-sm btn-crimson btn-disable-killer" data-rule-id="${k.id}" title="1-Click Disable & Test">
              Disable
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderSensitivityHeatmap(activeRules) {
    const heatmapData = state.probEngine.generateSensitivityHeatmap(state.mcParams, activeRules, state.accountSize);
    const rows = heatmapData.matrix;

    DOM.sensitivityHeatmapBody.innerHTML = rows.map(r => {
      const cellsHtml = r.cells.map(c => {
        let bg = "#F0FDF4";
        let text = "#15803D";
        if (c.passCertainty < 3.0) {
          bg = "#FEF2F2";
          text = "#B91C1C";
        } else if (c.passCertainty < 8.0) {
          bg = "#FFFBEB";
          text = "#B45309";
        }

        const sweetClass = c.isSweetSpot ? "sens-sweet-spot" : "";
        return `
          <td class="sens-cell ${sweetClass}" style="background: ${bg}; color: ${text};" title="WR: ${c.winRate}%, Risk: ${c.riskPct}% -> Pass: ${c.passCertainty}%">
            ${c.passCertainty}%
          </td>
        `;
      }).join("");

      return `
        <tr>
          <td style="font-weight: 600; text-align: left; background: #FAF8F5;">${r.winRate}% WR</td>
          ${cellsHtml}
        </tr>
      `;
    }).join("");
  }

  // ==========================================
  // MONTE CARLO SIMULATOR (10,000 PATHS)
  // ==========================================

  function runMonteCarlo() {
    const activeRules = getActiveCheckedRules();
    const result = state.probEngine.runMonteCarloSimulation(
      state.mcParams,
      activeRules,
      state.accountSize,
      10000
    );

    DOM.mcExecutionBadge.textContent = `${result.elapsedMs}ms (10,000 runs)`;
    DOM.mcMetricEval.textContent = `${result.mcP1Pass.toFixed(1)}%`;
    DOM.mcMetricFunded.textContent = `${result.mcFundedPass.toFixed(1)}%`;
    DOM.mcMetricEndToEnd.textContent = `${result.mcEndToEnd.toFixed(2)}%`;

    const fc = result.failureCauses;
    const totalFails = fc.dailyLoss + fc.maxDrawdown + fc.floatingCap + fc.consistencyTrap + fc.executionTrap + fc.targetTimeout;
    const pDL = totalFails > 0 ? Math.round((fc.dailyLoss / totalFails) * 100) : 0;
    const pDD = totalFails > 0 ? Math.round((fc.maxDrawdown / totalFails) * 100) : 0;
    const pFlt = totalFails > 0 ? Math.round((fc.floatingCap / totalFails) * 100) : 0;
    const pCons = totalFails > 0 ? Math.round((fc.consistencyTrap / totalFails) * 100) : 0;
    const pTime = totalFails > 0 ? Math.round((fc.targetTimeout / totalFails) * 100) : 0;

    document.getElementById("tagFailDL").textContent = `DL Breach: ${pDL}%`;
    document.getElementById("tagFailDD").textContent = `Max DD: ${pDD}%`;
    document.getElementById("tagFailFlt").textContent = `Floating Dip (MAE): ${pFlt}%`;
    document.getElementById("tagFailCons").textContent = `Consistency: ${pCons}%`;
    document.getElementById("tagFailTime").textContent = `Timeout: ${pTime}%`;

    // Cache sample runs and update Day-by-Day Replay Chart
    state.sampleRuns = [...result.samplePassingRuns, ...result.sampleFailedRuns];
    renderReplayChartOptions();
    renderReplayChart();
  }

  // ==========================================
  // DAY-BY-DAY REPLAY CHART (SVG)
  // ==========================================

  function renderReplayChartOptions() {
    if (!state.sampleRuns || state.sampleRuns.length === 0) return;
    DOM.replayRunSelect.innerHTML = state.sampleRuns.map(r => `
      <option value="${r.id}">${r.name} (${r.status === 'PASSED' ? '+' + r.finalProfitPct + '%' : r.breachReason})</option>
    `).join("");
    if (state.sampleRuns.length > 0) {
      state.selectedRunId = state.sampleRuns[0].id;
    }
  }

  function renderReplayChart() {
    if (!state.sampleRuns || state.sampleRuns.length === 0) return;
    const currentRun = state.sampleRuns.find(r => r.id === state.selectedRunId) || state.sampleRuns[0];
    if (!currentRun || !currentRun.days || currentRun.days.length === 0) return;

    if (currentRun.status === "PASSED") {
      DOM.replayBreachStatus.textContent = `TARGET REACHED (+${currentRun.finalProfitPct}%)`;
      DOM.replayBreachStatus.style.color = "var(--forest-text)";
    } else {
      DOM.replayBreachStatus.textContent = `BREACH ON DAY ${currentRun.breachDay}: ${currentRun.breachReason}`;
      DOM.replayBreachStatus.style.color = "var(--crimson-text)";
    }

    const width = 380;
    const height = 120;
    const days = currentRun.days.slice(0, state.scrubberDay);
    const maxDay = 60;

    const minY = 0.88;
    const maxY = 1.12;
    const scaleX = day => ((day - 1) / (maxDay - 1)) * width;
    const scaleY = val => height - ((val - minY) / (maxY - minY)) * height;

    // Build SVG paths
    let balPoints = "";
    let eqLowPoints = "";
    let dlFloorPoints = "";
    let maxDDFloorPoints = "";

    days.forEach((pt, i) => {
      const x = scaleX(pt.day);
      const yBal = scaleY(pt.balance);
      const yEq = scaleY(pt.equityLow);
      const yDL = scaleY(pt.dailyLossFloor);
      const yMaxDD = scaleY(pt.maxDDFloor);

      if (i === 0) {
        balPoints += `M ${x} ${yBal}`;
        eqLowPoints += `M ${x} ${yEq}`;
        dlFloorPoints += `M ${x} ${yDL}`;
        maxDDFloorPoints += `M ${x} ${yMaxDD}`;
      } else {
        balPoints += ` L ${x} ${yBal}`;
        eqLowPoints += ` L ${x} ${yEq}`;
        dlFloorPoints += ` L ${x} ${yDL}`;
        maxDDFloorPoints += ` L ${x} ${yMaxDD}`;
      }
    });

    const startY = scaleY(1.0);
    const scrubberX = scaleX(Math.min(days.length, state.scrubberDay));

    let breachMarker = "";
    if (currentRun.breachDay && currentRun.breachDay <= state.scrubberDay) {
      const bx = scaleX(currentRun.breachDay);
      breachMarker = `
        <line x1="${bx}" y1="0" x2="${bx}" y2="${height}" stroke="var(--crimson-text)" stroke-width="1.5" stroke-dasharray="2,2"/>
        <circle cx="${bx}" cy="${height / 2}" r="4" fill="var(--crimson-text)"/>
        <text x="${Math.min(width - 70, bx + 4)}" y="16" fill="var(--crimson-text)" font-size="8" font-weight="bold">BREACH</text>
      `;
    }

    DOM.replaySvgChart.innerHTML = `
      <!-- Initial Balance Baseline -->
      <line x1="0" y1="${startY}" x2="${width}" y2="${startY}" stroke="#D1CDC4" stroke-width="1" stroke-dasharray="3,3"/>
      
      <!-- Trailing Max DD Floor -->
      <path d="${maxDDFloorPoints}" fill="none" stroke="var(--crimson-text)" stroke-width="1.5"/>

      <!-- Daily Loss Floor -->
      <path d="${dlFloorPoints}" fill="none" stroke="#F87171" stroke-width="1" stroke-dasharray="2,2"/>

      <!-- Intraday Low Equity (MAE) -->
      <path d="${eqLowPoints}" fill="none" stroke="#D97706" stroke-width="1.2" stroke-dasharray="3,3"/>

      <!-- Balance Curve -->
      <path d="${balPoints}" fill="none" stroke="var(--gold-primary)" stroke-width="2"/>

      <!-- Scrubber Line -->
      <line x1="${scrubberX}" y1="0" x2="${scrubberX}" y2="${height}" stroke="#333333" stroke-width="1"/>

      ${breachMarker}

      <!-- Chart Labels -->
      <text x="6" y="12" fill="var(--gold-dark)" font-size="8" font-family="monospace">Balance</text>
      <text x="60" y="12" fill="#D97706" font-size="8" font-family="monospace">Intraday MAE</text>
      <text x="135" y="12" fill="var(--crimson-text)" font-size="8" font-family="monospace">Trailing DD Floor</text>
    `;
  }

  // ==========================================
  // PRE-TRADE SANDBOX AUDIT CONTROLLER
  // ==========================================

  function runSandboxAudit() {
    const ticket = {
      asset: DOM.sbAsset.value,
      lotSize: parseFloat(DOM.sbLotSize.value) || 1.0,
      slPct: parseFloat(DOM.sbSlPct.value),
      newsWindowMins: parseInt(DOM.sbNewsWindow.value, 10),
      holdTimeSec: parseInt(DOM.sbHoldTime.value, 10),
      openSameAssetPositions: parseInt(DOM.sbSameAssetPos.value, 10),
      minsSinceLastLoss: parseInt(DOM.sbMinsSinceLoss.value, 10)
    };

    const audit = state.clipboardManager.evaluateTradeTicket(ticket, state.accountSize);

    DOM.firmAuditGrid.innerHTML = Object.keys(audit).map(firmKey => {
      const res = audit[firmKey];
      let verdictClass = "verdict-pass";
      if (res.status === "HARD BREACH") verdictClass = "verdict-breach";
      else if (res.status === "SPLIT SLASH") verdictClass = "verdict-slash";
      else if (res.status === "DEDUCT") verdictClass = "verdict-deduct";

      const violationsHtml = res.violations.map(v => `<li style="color: var(--crimson-text); font-weight: 600;">${v}</li>`).join("");
      const warningsHtml = res.warnings.map(w => `<li style="color: var(--amber-text);">${w}</li>`).join("");

      return `
        <div class="firm-audit-card">
          <div class="firm-audit-header">
            <span class="firm-audit-name">${res.firm}</span>
            <span class="audit-verdict-badge ${verdictClass}">${res.status}</span>
          </div>
          <ul class="audit-log-list" style="padding-left: 14px; margin-top: 4px;">
            ${violationsHtml}
            ${warningsHtml}
            ${(res.violations.length === 0 && res.warnings.length === 0) ? '<li style="color: var(--forest-text);">Compliant with all model rules</li>' : ''}
          </ul>
        </div>
      `;
    }).join("");
  }

  // ==========================================
  // CSV IMPORTER & BOOTSTRAP RESAMPLING
  // ==========================================

  function handleCsvContent(csvText) {
    const parsed = state.clipboardManager.parseTradeLogCsv(csvText);
    if (!parsed || parsed.length === 0) {
      showToast("Could not parse valid trades from CSV file. Ensure PnL column exists.");
      return;
    }
    state.parsedCsvTrades = parsed;
    DOM.btnRunBootstrapMc.removeAttribute("disabled");
    showToast(`Successfully parsed ${parsed.length} trades from CSV!`);
  }

  function runBootstrapSimulation() {
    if (!state.parsedCsvTrades || state.parsedCsvTrades.length === 0) return;
    const activeRules = getActiveCheckedRules();
    const result = state.probEngine.runBootstrapMonteCarlo(
      state.parsedCsvTrades,
      activeRules,
      state.accountSize,
      10000
    );

    if (result) {
      DOM.bootstrapResultsBox.style.display = "block";
      DOM.bootPassRate.textContent = `${result.bootstrapPassRate}%`;
      DOM.bootDDBreachRate.textContent = `${result.maxDDBreachRate}%`;
      DOM.bootTradesCount.textContent = result.sampleSize;
      showToast("10,000 Bootstrap resamples executed successfully!");
    }
  }

  // ==========================================
  // HEATMAP MODAL CONTROLLER
  // ==========================================

  function renderHeatmapModal() {
    const matrix = state.clipboardManager.generateAllModulesHeatmapMatrix(window.RAW_RULES_DATA);
    DOM.heatmapTableBody.innerHTML = matrix.map(row => {
      const sizes = [5000, 10000, 25000, 50000, 100000, 200000];
      const cellsHtml = sizes.map(sz => {
        const item = row.sizes[sz];
        let bg = "#F0FDF4";
        let text = "#15803D";
        if (item.endToEndCertainty < 3.0) {
          bg = "#FEF2F2";
          text = "#B91C1C";
        } else if (item.endToEndCertainty < 8.0) {
          bg = "#FFFBEB";
          text = "#B45309";
        }

        return `
          <td class="heatmap-cell" data-module="${row.module.id}" data-size="${sz}" style="background-color: ${bg}; color: ${text};">
            <span class="heatmap-score">${item.endToEndCertainty.toFixed(1)}%</span>
            <span class="heatmap-grade">${item.riskGrade}</span>
          </td>
        `;
      }).join("");

      return `
        <tr>
          <td class="col-module">
            <strong>${row.module.name}</strong>
            <div style="font-size: 10px; color: var(--text-muted);">${row.module.subtitle}</div>
          </td>
          ${cellsHtml}
          <td style="text-align: left; font-size: 10px; color: var(--text-secondary);">
            ${row.sizes[50000].primaryKiller}
          </td>
        </tr>
      `;
    }).join("");
  }

  function exportHeatmapMarkdown() {
    const matrix = state.clipboardManager.generateAllModulesHeatmapMatrix(window.RAW_RULES_DATA);
    let md = `# Prop Trading 6-Module Worst-Case Passing Certainty Matrix\n\n`;
    md += `| Module Lane | $5K | $10K | $25K | $50K | $100K | $200K | Primary Killer |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

    matrix.forEach(row => {
      md += `| **${row.module.name}** (${row.module.subtitle}) | ` +
        `${row.sizes[5000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[10000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[25000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[50000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[100000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[200000].endToEndCertainty.toFixed(1)}% | ` +
        `${row.sizes[50000].primaryKiller} |\n`;
    });

    downloadFile("WorstCase_AllModules_Matrix.md", md, "text/markdown");
    showToast("Matrix exported as Markdown.");
  }

  // ==========================================
  // PRESETS & SCENARIOS CONTROLLER
  // ==========================================

  function renderPresetsDrawer() {
    const preloaded = state.clipboardManager.getPreloadedScenarios();
    DOM.preloadedPresetsList.innerHTML = preloaded.map(preset => `
      <div style="background: #FAF8F5; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 11.5px;">${preset.name}</strong>
          <span class="badge badge-friction">${preset.badge}</span>
        </div>
        <p style="font-size: 10.5px; color: var(--text-secondary);">${preset.description}</p>
        <button class="btn btn-sm btn-outline-gold btn-load-preset" data-preset-id="${preset.id}" style="align-self: flex-start; margin-top: 4px;">
          Load Scenario
        </button>
      </div>
    `).join("");

    const userScenarios = state.clipboardManager.getSavedScenarios();
    if (userScenarios.length === 0) {
      DOM.userScenariosList.innerHTML = `
        <div style="font-size: 11px; color: var(--text-muted); padding: 8px;">
          No saved custom scenarios yet. Use "Save Custom Scenario" to bookmark setups.
        </div>
      `;
    } else {
      DOM.userScenariosList.innerHTML = userScenarios.map(sc => `
        <div style="background: #FFFFFF; border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 11.5px;">${sc.name}</strong>
            <span class="badge badge-friction font-mono">$${(sc.accountSize || 50000).toLocaleString()}</span>
          </div>
          <p style="font-size: 10.5px; color: var(--text-secondary);">${sc.description}</p>
          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <button class="btn btn-sm btn-load-preset" data-preset-id="${sc.id}">Load</button>
            <button class="btn btn-sm danger btn-delete-preset" data-preset-id="${sc.id}">Delete</button>
          </div>
        </div>
      `).join("");
    }
  }

  function loadScenarioById(presetId) {
    const preloaded = state.clipboardManager.getPreloadedScenarios();
    let target = preloaded.find(p => p.id === presetId);
    if (!target) {
      const userScenarios = state.clipboardManager.getSavedScenarios();
      target = userScenarios.find(s => s.id === presetId);
    }
    if (!target) return;

    switchModule(target.moduleId);
    state.accountSize = target.accountSize || 50000;
    document.querySelectorAll(".size-pill-btn").forEach(p => {
      if (parseInt(p.dataset.size, 10) === state.accountSize) p.classList.add("active");
      else p.classList.remove("active");
    });

    state.checkedRulesByModule[target.moduleId].clear();
    (target.checkedRuleIds || []).forEach(id => state.checkedRulesByModule[target.moduleId].add(id));

    if (target.importedRules && target.importedRules.length > 0) {
      state.importedRulesByModule[target.moduleId] = [...target.importedRules];
    }
    if (target.customRules && target.customRules.length > 0) {
      state.customRulesByModule[target.moduleId] = [...target.customRules];
    }

    renderActiveModule();
    recalculateAll();
    showToast(`Loaded scenario: ${target.name}`);
  }

  function openEditRuleModal(rule) {
    document.getElementById("editRuleId").value = rule.id;
    document.getElementById("editRuleTitle").value = rule.title;
    document.getElementById("editRuleThresholdText").value = rule.thresholdText;
    document.getElementById("editRuleMultiplier").value = rule.impactMultiplier;
    DOM.modalEditRule.classList.add("open");
  }

  // ==========================================
  // EXPORT UTILITIES
  // ==========================================

  function exportPlaybookMarkdown() {
    const activeRules = getActiveCheckedRules();
    const result = state.probEngine.calculateCertainty(state.currentModule, activeRules, state.accountSize);
    const econ = result.economics;

    let md = `# Prop Trading Risk Playbook & Certainty Audit\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Active Module:** ${state.currentModule}\n`;
    md += `**Account Capital:** $${state.accountSize.toLocaleString()}\n`;
    md += `**Overall Risk Grade:** Grade ${result.riskGrade} (${result.gradeLabel})\n`;
    md += `**End-to-End Payout Certainty:** ${result.endToEndCertainty.toFixed(2)}%\n`;
    md += `**Effective Retained Profit Split:** ${econ.effectiveRetainedSplitPct}% (Nominal: ${econ.nominalSplitPct}%)\n\n`;

    md += `## 1. Funnel Probabilities & Economics\n`;
    md += `- Phase 1 Evaluation Pass: **${result.p1Certainty.toFixed(1)}%**\n`;
    if (result.p2Certainty !== null) {
      md += `- Phase 2 Evaluation Pass: **${result.p2Certainty.toFixed(1)}%**\n`;
    }
    md += `- Funded Survival to 1st Payout: **${result.fundedCertainty.toFixed(1)}%**\n`;
    md += `- Expected Challenge Attempts: **${econ.expectedAttempts}x**\n`;
    md += `- True Cost to Funded: **$${econ.trueCostToFunded.toLocaleString()}**\n`;
    md += `- Break-Even Payouts: **${econ.breakEvenCycles} cycles**\n`;
    md += `- 6-Month Net Projected ROI: **$${econ.medianNet6mDollar.toLocaleString()} (${econ.medianNet6mRoiPct}%)**\n\n`;

    md += `## 2. Dollar Risk Allowance ($${state.accountSize.toLocaleString()})\n`;
    md += `- Daily Loss Limit: **$${Math.round(result.dollarMath.dailyLossDollar).toLocaleString()}** (${result.dollarMath.dailyLossPct}%)\n`;
    md += `- Max Drawdown Floor: **$${Math.round(result.dollarMath.maxLossDollar).toLocaleString()}** (${result.dollarMath.maxDDPct}%)\n`;
    if (result.dollarMath.floatingCapDollar) {
      md += `- Floating Risk Cap: **$${Math.round(result.dollarMath.floatingCapDollar).toLocaleString()}** (-${result.dollarMath.floatingPct}%)\n`;
    }
    md += `- Target Profit: **$${Math.round(result.dollarMath.profitTargetDollar).toLocaleString()}** (${result.dollarMath.profitTargetPct}%)\n`;
    md += `- Effective Max Lots: **${result.dollarMath.maxFxLots} FX / ${result.dollarMath.maxGoldLots} Gold**\n\n`;

    md += `## 3. Active Rulebook Constraints (${activeRules.length})\n\n`;
    activeRules.forEach(r => {
      const sup = r.isSuperseded ? ` *(SUPERSEDED by ${r.supersededBy})*` : "";
      md += `- **[${r.firmName} · ${r.modelName}]** ${r.title}: ${r.thresholdText}${sup}\n`;
    });

    md += `\n## 4. Top Certainty Killers (Marginal Delta)\n`;
    result.certaintyKillers.forEach((k, idx) => {
      md += `${idx + 1}. **${k.title}** (${k.firmName}) — ${k.formattedImpact}\n`;
    });

    downloadFile(`PropPlaybook_${state.currentModule}_$${state.accountSize}.md`, md, "text/markdown");
    showToast("Markdown playbook exported.");
  }

  function exportPlaybookJson() {
    const activeRules = getActiveCheckedRules();
    const result = state.probEngine.calculateCertainty(state.currentModule, activeRules, state.accountSize);

    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "2.0",
        module: state.currentModule,
        accountSize: state.accountSize
      },
      certaintyTelemetry: result,
      activeRules: activeRules
    };

    downloadFile(`PropPlaybook_${state.currentModule}_$${state.accountSize}.json`, JSON.stringify(payload, null, 2), "application/json");
    showToast("JSON playbook exported.");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>${message}</span>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
