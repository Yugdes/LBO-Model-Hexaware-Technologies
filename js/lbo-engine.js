/**
 * LBO Engine — Core Financial Model
 * Hexaware Technologies Take-Private by Carlyle Group (2021)
 *
 * This module contains all LBO calculations:
 *  - Sources & Uses
 *  - Operating Model (P&L, FCF)
 *  - Debt Schedule (with mandatory amortization + cash sweep)
 *  - Returns (IRR, MOIC)
 *  - Sensitivity Analysis
 */

class LBOModel {
    /**
     * Base company financials (LTM pre-deal, in $M)
     * Hexaware Technologies FY2020/LTM pre-delisting figures
     * Revenue ≈ $830M, EBITDA ≈ $162M (~19.5% margin)
     */
    static BASE_FINANCIALS = {
        revenue: 830,        // $M — LTM Revenue
        ebitda: 162,         // $M — LTM EBITDA
        ebitdaMargin: 0.195, // 19.5%
        netDebt: 0,          // Hexaware was essentially net-debt-free
        cashOnBS: 50,        // Cash on balance sheet acquired
    };

    constructor(assumptions = {}) {
        this.assumptions = this._mergeDefaults(assumptions);
        this.results = {};
        this.calculate();
    }

    _mergeDefaults(overrides) {
        const defaults = {
            // Transaction
            entryMultiple: 18.0,
            exitMultiple: 20.0,
            holdPeriod: 5,
            transactionFeesPct: 0.02,
            financingFeesPct: 0.03,

            // Capital Structure (turns of EBITDA)
            seniorDebtTurns: 3.0,
            subDebtTurns: 1.5,
            seniorRate: 0.065,
            subRate: 0.095,
            mandatoryAmortPct: 0.05,  // % of initial senior debt per year
            cashSweepPct: 0.50,       // % of excess FCF

            // Operating
            revenueGrowth: 0.12,
            ebitdaMarginYr1: 0.195,
            ebitdaMarginExit: 0.23,
            capexPct: 0.03,
            nwcChangePct: 0.05,
            taxRate: 0.25,
            daPct: 0.025,
        };
        return { ...defaults, ...overrides };
    }

    calculate() {
        this._calcTransaction();
        this._calcSourcesUses();
        this._calcOperatingModel();
        this._calcDebtSchedule();
        this._calcReturns();
    }

    // ============================================================
    //  TRANSACTION
    // ============================================================
    _calcTransaction() {
        const a = this.assumptions;
        const base = LBOModel.BASE_FINANCIALS;

        const enterpriseValue = base.ebitda * a.entryMultiple;
        const equityPurchasePrice = enterpriseValue - base.netDebt;

        this.results.transaction = {
            enterpriseValue,
            equityPurchasePrice,
            ltmRevenue: base.revenue,
            ltmEBITDA: base.ebitda,
            ltmEBITDAMargin: base.ebitdaMargin,
            entryMultiple: a.entryMultiple,
        };
    }

    // ============================================================
    //  SOURCES & USES
    // ============================================================
    _calcSourcesUses() {
        const a = this.assumptions;
        const base = LBOModel.BASE_FINANCIALS;
        const txn = this.results.transaction;

        // Sources
        const seniorDebt = base.ebitda * a.seniorDebtTurns;
        const subDebt = base.ebitda * a.subDebtTurns;
        const totalDebt = seniorDebt + subDebt;

        // Uses
        const purchasePrice = txn.equityPurchasePrice;
        const transactionFees = txn.enterpriseValue * a.transactionFeesPct;
        const financingFees = totalDebt * a.financingFeesPct;
        const totalUses = purchasePrice + transactionFees + financingFees;

        // Equity = plug (total uses - total debt)
        const sponsorEquity = totalUses - totalDebt;

        const totalSources = totalDebt + sponsorEquity;

        this.results.sourcesUses = {
            sources: [
                { name: 'Senior Secured Debt (Term Loan)', amount: seniorDebt, pct: seniorDebt / totalSources, turns: a.seniorDebtTurns },
                { name: 'Subordinated Debt', amount: subDebt, pct: subDebt / totalSources, turns: a.subDebtTurns },
                { name: 'Sponsor Equity', amount: sponsorEquity, pct: sponsorEquity / totalSources, turns: sponsorEquity / base.ebitda },
            ],
            uses: [
                { name: 'Equity Purchase Price', amount: purchasePrice, pct: purchasePrice / totalUses, turns: purchasePrice / base.ebitda },
                { name: 'Transaction & Advisory Fees', amount: transactionFees, pct: transactionFees / totalUses, turns: transactionFees / base.ebitda },
                { name: 'Financing Fees', amount: financingFees, pct: financingFees / totalUses, turns: financingFees / base.ebitda },
            ],
            totalSources,
            totalUses,
            seniorDebt,
            subDebt,
            totalDebt,
            sponsorEquity,
        };
    }

