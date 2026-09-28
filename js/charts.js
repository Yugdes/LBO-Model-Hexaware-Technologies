/**
 * Charts Module — LBO Model Visualizations
 * Uses Chart.js for rendering
 */

class LBOCharts {
    constructor() {
        this.charts = {};
        this.isDark = !document.documentElement.hasAttribute('data-theme') ||
                      document.documentElement.getAttribute('data-theme') === 'dark';
    }

    getColors() {
        return {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            tertiary: '#06b6d4',
            positive: '#10b981',
            warning: '#f59e0b',
            negative: '#ef4444',
            text: this.isDark ? '#94a3c4' : '#475569',
            textPrimary: this.isDark ? '#e8ecf4' : '#0f172a',
            grid: this.isDark ? 'rgba(99, 115, 171, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            bg: this.isDark ? '#1a1f35' : '#ffffff',
        };
    }

    getDefaultOptions(title = '') {
        const c = this.getColors();
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: c.text,
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11,
                            weight: '500',
                        },
                    },
                },
                tooltip: {
                    backgroundColor: this.isDark ? 'rgba(26, 31, 53, 0.95)' : 'rgba(255,255,255,0.95)',
                    titleColor: c.textPrimary,
                    bodyColor: c.text,
                    borderColor: this.isDark ? 'rgba(99, 115, 171, 0.2)' : 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif", size: 11 },
                    displayColors: true,
                    callbacks: {
                        label: function(ctx) {
                            const val = ctx.parsed.y;
                            if (val === undefined || val === null) return '';
                            return `${ctx.dataset.label}: $${val.toFixed(1)}M`;
                        }
                    }
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: c.text,
                        font: { family: "'Inter', sans-serif", size: 11 },
                    },
                    grid: { color: c.grid },
                    border: { color: c.grid },
                },
                y: {
                    ticks: {
                        color: c.text,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: (val) => `$${val.toFixed(0)}M`,
                    },
                    grid: { color: c.grid },
                    border: { color: c.grid },
                },
            },
        };
    }

    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    updateTheme(isDark) {
        this.isDark = isDark;
        // Charts will be re-rendered on recalculate
    }

    // ---- Revenue & EBITDA Chart ----
    renderRevenueEBITDA(opModel) {
        const ctx = document.getElementById('chart-revenue-ebitda');
        if (!ctx) return;
        if (this.charts.revenueEbitda) this.charts.revenueEbitda.destroy();

        const c = this.getColors();
        const labels = opModel.map(d => d.year === 0 ? 'Base' : `Year ${d.year}`);

        this.charts.revenueEbitda = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: opModel.map(d => d.revenue),
                        backgroundColor: `${c.primary}40`,
                        borderColor: c.primary,
                        borderWidth: 2,
                        borderRadius: 6,
                        order: 2,
                    },
                    {
                        label: 'EBITDA',
                        data: opModel.map(d => d.ebitda),
                        backgroundColor: `${c.positive}40`,
                        borderColor: c.positive,
                        borderWidth: 2,
                        borderRadius: 6,
                        order: 1,
                    },
                    {
                        label: 'EBITDA Margin (%)',
                        data: opModel.map(d => d.ebitdaMargin * 100),
                        type: 'line',
                        borderColor: c.warning,
                        backgroundColor: `${c.warning}20`,
                        pointBackgroundColor: c.warning,
                        pointBorderColor: c.warning,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1',
                        order: 0,
                    },
                ],
            },
            options: {
                ...this.getDefaultOptions(),
                scales: {
                    ...this.getDefaultOptions().scales,
                    y1: {
                        position: 'right',
                        ticks: {
                            color: c.warning,
                            font: { family: "'Inter', sans-serif", size: 11 },
                            callback: (val) => `${val.toFixed(1)}%`,
                        },
                        grid: { display: false },
                        border: { color: c.grid },
                        min: 15,
                        max: 30,
                    },
                },
                plugins: {
                    ...this.getDefaultOptions().plugins,
                    tooltip: {
                        ...this.getDefaultOptions().plugins.tooltip,
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.dataset.yAxisID === 'y1') {
                                    return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`;
                                }
                                return `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(1)}M`;
                            }
                        }
                    }
                }
            },
        });
    }

    // ---- FCF Chart ----
    renderFCF(opModel) {
        const ctx = document.getElementById('chart-fcf');
        if (!ctx) return;
        if (this.charts.fcf) this.charts.fcf.destroy();

        const c = this.getColors();
        const data = opModel.filter(d => d.year > 0);
        const labels = data.map(d => `Year ${d.year}`);

        this.charts.fcf = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Levered FCF',
                        data: data.map(d => d.fcf),
                        backgroundColor: data.map(d => d.fcf >= 0 ? `${c.positive}60` : `${c.negative}60`),
                        borderColor: data.map(d => d.fcf >= 0 ? c.positive : c.negative),
                        borderWidth: 2,
                        borderRadius: 6,
                    },
                ],
            },
            options: {
                ...this.getDefaultOptions(),
                plugins: {
                    ...this.getDefaultOptions().plugins,
                    legend: { display: false },
                },
            },
        });
    }

    // ---- Debt Paydown Chart ----
    renderDebtPaydown(debtSchedule) {
        const ctx = document.getElementById('chart-debt-paydown');
        if (!ctx) return;
        if (this.charts.debtPaydown) this.charts.debtPaydown.destroy();

        const c = this.getColors();
        const summary = debtSchedule.summary;
        const labels = summary.map(d => d.year === 0 ? 'Close' : `Year ${d.year}`);

        this.charts.debtPaydown = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Senior Debt',
                        data: summary.map(d => d.seniorDebt),
                        backgroundColor: `${c.negative}50`,
                        borderColor: c.negative,
                        borderWidth: 1,
                        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
                        stack: 'debt',
                    },
                    {
                        label: 'Subordinated Debt',
                        data: summary.map(d => d.subDebt),
                        backgroundColor: `${c.warning}50`,
                        borderColor: c.warning,
                        borderWidth: 1,
                        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                        stack: 'debt',
                    },
                ],
            },
            options: {
                ...this.getDefaultOptions(),
                scales: {
                    ...this.getDefaultOptions().scales,
                    x: { ...this.getDefaultOptions().scales.x, stacked: true },
                    y: { ...this.getDefaultOptions().scales.y, stacked: true },
                },
            },
        });
    }

    // ---- Leverage Chart ----
    renderLeverage(debtSchedule) {
        const ctx = document.getElementById('chart-leverage');
        if (!ctx) return;
        if (this.charts.leverage) this.charts.leverage.destroy();

        const c = this.getColors();
        const summary = debtSchedule.summary;
        const labels = summary.map(d => d.year === 0 ? 'Close' : `Year ${d.year}`);

        this.charts.leverage = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total Leverage (x)',
                        data: summary.map(d => d.leverage),
                        borderColor: c.negative,
                        backgroundColor: `${c.negative}15`,
                        pointBackgroundColor: c.negative,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        borderWidth: 2.5,
                        tension: 0.3,
                        fill: true,
                    },
                    {
                        label: 'Senior Leverage (x)',
                        data: summary.map(d => d.seniorLeverage),
                        borderColor: c.warning,
                        backgroundColor: `${c.warning}10`,
                        pointBackgroundColor: c.warning,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 3],
                        fill: false,
                    },
                    {
                        label: 'Interest Coverage (x)',
                        data: summary.map(d => d.interestCoverage),
                        borderColor: c.positive,
                        backgroundColor: `${c.positive}10`,
                        pointBackgroundColor: c.positive,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1',
                        fill: false,
                    },
                ],
            },
            options: {
                ...this.getDefaultOptions(),
                scales: {
                    x: this.getDefaultOptions().scales.x,
                    y: {
                        ...this.getDefaultOptions().scales.y,
                        ticks: {
                            ...this.getDefaultOptions().scales.y.ticks,
                            callback: (val) => `${val.toFixed(1)}x`,
                        },
                        min: 0,
                    },
                    y1: {
                        position: 'right',
                        ticks: {
                            color: c.positive,
                            font: { family: "'Inter', sans-serif", size: 11 },
                            callback: (val) => `${val.toFixed(1)}x`,
                        },
                        grid: { display: false },
                        border: { color: c.grid },
                        min: 0,
                    },
                },
                plugins: {
                    ...this.getDefaultOptions().plugins,
                    tooltip: {
                        ...this.getDefaultOptions().plugins.tooltip,
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}x`;
                            }
                        }
                    }
                }
            },
        });
    }

    // ---- Value Creation Bridge ----
    renderValueCreation(returns) {
        const ctx = document.getElementById('chart-value-creation');
        if (!ctx) return;
        if (this.charts.valueCreation) this.charts.valueCreation.destroy();

        const c = this.getColors();
        const vc = returns.valueCreation;

        const labels = ['Initial Equity', 'EBITDA Growth', 'Multiple Expansion', 'Debt Paydown', 'Exit Equity'];

        // Waterfall chart using floating bars
        const datasets = [];

        // Calculate cumulative values for waterfall
        const initial = returns.initialEquity;
        const vals = [
            { base: 0, height: initial },
            { base: initial, height: vc.ebitdaGrowth },
            { base: initial + vc.ebitdaGrowth, height: vc.multipleExpansion },
            { base: initial + vc.ebitdaGrowth + vc.multipleExpansion, height: vc.debtPaydown },
            { base: 0, height: returns.exitEquityValue },
        ];

        this.charts.valueCreation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Value',
                    data: vals.map(v => [v.base, v.base + v.height]),
                    backgroundColor: [
                        `${c.primary}60`,
                        `${c.positive}60`,
                        `${c.secondary}60`,
                        `${c.tertiary}60`,
                        `${c.positive}80`,
                    ],
                    borderColor: [
                        c.primary,
                        c.positive,
                        c.secondary,
                        c.tertiary,
                        c.positive,
                    ],
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                ...this.getDefaultOptions(),
                plugins: {
                    ...this.getDefaultOptions().plugins,
                    legend: { display: false },
                    tooltip: {
                        ...this.getDefaultOptions().plugins.tooltip,
                        callbacks: {
                            label: function(ctx) {
                                const range = ctx.parsed._custom;
                                if (range) {
                                    const value = range.end - range.start;
                                    return `$${value.toFixed(1)}M`;
                                }
                                return '';
                            }
                        }
                    }
                },
            },
        });
    }

    // ---- IRR vs MOIC by Exit Year ----
    renderIRRMOIC(returnsByYear) {
        const ctx = document.getElementById('chart-irr-moic');
        if (!ctx) return;
        if (this.charts.irrMoic) this.charts.irrMoic.destroy();

        const c = this.getColors();
        const labels = returnsByYear.map(r => `Year ${r.year}`);

        this.charts.irrMoic = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'IRR (%)',
                        data: returnsByYear.map(r => r.irr * 100),
                        backgroundColor: `${c.primary}60`,
                        borderColor: c.primary,
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y',
                    },
                    {
                        label: 'MOIC (x)',
                        data: returnsByYear.map(r => r.moic),
                        type: 'line',
                        borderColor: c.positive,
                        backgroundColor: `${c.positive}20`,
                        pointBackgroundColor: c.positive,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        borderWidth: 2.5,
                        tension: 0.3,
                        yAxisID: 'y1',
                    },
                ],
            },
            options: {
                ...this.getDefaultOptions(),
                scales: {
                    x: this.getDefaultOptions().scales.x,
                    y: {
                        ...this.getDefaultOptions().scales.y,
                        ticks: {
                            ...this.getDefaultOptions().scales.y.ticks,
                            callback: (val) => `${val.toFixed(0)}%`,
                        },
                    },
                    y1: {
                        position: 'right',
                        ticks: {
                            color: c.positive,
                            font: { family: "'Inter', sans-serif", size: 11 },
                            callback: (val) => `${val.toFixed(1)}x`,
                        },
                        grid: { display: false },
                        border: { color: c.grid },
                    },
                },
                plugins: {
                    ...this.getDefaultOptions().plugins,
                    tooltip: {
                        ...this.getDefaultOptions().plugins.tooltip,
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.dataset.yAxisID === 'y1') {
                                    return `MOIC: ${ctx.parsed.y.toFixed(2)}x`;
                                }
                                return `IRR: ${ctx.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            },
        });
    }
}

if (typeof window !== 'undefined') {
    window.LBOCharts = LBOCharts;
}
