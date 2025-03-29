

// analysis.js

document.addEventListener('DOMContentLoaded', () => {
    // Dependencias
    if (typeof transactions === 'undefined' || typeof Chart === 'undefined' || typeof formatCurrency === 'undefined') {
        console.error("Error: common.js, Chart.js o sus datos no parecen haberse cargado correctamente antes de analysis.js");
        alert("Error crítico al cargar la página de análisis. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const expenseChartCanvas = document.getElementById('expense-chart');
    const incomeExpenseChartCanvas = document.getElementById('income-expense-chart');
    const expenseChartFilterButtons = document.querySelectorAll('.chart-controls button[data-chart="expense"]');
    const incomeExpensePeriodSelect = document.getElementById('income-expense-period');
    const updateIncomeExpenseChartBtn = document.getElementById('update-income-expense-chart');

    // --- Variables Globales para Gráficos ---
    let expenseChartInstance = null;
    let incomeExpenseChartInstance = null;
    let currentExpenseFilter = 'month'; // Filtro inicial para gráfico de gastos
    let currentIncomeExpensePeriod = 'last_6_months'; // Periodo inicial para Ingresos/Gastos

    // Colores base para gráficos (más opciones que antes)
    const CHART_COLORS = [
        '#00bcd4', '#ffca28', '#ef5350', '#ab47bc', '#66bb6a', '#ff7043',
        '#5c6bc0', '#26a69a', '#d4e157', '#ec407a', '#ffa726', '#8d6e63',
        '#78909c', '#42a5f5', '#d81b60', '#ffee58'
    ];

    // --- Inicialización ---
    setActiveFilterButton(expenseChartFilterButtons, currentExpenseFilter); // Marcar botón inicial
    updateExpenseChart(); // Dibujar gráfico de gastos inicial
    updateIncomeExpenseChart(); // Dibujar gráfico ingresos/gastos inicial

    // --- Event Listeners ---

    // Filtros para gráfico de gastos
    expenseChartFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentExpenseFilter = button.dataset.filter;
            setActiveFilterButton(expenseChartFilterButtons, currentExpenseFilter);
            updateExpenseChart();
        });
    });

    // Actualizar gráfico Ingresos/Gastos al cambiar periodo o hacer clic en botón
    incomeExpensePeriodSelect.addEventListener('change', () => {
        currentIncomeExpensePeriod = incomeExpensePeriodSelect.value;
        updateIncomeExpenseChart(); // Actualizar al cambiar selección
    });
    updateIncomeExpenseChartBtn.addEventListener('click', updateIncomeExpenseChart); // Actualizar al hacer clic


    // --- Funciones para Gráfico de Gastos (Pie Chart) ---

    /** Actualiza el gráfico de tarta de gastos por categoría */
    function updateExpenseChart() {
        console.log(`Actualizando gráfico de gastos con filtro: ${currentExpenseFilter}`);
        const { startDate, endDate } = getDateRangeForFilter(currentExpenseFilter);
        const categoryTotals = calculateExpenseTotalsByCategory(startDate, endDate);

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Destruir gráfico anterior si existe
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
        }

        // Obtener contexto y manejar caso sin datos
        const ctx = expenseChartCanvas?.getContext('2d');
        if (!ctx) {
            console.error("No se pudo obtener el contexto del canvas 'expense-chart'.");
            return;
        }

        if (labels.length === 0) {
            drawNoDataMessage(ctx, `No hay gastos registrados ${getDateRangeLabel(currentExpenseFilter)}.`);
            expenseChartInstance = null;
            return;
        }

        // Crear nuevo gráfico
        expenseChartInstance = new Chart(ctx, {
            type: 'pie', // o 'doughnut' para anillo
            data: {
                labels: labels.map(l => escapeHtml(l)), // Escapar etiquetas
                datasets: [{
                    label: 'Gastos',
                    data: data,
                    backgroundColor: CHART_COLORS.slice(0, labels.length), // Reutilizar colores
                    borderColor: 'var(--surface-color)', // Borde del color del fondo de la sección
                    borderWidth: 2,
                    hoverOffset: 8 // Efecto al pasar el ratón
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom', // Leyenda abajo
                        labels: {
                            color: 'var(--text-muted-color)', // Color texto leyenda
                            padding: 15,
                             usePointStyle: true // Usar puntos en leyenda
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    // Calcular porcentaje
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    label += `${formatCurrency(context.parsed)} (${percentage}%)`;
                                }
                                return label;
                            }
                        },
                         backgroundColor: 'rgba(0,0,0,0.8)', // Fondo tooltip
                         titleFont: { size: 14 },
                         bodyFont: { size: 12 },
                         padding: 10
                    },
                    title: { // Título opcional del gráfico
                        display: true,
                        text: `Gastos por Categoría ${getDateRangeLabel(currentExpenseFilter)}`,
                        color: 'var(--text-color)',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                }
            }
        });
    }

     /** Calcula los totales de gastos por categoría para un rango de fechas */
    function calculateExpenseTotalsByCategory(startDate, endDate) {
        const totals = {};
        transactions.filter(t =>
            t.type === 'expense' &&
            t.dateObj >= startDate &&
            t.dateObj < endDate
        ).forEach(t => {
            const category = t.category || 'Sin Categoría';
            const amount = typeof t.amount === 'number' ? t.amount : 0;
            totals[category] = (totals[category] || 0) + amount;
        });
        // Ordenar categorías por monto descendente (opcional)
        return Object.fromEntries(
             Object.entries(totals).sort(([,a],[,b]) => b-a)
        );
    }


    // --- Funciones para Gráfico Ingresos vs Gastos (Bar Chart) ---

    /** Actualiza el gráfico de barras de Ingresos vs Gastos Mensuales */
    function updateIncomeExpenseChart() {
        console.log(`Actualizando gráfico Ingresos/Gastos para periodo: ${currentIncomeExpensePeriod}`);
        const monthlyData = calculateMonthlyIncomeExpense(currentIncomeExpensePeriod);

        const labels = monthlyData.map(d => d.monthLabel);
        const incomeData = monthlyData.map(d => d.income);
        const expenseData = monthlyData.map(d => d.expense);

        // Destruir gráfico anterior si existe
        if (incomeExpenseChartInstance) {
            incomeExpenseChartInstance.destroy();
        }

        const ctx = incomeExpenseChartCanvas?.getContext('2d');
         if (!ctx) {
            console.error("No se pudo obtener el contexto del canvas 'income-expense-chart'.");
            return;
        }

        if (labels.length === 0) {
            drawNoDataMessage(ctx, `No hay datos de transacciones para el periodo seleccionado.`);
            incomeExpenseChartInstance = null;
            return;
        }

        incomeExpenseChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(118, 199, 122, 0.7)', // Verde translúcido
                        borderColor: 'var(--income-color)',
                        borderWidth: 1
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: 'rgba(240, 98, 98, 0.7)', // Rojo translúcido
                        borderColor: 'var(--expense-color)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-muted-color)',
                            // Formatear eje Y como moneda
                            callback: function(value) { return formatCurrency(value, appSettings.currency, 0); } // 0 decimales en eje
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Líneas de grid claras
                        }
                    },
                    x: {
                        ticks: {
                            color: 'var(--text-muted-color)'
                        },
                        grid: {
                            display: false // Ocultar grid vertical
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                         labels: { color: 'var(--text-muted-color)' }
                    },
                    tooltip: {
                         callbacks: {
                             label: function(context) {
                                 let label = context.dataset.label || '';
                                 if (label) { label += ': '; }
                                 if (context.parsed.y !== null) {
                                     label += formatCurrency(context.parsed.y);
                                 }
                                 return label;
                             }
                         },
                         backgroundColor: 'rgba(0,0,0,0.8)',
                         titleFont: { size: 14 },
                         bodyFont: { size: 12 },
                         padding: 10
                    },
                     title: {
                        display: true,
                        text: `Ingresos vs. Gastos Mensuales (${getPeriodLabel(currentIncomeExpensePeriod)})`,
                        color: 'var(--text-color)',
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 10, bottom: 20 }
                    }
                }
            }
        });
    }

     /** Calcula los totales mensuales de ingresos y gastos para un periodo */
    function calculateMonthlyIncomeExpense(period) {
        const monthsData = {}; // Objeto para agrupar por 'YYYY-MM'
        const { startDate, endDate } = getDateRangeForPeriod(period);

        transactions.filter(t =>
            (t.type === 'income' || t.type === 'expense') &&
            t.dateObj >= startDate &&
            t.dateObj < endDate
        ).forEach(t => {
            const monthKey = t.date.substring(0, 7); // 'YYYY-MM'
            if (!monthsData[monthKey]) {
                monthsData[monthKey] = {
                    monthLabel: formatMonthYear(t.dateObj), // 'Ene 2023'
                    income: 0,
                    expense: 0,
                    date: new Date(t.dateObj.getFullYear(), t.dateObj.getMonth(), 1) // Para ordenar
                };
            }
            const amount = typeof t.amount === 'number' ? t.amount : 0;
            if (t.type === 'income') {
                monthsData[monthKey].income += amount;
            } else {
                monthsData[monthKey].expense += amount;
            }
        });

        // Convertir a array y ordenar por fecha
        return Object.values(monthsData).sort((a, b) => a.date - b.date);
    }


    // --- Funciones Auxiliares Comunes ---

    /** Dibuja un mensaje en el canvas cuando no hay datos */
    function drawNoDataMessage(ctx, message) {
         ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Limpiar canvas
         ctx.save();
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillStyle = 'var(--text-muted-color)';
         ctx.font = '16px var(--font-sans)';
         // Dividir mensaje largo en líneas si es necesario
         const lines = message.split('\n');
         const lineHeight = 20;
         const startY = ctx.canvas.height / 2 - (lines.length -1) * lineHeight / 2;
         lines.forEach((line, index) => {
            ctx.fillText(line, ctx.canvas.width / 2, startY + index * lineHeight);
         });
         ctx.restore();
    }

    /** Establece el botón activo en un grupo de botones de filtro */
    function setActiveFilterButton(buttons, activeFilter) {
        buttons.forEach(b => {
            b.classList.toggle('active', b.dataset.filter === activeFilter);
        });
    }

    /** Obtiene el rango de fechas para los filtros del gráfico de gastos */
    function getDateRangeForFilter(filter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let startDate, endDate;

        switch (filter) {
            case 'all':
                startDate = new Date(0); // Inicio de los tiempos (o primera transacción?)
                endDate = new Date(now.getFullYear() + 10, 0, 1); // Fecha muy futura
                // Podríamos buscar la primera y última fecha de transacción para ser más precisos
                // startDate = transactions.length > 0 ? transactions.reduce((min, t) => t.dateObj < min ? t.dateObj : min, transactions[0].dateObj) : new Date();
                // endDate = transactions.length > 0 ? transactions.reduce((max, t) => t.dateObj > max ? t.dateObj : max, transactions[0].dateObj) : new Date();
                // endDate.setDate(endDate.getDate() + 1); // Hacer exclusivo el fin
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1); // 1 de Enero del año actual
                endDate = new Date(now.getFullYear() + 1, 0, 1); // 1 de Enero del siguiente año
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Primer día del mes pasado
                endDate = new Date(now.getFullYear(), now.getMonth(), 1); // Primer día del mes actual
                break;
            case 'month': // Mes actual por defecto
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Primer día mes actual
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Primer día mes siguiente
                break;
        }
        return { startDate, endDate };
    }

    /** Obtiene el rango de fechas para los periodos del gráfico Ingresos/Gastos */
    function getDateRangeForPeriod(period) {
         const now = new Date();
         let startDate, endDate;
         endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Fin siempre es inicio del mes siguiente al actual

         switch (period) {
             case 'last_12_months':
                 startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 12 meses atrás (incluye actual)
                 break;
             case 'current_year':
                  startDate = new Date(now.getFullYear(), 0, 1); // 1 de enero año actual
                  break;
             case 'previous_year':
                 startDate = new Date(now.getFullYear() - 1, 0, 1); // 1 enero año pasado
                 endDate = new Date(now.getFullYear(), 0, 1); // 1 enero año actual
                 break;
             case 'last_6_months': // Por defecto
             default:
                 startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 meses atrás (incluye actual)
                 break;
         }
         return { startDate, endDate };
    }

    /** Devuelve una etiqueta legible para el filtro de fecha */
    function getDateRangeLabel(filter) {
        switch (filter) {
            case 'all': return '(Todo)';
            case 'year': return '(Año Actual)';
            case 'month': return '(Mes Actual)';
            case 'last_month': return '(Mes Pasado)';
            default: return '';
        }
    }
     /** Devuelve una etiqueta legible para el periodo */
     function getPeriodLabel(period) {
        const labels = {
            last_6_months: 'Últimos 6 Meses', last_12_months: 'Últimos 12 Meses',
            current_year: 'Año Actual', previous_year: 'Año Anterior'
        };
        return labels[period] || '';
     }

      /** Formatea una fecha como 'Mes Año' (ej: 'Ene 2023') */
     function formatMonthYear(date) {
        if (!(date instanceof Date && !isNaN(date))) return '';
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
     }

     /** Formatea moneda para ejes de gráfico (sin decimales) */
     function formatCurrency(amount, currency = appSettings.currency, fractionDigits = 2) {
        // Reutilizar la función global pero permitir controlar decimales
        const options = { style: 'currency', currency: currency };
        let locale = 'es-ES';
        if (currency === 'USD') locale = 'en-US';
        if (currency === 'COP') { locale = 'es-CO'; options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; }
        else { options.minimumFractionDigits = fractionDigits; options.maximumFractionDigits = fractionDigits; }

        try { return new Intl.NumberFormat(locale, options).format(amount); }
        catch (e) { return amount?.toFixed(fractionDigits) || '0'; }
    }


}); // Fin del DOMContentLoaded