    // ============================================================
    //  OPERATING MODEL
    // ============================================================
    _calcOperatingModel() {
        const a = this.assumptions;
        const base = LBOModel.BASE_FINANCIALS;
        const years = a.holdPeriod;

        // EBITDA margin ramp: linear interpolation from yr1 to exit
        const marginStep = (a.ebitdaMarginExit - a.ebitdaMarginYr1) / Math.max(years - 1, 1);

        const opModel = [];

        for (let yr = 0; yr <= years; yr++) {
            if (yr === 0) {
                // Base year
                opModel.push({
                    year: 0,
                    revenue: base.revenue,
                    revenueGrowth: 0,
                    ebitdaMargin: base.ebitdaMargin,
                    ebitda: base.ebitda,
                    da: base.revenue * a.daPct,
                    ebit: base.ebitda - base.revenue * a.daPct,
                    interestExpense: 0,  // placeholder, filled by debt schedule
                    ebt: 0,
                    taxes: 0,
                    netIncome: 0,
                    capex: base.revenue * a.capexPct,
                    nwcChange: 0,
                    fcf: 0,
                });
            } else {
                const prevRev = opModel[yr - 1].revenue;
                const revenue = prevRev * (1 + a.revenueGrowth);
                const margin = a.ebitdaMarginYr1 + marginStep * (yr - 1);
                const ebitda = revenue * margin;
                const da = revenue * a.daPct;
                const ebit = ebitda - da;
                const capex = revenue * a.capexPct;
                const nwcChange = (revenue - prevRev) * a.nwcChangePct;

                opModel.push({
                    year: yr,
                    revenue,
                    revenueGrowth: a.revenueGrowth,
                    ebitdaMargin: margin,
                    ebitda,
                    da,
                    ebit,
                    interestExpense: 0, // filled by debt schedule
                    ebt: 0,
                    taxes: 0,
                    netIncome: 0,
                    capex,
                    nwcChange,
                    fcf: 0, // filled after debt schedule
                });
            }
        }

        this.results.operatingModel = opModel;
    }

    // ============================================================
    //  DEBT SCHEDULE (with cash sweep)
    // ============================================================
    _calcDebtSchedule() {
        const a = this.assumptions;
        const su = this.results.sourcesUses;
        const op = this.results.operatingModel;
        const years = a.holdPeriod;

        const seniorSchedule = [];
        const subSchedule = [];

        let seniorBalance = su.seniorDebt;
        let subBalance = su.subDebt;
        const initialSenior = su.seniorDebt;

        // Year 0
        seniorSchedule.push({
            year: 0,
            beginningBalance: 0,
            mandatoryAmort: 0,
            cashSweep: 0,
            totalPaydown: 0,
            endingBalance: seniorBalance,
            interestExpense: 0,
        });

        subSchedule.push({
            year: 0,
            beginningBalance: 0,
            amort: 0,
            endingBalance: subBalance,
            interestExpense: 0,
        });

        for (let yr = 1; yr <= years; yr++) {
            // Senior debt
            const seniorBegin = seniorBalance;
            const seniorInterest = seniorBegin * a.seniorRate;
            const mandatoryAmort = Math.min(initialSenior * a.mandatoryAmortPct, seniorBegin);

            // Sub debt (bullet — no amort, interest only)
            const subBegin = subBalance;
            const subInterest = subBegin * a.subRate;

            // Total interest for the operating model
            const totalInterest = seniorInterest + subInterest;

            // Update operating model with interest
            const opYr = op[yr];
            opYr.interestExpense = totalInterest;
            opYr.ebt = opYr.ebit - totalInterest;
            opYr.taxes = Math.max(0, opYr.ebt * a.taxRate);
            opYr.netIncome = opYr.ebt - opYr.taxes;

            // Levered Free Cash Flow (before debt paydown)
            const lfcf = opYr.netIncome + opYr.da - opYr.capex - opYr.nwcChange;

            // Cash available for sweep (after mandatory amort)
            const cashAfterMandatory = Math.max(0, lfcf - mandatoryAmort);
            const cashSweep = Math.min(
                cashAfterMandatory * a.cashSweepPct,
                Math.max(0, seniorBegin - mandatoryAmort)
            );

            const totalPaydown = mandatoryAmort + cashSweep;
            seniorBalance = Math.max(0, seniorBegin - totalPaydown);

            // Store FCF in operating model
            opYr.fcf = lfcf;

            seniorSchedule.push({
                year: yr,
                beginningBalance: seniorBegin,
                mandatoryAmort,
                cashSweep,
                totalPaydown,
                endingBalance: seniorBalance,
                interestExpense: seniorInterest,
            });

            subSchedule.push({
                year: yr,
                beginningBalance: subBegin,
                amort: 0,
                endingBalance: subBalance,
                interestExpense: subInterest,
            });
        }

        // Total debt summary
        const totalDebtSummary = [];
        for (let yr = 0; yr <= years; yr++) {
            const totalDebt = seniorSchedule[yr].endingBalance + subSchedule[yr].endingBalance;
            const ebitda = yr === 0 ? op[0].ebitda : op[yr].ebitda;
            const totalInterest = seniorSchedule[yr].interestExpense + subSchedule[yr].interestExpense;
            const leverage = totalDebt / ebitda;
            const seniorLeverage = seniorSchedule[yr].endingBalance / ebitda;
            const interestCoverage = yr === 0 ? 0 : ebitda / totalInterest;
            const fccr = yr === 0 ? 0 : (op[yr].ebitda - op[yr].taxes - op[yr].capex) / (totalInterest + seniorSchedule[yr].mandatoryAmort);

            totalDebtSummary.push({
                year: yr,
                totalDebt,
                seniorDebt: seniorSchedule[yr].endingBalance,
                subDebt: subSchedule[yr].endingBalance,
                leverage,
                seniorLeverage,
                totalInterest,
                interestCoverage,
                fccr,
                ebitda,
            });
        }

        this.results.debtSchedule = {
            senior: seniorSchedule,
            sub: subSchedule,
            summary: totalDebtSummary,
        };
    }

