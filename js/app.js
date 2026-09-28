/**
 * App.js — Main Application Controller
 * Wires up the LBO engine, charts, navigation, and UI
 */

(function () {
    'use strict';

    let model;
    let charts;

    // ============================================================
    //  INITIALIZATION
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        charts = new LBOCharts();

        // Initialize model with default assumptions
        model = new LBOModel();

        // Render everything
        renderAll();

        // Setup event listeners
        setupNavigation();
        setupAssumptions();
        setupThemeToggle();
        setupExport();

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 800);
    });

    // ============================================================
    //  RENDER ALL
    // ============================================================
    function renderAll() {
        renderOverviewMetrics();
        renderSourcesUses();
        renderOperatingModel();
        renderDebtSchedule();
        renderReturns();
        renderSensitivity();
        renderCharts();
    }

    function renderCharts() {
        charts.renderRevenueEBITDA(model.results.operatingModel);
        charts.renderFCF(model.results.operatingModel);
        charts.renderDebtPaydown(model.results.debtSchedule);
        charts.renderLeverage(model.results.debtSchedule);
        charts.renderValueCreation(model.results.returns);
        charts.renderIRRMOIC(model.results.returns.returnsByYear);
    }

    // ============================================================
    //  OVERVIEW METRICS
    // ============================================================
    function renderOverviewMetrics() {
        const txn = model.results.transaction;
        const ret = model.results.returns;
        const su = model.results.sourcesUses;

        setText('metric-ev', `$${fmtN(txn.enterpriseValue)}M`);
        setText('metric-ev-sub', `${txn.entryMultiple.toFixed(1)}x LTM EBITDA`);

        setText('metric-entry-multiple', `${txn.entryMultiple.toFixed(1)}x`);

        setText('metric-irr', `${(ret.irr * 100).toFixed(1)}%`);
        const irrEl = document.getElementById('metric-irr-sub');
        if (irrEl) {
            irrEl.textContent = `${model.assumptions.holdPeriod}-year hold`;
            irrEl.className = `metric-change ${ret.irr >= 0.20 ? 'positive' : 'negative'}`;
        }

        setText('metric-moic', `${ret.moic.toFixed(2)}x`);

        setText('deal-revenue', `$${fmtN(txn.ltmRevenue)}M`);
        setText('deal-ebitda', `$${fmtN(txn.ltmEBITDA)}M`);
        setText('deal-margin', `${(txn.ltmEBITDAMargin * 100).toFixed(1)}%`);
    }

    // ============================================================
    //  SOURCES & USES
    // ============================================================
    function renderSourcesUses() {
        const su = model.results.sourcesUses;
        const base = LBOModel.BASE_FINANCIALS;

        // Sources table
        let sourcesHTML = '';
        su.sources.forEach(s => {
            sourcesHTML += `<tr>
                <td>${s.name}</td>
                <td class="text-right">$${fmtN(s.amount)}</td>
                <td class="text-right">${(s.pct * 100).toFixed(1)}%</td>
                <td class="text-right">${s.turns.toFixed(1)}x</td>
            </tr>`;
        });
        setHTML('sources-table-body', sourcesHTML);
        setText('total-sources', `$${fmtN(su.totalSources)}`);
        setText('total-sources-turns', `${(su.totalSources / base.ebitda).toFixed(1)}x`);

        // Uses table
        let usesHTML = '';
        su.uses.forEach(u => {
            usesHTML += `<tr>
                <td>${u.name}</td>
                <td class="text-right">$${fmtN(u.amount)}</td>
                <td class="text-right">${(u.pct * 100).toFixed(1)}%</td>
                <td class="text-right">${u.turns.toFixed(1)}x</td>
            </tr>`;
        });
        setHTML('uses-table-body', usesHTML);
        setText('total-uses', `$${fmtN(su.totalUses)}`);
        setText('total-uses-turns', `${(su.totalUses / base.ebitda).toFixed(1)}x`);

        // Capital Structure Bar
        renderCapStructure(su);
    }

    function renderCapStructure(su) {
        const total = su.totalSources;
        const segments = [
            { label: 'Senior Debt', amount: su.seniorDebt, pct: su.seniorDebt / total, color: '#ef4444' },
            { label: 'Sub Debt', amount: su.subDebt, pct: su.subDebt / total, color: '#f59e0b' },
            { label: 'Sponsor Equity', amount: su.sponsorEquity, pct: su.sponsorEquity / total, color: '#3b82f6' },
        ];

        let barHTML = '';
        let legendHTML = '';

        segments.forEach(seg => {
            barHTML += `<div class="cap-bar-segment" style="flex: ${seg.pct}; background: ${seg.color};">
                <div class="segment-label">
                    <span>${seg.label}</span>
                    <span class="segment-pct">${(seg.pct * 100).toFixed(0)}%</span>
                </div>
            </div>`;

            legendHTML += `<div class="cap-legend-item">
                <div class="cap-legend-dot" style="background: ${seg.color};"></div>
                ${seg.label}: $${fmtN(seg.amount)}M (${(seg.pct * 100).toFixed(1)}%)
            </div>`;
        });

        setHTML('cap-structure-bar', barHTML);
        setHTML('cap-structure-legend', legendHTML);
    }

    // ============================================================
    //  OPERATING MODEL
    // ============================================================
    function renderOperatingModel() {
        const op = model.results.operatingModel;
        const years = model.assumptions.holdPeriod;

        const rows = [
            { label: 'Revenue', key: 'revenue', format: '$', isSectionHeader: false },
            { label: '  Growth %', key: 'revenueGrowth', format: '%', skipBase: true },
            { label: 'EBITDA', key: 'ebitda', format: '$', bold: true },
            { label: '  Margin %', key: 'ebitdaMargin', format: '%' },
            { type: 'separator' },
            { label: 'Less: D&A', key: 'da', format: '$neg' },
            { label: 'EBIT', key: 'ebit', format: '$', bold: true },
            { label: 'Less: Interest Expense', key: 'interestExpense', format: '$neg', skipBase: true },
            { label: 'EBT', key: 'ebt', format: '$', skipBase: true },
            { label: 'Less: Taxes', key: 'taxes', format: '$neg', skipBase: true },
            { label: 'Net Income', key: 'netIncome', format: '$', bold: true, skipBase: true },
            { type: 'separator' },
            { label: 'Free Cash Flow Build', type: 'sectionHeader' },
            { label: 'Net Income', key: 'netIncome', format: '$', skipBase: true },
            { label: 'Plus: D&A', key: 'da', format: '$', skipBase: true },
            { label: 'Less: Capex', key: 'capex', format: '$neg', skipBase: true },
            { label: 'Less: Δ NWC', key: 'nwcChange', format: '$neg', skipBase: true },
            { label: 'Levered Free Cash Flow', key: 'fcf', format: '$', bold: true, highlight: true, skipBase: true },
        ];

        let html = '';
        rows.forEach(row => {
            if (row.type === 'separator') {
                html += `<tr class="separator-row"><td colspan="${years + 2}"></td></tr>`;
                return;
            }
            if (row.type === 'sectionHeader') {
                html += `<tr class="section-header-row"><td class="sticky-col" colspan="${years + 2}">${row.label}</td></tr>`;
                return;
            }

            const classes = [];
            if (row.bold) classes.push('bold');
            if (row.highlight) classes.push('highlight-row');

            html += `<tr class="${classes.join(' ')}">`;
            html += `<td class="sticky-col">${row.label}</td>`;

            for (let yr = 0; yr <= years; yr++) {
                const val = op[yr][row.key];
                let display = '—';

                if (yr === 0 && row.skipBase) {
                    display = '—';
                } else if (row.format === '%') {
                    display = `${(val * 100).toFixed(1)}%`;
                } else if (row.format === '$neg') {
                    display = `($${fmtN(Math.abs(val))})`;
                } else {
                    display = `$${fmtN(val)}`;
                }

                const isBase = yr === 0 ? ' class="text-right" style="color: var(--text-tertiary)"' : ' class="text-right"';
                html += `<td${isBase}>${display}</td>`;
            }

            html += '</tr>';
        });

        setHTML('operating-model-body', html);
    }

    // ============================================================
    //  DEBT SCHEDULE
    // ============================================================
    function renderDebtSchedule() {
        const ds = model.results.debtSchedule;
        const years = model.assumptions.holdPeriod;

        // Senior Debt
        const seniorRows = [
            { label: 'Beginning Balance', key: 'beginningBalance', format: '$' },
            { label: 'Mandatory Amortization', key: 'mandatoryAmort', format: '$neg' },
            { label: 'Cash Sweep Paydown', key: 'cashSweep', format: '$neg', highlight: true },
            { label: 'Total Principal Paydown', key: 'totalPaydown', format: '$neg', bold: true },
            { label: 'Ending Balance', key: 'endingBalance', format: '$', bold: true },
            { type: 'separator' },
            { label: 'Interest Expense', key: 'interestExpense', format: '$neg' },
        ];

        setHTML('senior-debt-body', buildScheduleTable(ds.senior, seniorRows, years));

        // Subordinated Debt
        const subRows = [
            { label: 'Beginning Balance', key: 'beginningBalance', format: '$' },
            { label: 'Amortization', key: 'amort', format: '$neg' },
            { label: 'Ending Balance', key: 'endingBalance', format: '$', bold: true },
            { type: 'separator' },
            { label: 'Interest Expense', key: 'interestExpense', format: '$neg' },
        ];

        setHTML('sub-debt-body', buildScheduleTable(ds.sub, subRows, years));

        // Total Debt Summary
        const summaryRows = [
            { label: 'Total Debt', key: 'totalDebt', format: '$', bold: true },
            { label: 'EBITDA', key: 'ebitda', format: '$' },
            { type: 'separator' },
            { label: 'Total Leverage (Debt/EBITDA)', key: 'leverage', format: 'x', bold: true },
            { label: 'Senior Leverage', key: 'seniorLeverage', format: 'x' },
            { label: 'Interest Coverage (EBITDA/Int)', key: 'interestCoverage', format: 'x' },
            { label: 'FCCR', key: 'fccr', format: 'x' },
        ];

        setHTML('total-debt-body', buildScheduleTable(ds.summary, summaryRows, years));
    }

    function buildScheduleTable(data, rows, years) {
        let html = '';
        rows.forEach(row => {
            if (row.type === 'separator') {
                html += `<tr class="separator-row"><td colspan="${years + 2}"></td></tr>`;
                return;
            }

            const classes = [];
            if (row.bold) classes.push('bold');
            if (row.highlight) classes.push('highlight-row');

            html += `<tr class="${classes.join(' ')}">`;
            html += `<td class="sticky-col">${row.label}</td>`;

            for (let yr = 0; yr <= years; yr++) {
                const val = data[yr][row.key];
                let display = '—';

                if (row.format === '$neg') {
                    display = val === 0 ? '—' : `($${fmtN(Math.abs(val))})`;
                } else if (row.format === '$') {
                    display = `$${fmtN(val)}`;
                } else if (row.format === 'x') {
                    display = val === 0 ? '—' : `${val.toFixed(2)}x`;
                } else if (row.format === '%') {
                    display = `${(val * 100).toFixed(1)}%`;
                }

                html += `<td class="text-right">${display}</td>`;
            }
            html += '</tr>';
        });
        return html;
    }

    // ============================================================
    //  RETURNS
    // ============================================================
    function renderReturns() {
        const ret = model.results.returns;

        setText('returns-irr', `${(ret.irr * 100).toFixed(1)}%`);
        setText('returns-moic', `${ret.moic.toFixed(2)}x`);
        setText('returns-initial-equity', `$${fmtN(ret.initialEquity)}M`);
        setText('returns-exit-equity', `$${fmtN(ret.exitEquityValue)}M`);

        // Waterfall
        const waterfall = [
            { label: 'Exit EBITDA', value: ret.exitEBITDA, format: '$' },
            { label: `Exit Multiple (${model.assumptions.exitMultiple.toFixed(1)}x)`, value: '', format: '' },
            { label: 'Exit Enterprise Value', value: ret.exitEV, format: '$', bold: true },
            { label: 'Less: Total Debt at Exit', value: -ret.totalDebtAtExit, format: '$' },
            { type: 'separator' },
            { label: 'Exit Equity Value', value: ret.exitEquityValue, format: '$', bold: true, highlight: true },
            { type: 'separator' },
            { label: 'Initial Sponsor Equity', value: ret.initialEquity, format: '$' },
            { label: 'Equity Gain', value: ret.exitEquityValue - ret.initialEquity, format: '$', bold: true },
            { type: 'separator' },
            { label: 'IRR', value: ret.irr, format: '%', highlight: true },
            { label: 'MOIC', value: ret.moic, format: 'x', highlight: true },
        ];

        let waterfallHTML = '';
        waterfall.forEach(row => {
            if (row.type === 'separator') {
                waterfallHTML += '<tr class="separator-row"><td colspan="2"></td></tr>';
                return;
            }
            const cls = [];
            if (row.bold) cls.push('bold');
            if (row.highlight) cls.push('highlight-row');

            let display;
            if (row.format === '$') {
                display = row.value < 0
                    ? `($${fmtN(Math.abs(row.value))})`
                    : `$${fmtN(row.value)}`;
            } else if (row.format === '%') {
                display = `${(row.value * 100).toFixed(1)}%`;
            } else if (row.format === 'x') {
                display = `${row.value.toFixed(2)}x`;
            } else {
                display = row.value;
            }

            waterfallHTML += `<tr class="${cls.join(' ')}">
                <td class="sticky-col">${row.label}</td>
                <td class="text-right">${display}</td>
            </tr>`;
        });
        setHTML('returns-waterfall-body', waterfallHTML);

        // Returns by exit year
        const rby = ret.returnsByYear;
        const returnsByYearRows = [
            { label: 'Exit EBITDA ($M)', key: 'exitEBITDA', format: '$' },
            { label: 'Exit EV ($M)', key: 'exitEV', format: '$' },
            { label: 'Remaining Debt ($M)', key: 'debt', format: '$' },
            { label: 'Exit Equity Value ($M)', key: 'exitEquity', format: '$', bold: true },
            { type: 'separator' },
            { label: 'MOIC', key: 'moic', format: 'x', bold: true },
            { label: 'IRR', key: 'irr', format: '%', bold: true, highlight: true },
        ];

        let rbyHTML = '';
        returnsByYearRows.forEach(row => {
            if (row.type === 'separator') {
                rbyHTML += `<tr class="separator-row"><td colspan="${rby.length + 1}"></td></tr>`;
                return;
            }
            const cls = [];
            if (row.bold) cls.push('bold');
            if (row.highlight) cls.push('highlight-row');

            rbyHTML += `<tr class="${cls.join(' ')}">`;
            rbyHTML += `<td class="sticky-col">${row.label}</td>`;

            rby.forEach(yr => {
                const val = yr[row.key];
                let display;
                if (row.format === '$') display = `$${fmtN(val)}`;
                else if (row.format === '%') display = `${(val * 100).toFixed(1)}%`;
                else if (row.format === 'x') display = `${val.toFixed(2)}x`;
                rbyHTML += `<td class="text-right">${display}</td>`;
            });
            rbyHTML += '</tr>';
        });
        setHTML('returns-by-year-body', rbyHTML);
    }

    // ============================================================
    //  SENSITIVITY ANALYSIS
    // ============================================================
    function renderSensitivity() {
        const a = model.assumptions;

        // 1. Entry Multiple vs Exit Multiple — IRR
        const entryVals = [a.entryMultiple - 4, a.entryMultiple - 2, a.entryMultiple, a.entryMultiple + 2, a.entryMultiple + 4];
        const exitVals = [a.exitMultiple - 4, a.exitMultiple - 2, a.exitMultiple, a.exitMultiple + 2, a.exitMultiple + 4];

        const entryExitIRR = model.runSensitivity('entryMultiple', 'exitMultiple', entryVals, exitVals, 'irr');
        renderSensTable('sensitivity-entry-exit-irr', 'Entry EV/EBITDA \\ Exit EV/EBITDA', entryVals, exitVals, entryExitIRR, '%', a.entryMultiple, a.exitMultiple);

        // 2. Entry Multiple vs Exit Multiple — MOIC
        const entryExitMOIC = model.runSensitivity('entryMultiple', 'exitMultiple', entryVals, exitVals, 'moic');
        renderSensTable('sensitivity-entry-exit-moic', 'Entry EV/EBITDA \\ Exit EV/EBITDA', entryVals, exitVals, entryExitMOIC, 'x', a.entryMultiple, a.exitMultiple);

        // 3. Leverage vs Exit Multiple — IRR
        const totalLevToday = a.seniorDebtTurns + a.subDebtTurns;
        const levVals = [totalLevToday - 2, totalLevToday - 1, totalLevToday, totalLevToday + 1, totalLevToday + 2];

        // For leverage sensitivity, we vary seniorDebtTurns proportionally
        const seniorRatio = a.seniorDebtTurns / totalLevToday;
        const subRatio = a.subDebtTurns / totalLevToday;

        const levExitIRR = [];
        for (const lev of levVals) {
            const row = [];
            for (const exit of exitVals) {
                const overrides = {
                    ...a,
                    seniorDebtTurns: lev * seniorRatio,
                    subDebtTurns: lev * subRatio,
                    exitMultiple: exit,
                };
                const m = new LBOModel(overrides);
                row.push(m.results.returns.irr);
            }
            levExitIRR.push(row);
        }
        renderSensTable('sensitivity-leverage-exit-irr', 'Total Leverage \\ Exit EV/EBITDA', levVals, exitVals, levExitIRR, '%', totalLevToday, a.exitMultiple);

        // 4. Revenue Growth vs Exit EBITDA Margin — IRR
        const growthVals = [a.revenueGrowth - 0.04, a.revenueGrowth - 0.02, a.revenueGrowth, a.revenueGrowth + 0.02, a.revenueGrowth + 0.04];
        const marginVals = [a.ebitdaMarginExit - 0.04, a.ebitdaMarginExit - 0.02, a.ebitdaMarginExit, a.ebitdaMarginExit + 0.02, a.ebitdaMarginExit + 0.04];

        const growthMarginIRR = model.runSensitivity('revenueGrowth', 'ebitdaMarginExit', growthVals, marginVals, 'irr');
        renderSensTable('sensitivity-growth-margin-irr', 'Rev Growth \\ Exit EBITDA Margin',
            growthVals, marginVals, growthMarginIRR, '%',
            a.revenueGrowth, a.ebitdaMarginExit, true);

        // Key Finding
        setHTML('sensitivity-finding', model.generateSensitivityFinding());
    }

    function renderSensTable(tableId, cornerLabel, rowVals, colVals, data, format, baseRow, baseCol, isPercent = false) {
        const table = document.getElementById(tableId);
        if (!table) return;

        // Find min/max for color scaling
        let allVals = data.flat();
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const midVal = (minVal + maxVal) / 2;

        let html = '<thead><tr>';
        html += `<th class="corner-header">${cornerLabel}</th>`;
        colVals.forEach(col => {
            const isBase = Math.abs(col - baseCol) < 0.001;
            const label = isPercent ? `${(col * 100).toFixed(0)}%` : `${col.toFixed(1)}x`;
            html += `<th class="col-header${isBase ? ' base-case' : ''}">${label}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach((row, ri) => {
            html += '<tr>';
            const isBaseRow = Math.abs(rowVals[ri] - baseRow) < 0.001;
            const rowLabel = isPercent ? `${(rowVals[ri] * 100).toFixed(0)}%` : `${rowVals[ri].toFixed(1)}x`;
            html += `<td class="row-header${isBaseRow ? ' base-case' : ''}">${rowLabel}</td>`;

            row.forEach((val, ci) => {
                const isBaseCol = Math.abs(colVals[ci] - baseCol) < 0.001;
                const isBase = isBaseRow && isBaseCol;
                const cellClass = isBase ? 'base-case' : getCellColorClass(val, midVal, format);

                let display;
                if (format === '%') display = `${(val * 100).toFixed(1)}%`;
                else if (format === 'x') display = `${val.toFixed(2)}x`;
                else display = val.toFixed(2);

                html += `<td class="${cellClass}">${display}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    function getCellColorClass(val, mid, format) {
        let threshold;
        if (format === '%') {
            // IRR: higher is better
            if (val >= 0.30) return 'cell-green-5';
            if (val >= 0.25) return 'cell-green-4';
            if (val >= 0.20) return 'cell-green-3';
            if (val >= 0.15) return 'cell-green-2';
            if (val >= 0.10) return 'cell-green-1';
            if (val >= 0.05) return 'cell-red-1';
            if (val >= 0.00) return 'cell-red-2';
            if (val >= -0.05) return 'cell-red-3';
            if (val >= -0.10) return 'cell-red-4';
            return 'cell-red-5';
        } else {
            // MOIC
            if (val >= 4.0) return 'cell-green-5';
            if (val >= 3.0) return 'cell-green-4';
            if (val >= 2.5) return 'cell-green-3';
            if (val >= 2.0) return 'cell-green-2';
            if (val >= 1.5) return 'cell-green-1';
            if (val >= 1.0) return 'cell-red-1';
            if (val >= 0.8) return 'cell-red-2';
            return 'cell-red-3';
        }
    }

    // ============================================================
    //  NAVIGATION
    // ============================================================
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');

                // Update active states
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Show/hide sections
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');

                    // Re-render charts when section becomes visible
                    setTimeout(() => {
                        if (sectionId === 'operating-model') {
                            charts.renderRevenueEBITDA(model.results.operatingModel);
                            charts.renderFCF(model.results.operatingModel);
                        } else if (sectionId === 'debt-schedule') {
                            charts.renderDebtPaydown(model.results.debtSchedule);
                            charts.renderLeverage(model.results.debtSchedule);
                        } else if (sectionId === 'returns') {
                            charts.renderValueCreation(model.results.returns);
                            charts.renderIRRMOIC(model.results.returns.returnsByYear);
                        }
                    }, 50);
                }
            });
        });
    }

    // ============================================================
    //  ASSUMPTIONS
    // ============================================================
    function setupAssumptions() {
        const recalcBtn = document.getElementById('recalculate-btn');
        if (recalcBtn) {
            recalcBtn.addEventListener('click', recalculate);
        }

        const resetBtn = document.getElementById('reset-assumptions');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetInputs();
                recalculate();
            });
        }

        // Auto-recalculate on Enter key
        document.querySelectorAll('.assumptions-grid input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') recalculate();
            });
        });
    }

    function getAssumptions() {
        return {
            entryMultiple: getVal('input-entry-multiple'),
            exitMultiple: getVal('input-exit-multiple'),
            holdPeriod: Math.round(getVal('input-hold-period')),
            transactionFeesPct: getVal('input-transaction-fees') / 100,
            financingFeesPct: getVal('input-financing-fees') / 100,
            seniorDebtTurns: getVal('input-senior-debt-turns'),
            subDebtTurns: getVal('input-sub-debt-turns'),
            seniorRate: getVal('input-senior-rate') / 100,
            subRate: getVal('input-sub-rate') / 100,
            mandatoryAmortPct: getVal('input-mandatory-amort') / 100,
            cashSweepPct: getVal('input-cash-sweep') / 100,
            revenueGrowth: getVal('input-revenue-growth') / 100,
            ebitdaMarginYr1: getVal('input-ebitda-margin-yr1') / 100,
            ebitdaMarginExit: getVal('input-ebitda-margin-exit') / 100,
            capexPct: getVal('input-capex') / 100,
            nwcChangePct: getVal('input-nwc-change') / 100,
            taxRate: getVal('input-tax-rate') / 100,
            daPct: getVal('input-da') / 100,
        };
    }

    function recalculate() {
        const assumptions = getAssumptions();
        model = new LBOModel(assumptions);

        // Destroy existing charts before re-rendering
        charts.destroyAll();
        renderAll();

        // Flash the recalculate button
        const btn = document.getElementById('recalculate-btn');
        if (btn) {
            btn.textContent = '✓ Updated';
            btn.style.background = 'var(--positive)';
            setTimeout(() => {
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg> Recalculate Model`;
                btn.style.background = '';
            }, 1200);
        }
    }

    function resetInputs() {
        const defaults = {
            'input-entry-multiple': 18.0,
            'input-exit-multiple': 20.0,
            'input-hold-period': 5,
            'input-transaction-fees': 2.0,
            'input-financing-fees': 3.0,
            'input-senior-debt-turns': 3.0,
            'input-sub-debt-turns': 1.5,
            'input-senior-rate': 6.5,
            'input-sub-rate': 9.5,
            'input-mandatory-amort': 5.0,
            'input-cash-sweep': 50.0,
            'input-revenue-growth': 12.0,
            'input-ebitda-margin-yr1': 19.5,
            'input-ebitda-margin-exit': 23.0,
            'input-capex': 3.0,
            'input-nwc-change': 5.0,
            'input-tax-rate': 25.0,
            'input-da': 2.5,
        };

        Object.entries(defaults).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
    }

    // ============================================================
    //  THEME TOGGLE
    // ============================================================
    function setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
            const html = document.documentElement;
            const isDark = !html.hasAttribute('data-theme') || html.getAttribute('data-theme') !== 'light';

            if (isDark) {
                html.setAttribute('data-theme', 'light');
            } else {
                html.removeAttribute('data-theme');
            }

            // Toggle icons
            const sunIcon = toggle.querySelector('.icon-sun');
            const moonIcon = toggle.querySelector('.icon-moon');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = isDark ? 'none' : 'block';
                moonIcon.style.display = isDark ? 'block' : 'none';
            }

            // Update charts
            charts.updateTheme(!isDark);
            charts.destroyAll();
            renderCharts();
        });
    }

    // ============================================================
    //  EXPORT
    // ============================================================
    function setupExport() {
        const btn = document.getElementById('export-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const exportData = {
                model: 'LBO Model — Hexaware Technologies Take-Private by Carlyle Group',
                date: new Date().toISOString(),
                assumptions: model.assumptions,
                results: {
                    transaction: model.results.transaction,
                    sourcesUses: model.results.sourcesUses,
                    returns: {
                        irr: model.results.returns.irr,
                        moic: model.results.returns.moic,
                        initialEquity: model.results.returns.initialEquity,
                        exitEquityValue: model.results.returns.exitEquityValue,
                        exitEV: model.results.returns.exitEV,
                    },
                },
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'LBO_Model_Hexaware_Export.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // ============================================================
    //  HELPERS
    // ============================================================
    function fmtN(num) {
        if (num === undefined || num === null || isNaN(num)) return '—';
        return num.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) || 0 : 0;
    }

})();
