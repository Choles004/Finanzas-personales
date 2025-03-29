// common.js - Completo y CORREGIDO

// --- Estado Global de la Aplicación ---
let accounts = [];
let debts = [];
let transactions = [];
let budgets = []; // Array para presupuestos
let appSettings = {
    currency: 'EUR',
    // Podríamos añadir más configuraciones aquí en el futuro
};

// --- Clave para LocalStorage ---
const LOCAL_STORAGE_KEY = 'financialManagerData_v2'; // v2 para evitar conflictos

// --- Funciones de Gestión de Datos (LocalStorage) ---

/**
 * Carga los datos desde LocalStorage al estado global.
 */
function loadData() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            // Validar que las propiedades esperadas existan y sean arrays/objetos
            accounts = Array.isArray(data.accounts) ? data.accounts : [];
            debts = Array.isArray(data.debts) ? data.debts : [];
            transactions = Array.isArray(data.transactions) ? data.transactions : [];
            budgets = Array.isArray(data.budgets) ? data.budgets : []; // Cargar presupuestos
            appSettings = (typeof data.settings === 'object' && data.settings !== null) ? data.settings : { currency: 'EUR' };

            // Asegurar que la moneda por defecto esté si falta
            if (!appSettings.currency) {
                appSettings.currency = 'EUR';
            }

            console.log("Datos cargados:", { accounts, debts, transactions, budgets, appSettings });

        } catch (error) {
            console.error("Error al parsear datos de LocalStorage:", error);
            // Inicializar con valores por defecto si hay error
            initializeDefaultData();
        }
    } else {
        // Si no hay datos guardados, inicializar
        initializeDefaultData();
        console.log("No se encontraron datos guardados, inicializando.");
    }
    // Asegurar que las transacciones tengan objetos Date (importante después de cargar JSON)
    transactions = transactions.map(t => ({
        ...t,
        // Parsear la fecha asegurando que se interprete como local y no UTC
        dateObj: parseLocalDate(t.date) // Usar función auxiliar para parsear fecha local
    })).filter(t => t.dateObj instanceof Date && !isNaN(t.dateObj)); // Filtrar fechas inválidas
}

/**
 * Guarda el estado actual de la aplicación en LocalStorage.
 */
function saveData() {
    try {
        // Clonar transacciones para quitar 'dateObj' antes de guardar
        // Asegurarse de que la fecha se guarde en formato YYYY-MM-DD
        const transactionsToSave = transactions.map(({ dateObj, ...rest }) => ({
            ...rest,
            date: dateObj instanceof Date && !isNaN(dateObj)
                  ? dateObj.toISOString().split('T')[0] // Formato YYYY-MM-DD
                  : rest.date // Mantener la fecha original si dateObj es inválido
        }));

        const dataToSave = {
            accounts: accounts,
            debts: debts,
            transactions: transactionsToSave,
            budgets: budgets, // Guardar presupuestos
            settings: appSettings
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
        console.log("Datos guardados.");
    } catch (error) {
        console.error("Error al guardar datos en LocalStorage:", error);
        alert("Error al intentar guardar los datos. Podría ser que el almacenamiento está lleno.");
    }
}

/**
 * Inicializa las variables de estado con arrays/objetos vacíos o valores por defecto.
 */
function initializeDefaultData() {
    accounts = [];
    debts = [];
    transactions = [];
    budgets = [];
    appSettings = { currency: 'EUR' };
}

/**
 * Limpia todos los datos de la aplicación.
 * (Esta función se suele llamar desde settings.js)
 */
function clearAllDataGlobal() {
    if (confirm('¡ATENCIÓN! Esto eliminará TODOS los datos (Cuentas, Deudas, Transacciones, Presupuestos). Esta acción NO se puede deshacer. ¿Estás MUY seguro?')) {
        initializeDefaultData();
        saveData(); // Guardar el estado vacío
        alert('Todos los datos han sido eliminados.');
        // Recargar la página actual o redirigir a inicio para reflejar el cambio
        window.location.href = 'index.html';
    }
}


// --- Funciones de Utilidad ---

/**
 * Parsea una cadena de fecha 'YYYY-MM-DD' como fecha local.
 * Evita problemas comunes de zona horaria al crear objetos Date.
 * @param {string} dateString La fecha en formato 'YYYY-MM-DD'.
 * @returns {Date|null} Objeto Date local o null si el formato es inválido.
 */
function parseLocalDate(dateString) {
    if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // No mostrar warning si la cadena es vacía o nula, solo si tiene formato incorrecto
        if (dateString) {
           console.warn(`Formato de fecha inválido encontrado: ${dateString}`);
        }
        return null; // Retorna null si el formato no es válido o la cadena está vacía/nula
    }
    // Añadir tiempo T00:00:00 para asegurar interpretación local
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
        console.warn(`No se pudo parsear la fecha (resultado inválido): ${dateString}`);
        return null; // Retorna null si la fecha resultante es inválida
    }
    return date;
}