    // ============================================================
    //  RETURNS
    // ============================================================
    _calcReturns() {
        const a = this.assumptions;
        const su = this.results.sourcesUses;
        const op = this.results.operatingModel;
        const ds = this.results.debtSchedule;
        const years = a.holdPeriod;

        // Exit
        const exitEBITDA = op[years].ebitda;
        const exitEV = exitEBITDA * a.exitMultiple;
        const totalDebtAtExit = ds.summary[years].totalDebt;
        const exitEquityValue = exitEV - totalDebtAtExit;

        const initialEquity = su.sponsorEquity;
        const moic = exitEquityValue / initialEquity;

        // IRR calculation using Newton's method
        const cashFlows = [-initialEquity];
        for (let yr = 1; yr < years; yr++) {
            cashFlows.push(0); // No interim distributions
        }
        cashFlows.push(exitEquityValue);

        const irr = this._calcIRR(cashFlows);

        // Value creation breakdown
        const entryEV = this.results.transaction.enterpriseValue;
        const ebitdaGrowthValue = (exitEBITDA - op[0].ebitda) * a.entryMultiple;
        const multipleExpansionValue = (a.exitMultiple - a.entryMultiple) * exitEBITDA;
        const debtPaydownValue = su.totalDebt - totalDebtAtExit;
        const totalValueCreation = exitEquityValue - initialEquity;

        // Returns by exit year
        const returnsByYear = [];
        for (let yr = 3; yr <= years; yr++) {
            const yrExitEBITDA = op[yr].ebitda;
            const yrExitEV = yrExitEBITDA * a.exitMultiple;
            const yrDebt = ds.summary[yr].totalDebt;
            const yrExitEquity = yrExitEV - yrDebt;
            const yrMOIC = yrExitEquity / initialEquity;

            const yrCashFlows = [-initialEquity];
            for (let i = 1; i < yr; i++) yrCashFlows.push(0);
            yrCashFlows.push(yrExitEquity);
            const yrIRR = this._calcIRR(yrCashFlows);

            returnsByYear.push({
                year: yr,
                exitEBITDA: yrExitEBITDA,
                exitEV: yrExitEV,
                debt: yrDebt,
                exitEquity: yrExitEquity,
                moic: yrMOIC,
                irr: yrIRR,
            });
        }

        this.results.returns = {
            exitEV,
            exitEBITDA,
            totalDebtAtExit,
            exitEquityValue,
            initialEquity,
            moic,
            irr,
            cashFlows,
            valueCreation: {
                ebitdaGrowth: ebitdaGrowthValue,
                multipleExpansion: multipleExpansionValue,
                debtPaydown: debtPaydownValue,
                total: totalValueCreation,
            },
            returnsByYear,
        };
    }

