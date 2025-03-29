// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que los datos comunes estén cargados (aunque common.js ya lo hace)
    if (typeof loadData === 'function') {
        // loadData(); // common.js ya debería haberlo hecho
    } else {
        console.error("common.js no se cargó correctamente o falta la función loadData.");
        return; // Salir si falta lo esencial
    }

    console.log("Inicializando dashboard.js...");
    renderDashboardSummary();

    // Añadir listeners a botones de acceso rápido (ya están en el HTML con onclick,
    // pero se podrían manejar aquí si se prefiere para más control)
    // Ejemplo:
    // const addExpenseBtn = document.getElementById('quick-add-expense');
    // if (addExpenseBtn) {
    //    addExpenseBtn.addEventListener('click', () => window.location.href='add_edit_transaction.html?type=expense');
    // }
});

function renderDashboardSummary() {
    console.log("Renderizando resumen del dashboard...");

    // Elementos del DOM para el resumen
    const assetsTotalSpan = document.getElementById('assets-total');
    const liabilitiesTotalSpan = document.getElementById('liabilities-total');
    const worthTotalSpan = document.getElementById('worth-total');
    const incomeMonthSpan = document.getElementById('income-month');
    const expenseMonthSpan = document.getElementById('expense-month');
    const balanceMonthSpan = document.getElementById('balance-month');
    const netWorthDiv = document.getElementById('net-worth'); // Para estilo del span
    const balanceMonthDiv = document.getElementById('monthly-balance'); // Para estilo del span

    if (!assetsTotalSpan || !liabilitiesTotalSpan || !worthTotalSpan || !incomeMonthSpan || !expenseMonthSpan || !balanceMonthSpan) {
        console.error("Faltan elementos del DOM para el resumen en dashboard.html");
        return;
    }

    // --- Cálculos ---

    // 1. Activos y Pasivos Totales
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach(acc => {
        const balance = calculateAccountBalance(acc.id); // Función de common.js
        // Considerar tarjetas de crédito como pasivo si tienen saldo negativo
        if (acc.type === 'credit_card' && balance < 0) {
            totalLiabilities += Math.abs(balance);
        } else {
            // Otros tipos de cuenta, o T.C. con saldo positivo (raro), son activos
            // Incluso si una cuenta corriente está en negativo (sobregiro), se considera activo negativo en este cálculo simple.
            totalAssets += balance;
        }
    });

    debts.forEach(debt => {
        totalLiabilities += calculateDebtRemaining(debt.id); // Función de common.js
    });

    // 2. Patrimonio Neto
    const netWorth = totalAssets - totalLiabilities;

    // 3. Ingresos y Gastos del Mes Actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions.forEach(t => {
        // Asegurarse de que dateObj existe y es una fecha válida
        if (t.dateObj && t.dateObj >= startOfMonth && t.dateObj < startOfNextMonth) {
            if (t.type === 'income') {
                monthlyIncome += t.amount;
            } else if (t.type === 'expense') {
                monthlyExpense += t.amount;
            }
            // Las transferencias y pagos de deuda no cuentan directamente como ingreso/gasto en este resumen simple
        }
    });

    // 4. Balance del Mes
    const monthlyBalance = monthlyIncome - monthlyExpense;

    // --- Actualizar DOM ---
    assetsTotalSpan.textContent = formatCurrency(totalAssets);
    liabilitiesTotalSpan.textContent = formatCurrency(totalLiabilities);
    worthTotalSpan.textContent = formatCurrency(netWorth);
    incomeMonthSpan.textContent = formatCurrency(monthlyIncome);
    expenseMonthSpan.textContent = formatCurrency(monthlyExpense);
    balanceMonthSpan.textContent = formatCurrency(monthlyBalance);

    // Aplicar estilo condicional al Patrimonio Neto y Balance Mensual
    applyConditionalStyle(worthTotalSpan, netWorth);
    applyConditionalStyle(balanceMonthSpan, monthlyBalance);

    console.log("Resumen del dashboard renderizado.");
}

/**
 * Aplica clases de estilo (text-income o text-expense) a un elemento
 * basado en si el valor es positivo/cero o negativo.
 * @param {HTMLElement} element El elemento SPAN que contiene el valor.
 * @param {number} value El valor numérico.
 */
function applyConditionalStyle(element, value) {
    if (!element) return;
    element.classList.remove('text-income', 'text-expense'); // Limpiar clases previas
    if (value >= 0) {
        element.classList.add('text-income');
    } else {
        element.classList.add('text-expense');
    }
}