/**
 * Genera un ID único simple basado en timestamp y aleatorio.
 * @param {string} prefix Prefijo para el ID (ej: 'acc', 'txn')
 * @returns {string} ID único.
 */
function getUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Formatea un número como moneda según la configuración global.
 * @param {number} amount El monto a formatear.
 * @param {string} [currencyCode=appSettings.currency] El código de moneda (opcional).
 * @returns {string} El monto formateado como cadena.
 */
function formatCurrency(amount, currencyCode = appSettings.currency) {
    const options = { style: 'currency', currency: currencyCode };
    let locale = 'es-ES'; // Predeterminado Español

    // Manejar valores no numéricos o nulos/undefined
    if (typeof amount !== 'number' || isNaN(amount)) {
       amount = 0;
    }

    if (currencyCode === 'USD') {
        locale = 'en-US';
    } else if (currencyCode === 'COP') {
        locale = 'es-CO';
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else { // EUR y otros por defecto
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    try {
        return new Intl.NumberFormat(locale, options).format(amount);
    } catch (e) {
        console.warn(`Error formateando moneda ${currencyCode} con locale ${locale}:`, e);
        // Fallback simple
        const prefix = currencyCode === 'EUR' ? '€' : (currencyCode === 'USD' ? '$' : `${currencyCode} `);
        const decimals = (currencyCode === 'COP') ? 0 : 2;
        // Formato fallback básico que funcione en más entornos
        return `${prefix}${amount.toFixed(decimals)}`;
    }
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} unsafe La cadena potencialmente insegura.
 * @returns {string} La cadena escapada.
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&")
         .replace(/</g, "<")
         .replace(/>/g, ">")
         .replace(/"/g, "+")
         .replace(/'/g, "'");
}

/**
 * Obtiene parámetros de la URL.
 * @param {string} name El nombre del parámetro.
 * @returns {string|null} El valor del parámetro o null si no existe.
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


// --- Funciones de Cálculo ---

/**
 * Calcula el saldo actual de una cuenta específica.
 * @param {string} accountId El ID de la cuenta.
 * @returns {number} El saldo calculado.
 */
function calculateAccountBalance(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    // Si la cuenta no existe, retornar 0 o lanzar un error según preferencia
    if (!account) {
        console.warn(`No se encontró la cuenta con ID: ${accountId} para calcular saldo.`);
        return 0;
    }

    let balance = account.initialBalance || 0; // Usar 0 si no hay saldo inicial definido

    transactions.forEach(t => {
        // Asegurarse que el monto es numérico
        const amount = typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0;

        if (t.type === 'income' && t.accountId === accountId) balance += amount;
        else if (t.type === 'expense' && t.accountId === accountId) balance -= amount;
        else if (t.type === 'transfer') {
            if (t.fromAccountId === accountId) balance -= amount;
            if (t.toAccountId === accountId) balance += amount;
        } else if (t.type === 'debt_payment' && t.accountId === accountId) balance -= amount;
    });

    return balance;
}

/**
 * Calcula el monto restante de una deuda específica.
 * @param {string} debtId El ID de la deuda.
 * @returns {number} El monto restante (siempre >= 0).
 */
function calculateDebtRemaining(debtId) {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) {
        console.warn(`No se encontró la deuda con ID: ${debtId} para calcular restante.`);
        return 0;
    }

    let remaining = debt.initialAmount || 0;
    transactions
        .filter(t => t.type === 'debt_payment' && t.debtId === debtId)
        .forEach(payment => {
            const paymentAmount = typeof payment.amount === 'number' && !isNaN(payment.amount) ? payment.amount : 0;
            remaining -= paymentAmount;
        });

    return Math.max(0, remaining); // No devolver negativo
}

/**
* Calcula el gasto total para una categoría específica en un período dado.
* @param {string} category La categoría a calcular (case-insensitive).
* @param {Date} startDate Fecha de inicio del período (inclusive).
* @param {Date} endDate Fecha de fin del período (exclusiva).
* @returns {number} El gasto total en esa categoría y período.
*/
function calculateCategorySpending(category, startDate, endDate) {
   if (!(startDate instanceof Date && !isNaN(startDate)) || !(endDate instanceof Date && !isNaN(endDate))) {
       console.error("Fechas inválidas para calculateCategorySpending");
       return 0;
   }
   // Si la categoría es nula o vacía, no calcular
   if (!category) return 0;

   const lowerCaseCategory = category.toLowerCase();

   return transactions
       .filter(t =>
           t.type === 'expense' &&
           t.category && // Asegurar que la categoría existe en la transacción
           t.category.toLowerCase() === lowerCaseCategory &&
           t.dateObj instanceof Date && !isNaN(t.dateObj) && // Verificar que dateObj es válido
           t.dateObj >= startDate &&
           t.dateObj < endDate
       )
       .reduce((sum, t) => sum + (typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0), 0);
}


// --- Funciones de Búsqueda y Obtención de Datos ---

function getAccountById(id) { return accounts.find(acc => acc.id === id); }
function getAccountNameById(id) { return getAccountById(id)?.name ?? 'N/A'; } // Optional chaining
function getDebtById(id) { return debts.find(debt => debt.id === id); }
function getDebtNameById(id) { return getDebtById(id)?.name ?? 'N/A'; }
function getTransactionById(id) { return transactions.find(t => t.id === id); }
function getBudgetByCategory(category) {
    if (!category) return undefined;
    const lowerCaseCategory = category.toLowerCase();
    return budgets.find(b => b.category && b.category.toLowerCase() === lowerCaseCategory);
}

function getAccountTypeName(type) {
    const names = {
        checking: 'Corriente/Ahorros', cash: 'Efectivo', credit_card: 'T. Crédito',
        digital_wallet: 'Billetera Digital', investment: 'Inversión', other_asset: 'Otro Activo'
    };
    return names[type] || type || 'Desconocido';
}

function getTransactionTypeName(type) {
     const names = {
         income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia', debt_payment: 'Pago Deuda'
     };
     return names[type] || type || 'Desconocido';
}

/**
* Obtiene una lista de categorías únicas de gastos o ingresos.
* @param {'expense' | 'income' | 'all'} [type='expense'] El tipo de transacción para filtrar categorías. 'all' para todas.
* @returns {string[]} Array de nombres de categorías únicas, ordenadas.
*/
function getUniqueCategories(type = 'expense') {
    const categories = new Set(); // Usar Set para eficiencia en unicidad
    transactions.forEach(t => {
        // Asegurarse que la categoría es una cadena no vacía
        if ((type === 'all' || t.type === type) && typeof t.category === 'string' && t.category.trim()) {
            categories.add(t.category.trim()); // Añadir y quitar espacios extra
        }
    });
    // Ordenar alfabéticamente ignorando mayúsculas/minúsculas iniciales y acentos básicos
    return Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// --- Funciones de Interfaz Común ---

/**
 * Actualiza el selector de moneda en la barra de navegación (si existe).
 */
function updateCurrencySelectorDisplay() {
    const currencySelectNav = document.getElementById('currency-select-nav');
    if (currencySelectNav) {
        currencySelectNav.value = appSettings.currency;
    }
}

/**
 * Inicializa el selector de moneda en la barra de navegación y añade listener.
 */
function initCurrencySelector() {
    const currencySelectNav = document.getElementById('currency-select-nav');
    if (!currencySelectNav) {
        console.warn("Selector de moneda 'currency-select-nav' no encontrado.");
        return;
    }

    const currencies = [
        { code: 'EUR', name: 'Euro (€)' }, { code: 'USD', name: 'Dólar ($)' },
        { code: 'COP', name: 'Peso Col. (COP$)' }, { code: 'GBP', name: 'Libra (£)' }, // Ejemplo añadido
        // Añadir más monedas aquí
    ];

    currencySelectNav.innerHTML = currencies
        .map(c => `<option value="${c.code}">${c.name}</option>`) // No poner selected aquí, lo hacemos después
        .join('');

    // Establecer el valor DESPUÉS de añadir las opciones
    currencySelectNav.value = appSettings.currency;

    currencySelectNav.addEventListener('change', () => {
        const newCurrency = currencySelectNav.value;
        if (newCurrency !== appSettings.currency) {
            appSettings.currency = newCurrency;
            saveData();
            console.log(`Moneda cambiada a: ${appSettings.currency}. Recargando para aplicar cambios...`);
            // Recargar para asegurar que TODOS los formatos de moneda se actualicen en todas partes.
            window.location.reload();
        }
    });
}

/**
 * Marca el enlace de navegación activo.
 */
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('#nav-menu ul li a'); // Selector más específico
    // Obtener la ruta relativa sin la barra inicial, manejar raíz como index.html
    let currentPagePath = window.location.pathname;
    if (currentPagePath.startsWith('/')) {
        currentPagePath = currentPagePath.substring(1);
    }
    if (currentPagePath === '') {
        currentPagePath = 'index.html';
    }

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPagePath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// --- Ejecución Inicial ---

// 1. Cargar los datos existentes al iniciar la aplicación
// Es crucial que esto ocurra ANTES del DOMContentLoaded si otros scripts dependen de los datos
try {
    loadData();
} catch (error) {
    console.error("Error fatal durante loadData inicial:", error);
    // Podríamos intentar inicializar datos por defecto aquí como último recurso
    initializeDefaultData();
    // Quizás mostrar un mensaje al usuario
    alert("Hubo un error al cargar los datos iniciales. Se usarán valores por defecto.");
}


// 2. Escuchar el evento DOMContentLoaded para interactuar con el DOM de forma segura
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado y parseado.");

    // Verificar si loadData funcionó (las variables globales deberían estar definidas)
    if (typeof accounts === 'undefined' || typeof appSettings === 'undefined') {
         console.error("¡Error crítico! Los datos globales (accounts, appSettings) no están definidos después de loadData. Deteniendo inicialización del DOM.");
         // Podría mostrar un mensaje de error en la página
         document.body.innerHTML = '<div style="color: red; padding: 20px;">Error crítico al cargar datos. Por favor, revisa la consola o intenta limpiar los datos de la aplicación.</div>';
         return; // Detener la ejecución si los datos base no cargaron
    }

    // 3. Inicializar elementos comunes de la interfaz (Nav, Moneda)
    try {
        initCurrencySelector(); // Inicializa opciones y listener
        setActiveNavLink();     // Marca el enlace activo
    } catch (error) {
         console.error("Error durante la inicialización de la interfaz común (Nav/Moneda):", error);
    }

        // 4. Lógica del Menú Hamburguesa
    const menuToggleBtn = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggleBtn && navMenu) {
        try {
            menuToggleBtn.addEventListener('click', () => {
                const isOpen = navMenu.classList.toggle('open');
                menuToggleBtn.setAttribute('aria-expanded', isOpen);
                menuToggleBtn.classList.toggle('open', isOpen);
                document.body.style.overflow = isOpen ? 'hidden' : ''; // Bloquear/desbloquear scroll
            });

            // Cerrar menú al hacer clic en un enlace dentro de él
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    if (navMenu.classList.contains('open') && link.getAttribute('href') && link.getAttribute('href').endsWith('.html')) {
                        navMenu.classList.remove('open');
                        menuToggleBtn.setAttribute('aria-expanded', 'false');
                        menuToggleBtn.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                });
            });

             // (Opcional Avanzado pero CORREGIDO) Cerrar menú al hacer clic fuera
             document.addEventListener('click', (event) => {
                // Asegurarse que los elementos existen antes de usarlos
                if (!navMenu || !menuToggleBtn) return;

                const isClickInsideNav = navMenu.contains(event.target);
                const isClickOnToggle = menuToggleBtn.contains(event.target);

                if (!isClickInsideNav && !isClickOnToggle && navMenu.classList.contains('open')) {
                     navMenu.classList.remove('open');
                     menuToggleBtn.setAttribute('aria-expanded', 'false');
                     menuToggleBtn.classList.remove('open');
                     document.body.style.overflow = '';
                }
            }); // <<<--- ¡¡EL PARÉNTESIS FALTANTE ESTABA AQUÍ!!

        } catch (error) {
            console.error("Error al configurar listeners del menú hamburguesa:", error);
        }

    } else {
         console.warn("No se encontraron los elementos del menú hamburguesa (menu-toggle o nav-menu).");
    }

    console.log("Inicialización común completada.");
    // Los scripts específicos de cada página (dashboard.js, accounts.js, etc.)
    // se ejecutarán después de esto si usan 'defer'.
}); // Fin del listener DOMContentLoaded

console.log("common.js cargado y parseado.");