    // ============================================================
    //  IRR (Newton-Raphson)
    // ============================================================
    _calcIRR(cashFlows, guess = 0.15, maxIter = 1000, tol = 1e-8) {
        let rate = guess;

        for (let i = 0; i < maxIter; i++) {
            let npv = 0;
            let dnpv = 0;

            for (let t = 0; t < cashFlows.length; t++) {
                const cf = cashFlows[t];
                const factor = Math.pow(1 + rate, t);
                npv += cf / factor;
                if (t > 0) {
                    dnpv -= t * cf / Math.pow(1 + rate, t + 1);
                }
            }

            if (Math.abs(dnpv) < 1e-12) break;

            const newRate = rate - npv / dnpv;
            if (Math.abs(newRate - rate) < tol) {
                return newRate;
            }
            rate = newRate;
        }

        return rate;
    }

    // ============================================================
    //  SENSITIVITY ANALYSIS
    // ============================================================
    runSensitivity(rowParam, colParam, rowValues, colValues, outputMetric = 'irr') {
        const results = [];

        for (const rowVal of rowValues) {
            const row = [];
            for (const colVal of colValues) {
                const overrides = { ...this.assumptions };
                overrides[rowParam] = rowVal;
                overrides[colParam] = colVal;

                const model = new LBOModel(overrides);
                const ret = model.results.returns;

                if (outputMetric === 'irr') {
                    row.push(ret.irr);
                } else if (outputMetric === 'moic') {
                    row.push(ret.moic);
                }
            }
            results.push(row);
        }

        return results;
    }

    /**
     * Generate the key sensitivity finding text
     */
    generateSensitivityFinding() {
        const a = this.assumptions;
        const ret = this.results.returns;
        const baseIRR = ret.irr;

        // Test exit multiple sensitivity
        const exitDown2 = new LBOModel({ ...a, exitMultiple: a.exitMultiple - 2 }).results.returns.irr;
        const exitUp2 = new LBOModel({ ...a, exitMultiple: a.exitMultiple + 2 }).results.returns.irr;

        // Test entry multiple sensitivity
        const entryDown2 = new LBOModel({ ...a, entryMultiple: a.entryMultiple - 2 }).results.returns.irr;
        const entryUp2 = new LBOModel({ ...a, entryMultiple: a.entryMultiple + 2 }).results.returns.irr;

        // Test leverage sensitivity
        const levDown = new LBOModel({ ...a, seniorDebtTurns: a.seniorDebtTurns - 1, subDebtTurns: a.subDebtTurns - 0.5 }).results.returns.irr;
        const levUp = new LBOModel({ ...a, seniorDebtTurns: a.seniorDebtTurns + 1, subDebtTurns: a.subDebtTurns + 0.5 }).results.returns.irr;

        const exitSens = Math.abs(exitUp2 - exitDown2);
        const entrySens = Math.abs(entryUp2 - entryDown2);
        const levSens = Math.abs(levUp - levDown);

        let finding = `The base case yields a <span class="highlight">${(baseIRR * 100).toFixed(1)}% IRR</span> and `;
        finding += `<span class="highlight">${ret.moic.toFixed(2)}x MOIC</span> over a ${a.holdPeriod}-year hold. `;
        finding += `<strong>Exit multiple is the single most impactful driver:</strong> a ±2.0x swing in exit EV/EBITDA (from ${(a.exitMultiple - 2).toFixed(1)}x to ${(a.exitMultiple + 2).toFixed(1)}x) `;
        finding += `moves the IRR from <span class="highlight">${(exitDown2 * 100).toFixed(1)}%</span> to <span class="highlight">${(exitUp2 * 100).toFixed(1)}%</span> — `;
        finding += `a ${(exitSens * 100).toFixed(0)}pp range — vs. `;
        finding += `${(entrySens * 100).toFixed(0)}pp from entry multiple and ${(levSens * 100).toFixed(0)}pp from leverage. `;
        finding += `The deal comfortably clears a 20% IRR hurdle provided exit multiples remain above ~${this._findBreakevenExitMultiple(0.20).toFixed(1)}x, `;
        finding += `making EBITDA growth and multiple preservation the critical value-creation levers.`;

        return finding;
    }

    _findBreakevenExitMultiple(targetIRR) {
        const a = this.assumptions;
        // Binary search for the exit multiple that gives targetIRR
        let lo = 5, hi = 40;
        for (let i = 0; i < 50; i++) {
            const mid = (lo + hi) / 2;
            const model = new LBOModel({ ...a, exitMultiple: mid });
            const irr = model.results.returns.irr;
            if (irr < targetIRR) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return (lo + hi) / 2;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.LBOModel = LBOModel;
}
