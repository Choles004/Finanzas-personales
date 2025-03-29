// settings.js

document.addEventListener('DOMContentLoaded', () => {
    // Dependencias
    if (typeof appSettings === 'undefined' || typeof saveData === 'undefined' || typeof loadData === 'undefined' || typeof clearAllDataGlobal === 'undefined') {
        console.error("Error: Funciones o datos esenciales de common.js no encontrados en settings.js");
        alert("Error crítico al cargar la página de configuración. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const currencySelect = document.getElementById('currency-select-settings');
    const saveCurrencyBtn = document.getElementById('save-currency-btn'); // Puede ser opcional si usamos el de la nav
    const downloadBtn = document.getElementById('download-data');
    const uploadBtn = document.getElementById('upload-data');
    const fileInput = document.getElementById('file-input'); // Input oculto
    const clearDataBtn = document.getElementById('clear-data');

    // --- Inicialización ---
    initializeSettingsPage();

    // --- Event Listeners ---

    // Guardar Moneda (Podría ser redundante si el selector de nav ya lo hace)
    // Si se mantiene este botón, asegura que haga lo mismo que el selector de nav
    if (saveCurrencyBtn && currencySelect) {
        saveCurrencyBtn.addEventListener('click', () => {
            const selectedCurrency = currencySelect.value;
            if (selectedCurrency !== appSettings.currency) {
                appSettings.currency = selectedCurrency;
                try {
                    saveData();
                    alert(`Moneda global cambiada a ${selectedCurrency}. La página se recargará para aplicar los cambios.`);
                    window.location.reload(); // Recargar para aplicar globalmente
                } catch (error) {
                    console.error("Error al guardar la nueva moneda:", error);
                    alert("Error al guardar la configuración de moneda.");
                }
            } else {
                alert("La moneda seleccionada ya es la moneda actual.");
            }
        });
    }

    // Descargar Datos
    downloadBtn.addEventListener('click', downloadDataBackup);

    // Activar Carga de Datos (al hacer clic en el botón visible)
    uploadBtn.addEventListener('click', () => {
        fileInput.click(); // Abre el selector de archivos
    });

    // Manejar Archivo Seleccionado
    fileInput.addEventListener('change', handleFileUpload);

    // Limpiar Todos los Datos
    clearDataBtn.addEventListener('click', () => {
        // La confirmación está dentro de clearAllDataGlobal
        clearAllDataGlobal(); // Llama a la función segura de common.js
    });


    // --- Funciones Específicas de la Página ---

    /** Inicializa los valores en la página de configuración */
    function initializeSettingsPage() {
        // Asegurar que el selector muestre la moneda actual
        if (currencySelect) {
            // Llenar opciones si no lo hizo common.js (redundancia segura)
            if(currencySelect.options.length <= 1) {
                 const currencies = [
                    { code: 'EUR', name: 'Euro (€)' }, { code: 'USD', name: 'Dólar ($)' },
                    { code: 'COP', name: 'Peso Col. (COP$)' }, { code: 'GBP', name: 'Libra (£)' }
                 ];
                 currencySelect.innerHTML = currencies.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
            }
            currencySelect.value = appSettings.currency;
        } else {
            console.warn("Elemento 'currency-select-settings' no encontrado.");
        }
    }

    /** Exporta los datos actuales a un archivo JSON */
    function downloadDataBackup() {
        console.log("Iniciando descarga de datos...");
        try {
            // Preparar los datos (similar a saveData pero para descarga)
             const transactionsToExport = transactions.map(({ dateObj, ...rest }) => ({
                ...rest,
                date: dateObj instanceof Date && !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : rest.date
            }));
            const dataToExport = {
                accounts,
                debts,
                transactions: transactionsToExport,
                budgets,
                settings: appSettings,
                exportTimestamp: new Date().toISOString() // Añadir marca de tiempo de exportación
            };

            const dataStr = JSON.stringify(dataToExport, null, 2); // null, 2 para formato legible
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });

            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
            const filename = `gestorFinancieroBackup_${timestamp}.json`;

            // Crear enlace y simular clic para descargar
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = filename;
            document.body.appendChild(link); // Necesario para Firefox
            link.click();
            document.body.removeChild(link); // Limpiar
            URL.revokeObjectURL(link.href); // Liberar memoria

            console.log(`Datos exportados a ${filename}`);
            alert(`Datos exportados correctamente como "${filename}".`);

        } catch (error) {
            console.error("Error al generar el archivo de descarga:", error);
            alert("Se produjo un error al intentar exportar los datos.");
        }
    }

    /** Maneja la selección de un archivo JSON para importar */
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log("No se seleccionó ningún archivo.");
            return; // No se seleccionó archivo
        }

        if (!file.name.toLowerCase().endsWith('.json')) {
             alert("Por favor, selecciona un archivo JSON válido.");
             fileInput.value = ''; // Resetear input
             return;
        }

        console.log(`Archivo seleccionado para importar: ${file.name}`);
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const loadedContent = e.target.result;
                const loadedData = JSON.parse(loadedContent);

                // --- Validación de Estructura ---
                if (typeof loadedData !== 'object' || loadedData === null ||
                    !Array.isArray(loadedData.accounts) ||
                    !Array.isArray(loadedData.debts) ||
                    !Array.isArray(loadedData.transactions) ||
                    !Array.isArray(loadedData.budgets) || // Validar budgets
                    typeof loadedData.settings !== 'object' || loadedData.settings === null)
                {
                    throw new Error("El archivo JSON no tiene la estructura esperada (accounts, debts, transactions, budgets, settings).");
                }

                // --- Confirmación del Usuario ---
                 if (confirm('IMPORTANTE:\n\nEsto reemplazará TODOS tus datos actuales (Cuentas, Deudas, Transacciones, Presupuestos y Configuración) con el contenido de este archivo.\n\n¿Estás SEGURO de que quieres continuar?')) {
                     // Reemplazar datos globales
                     accounts = loadedData.accounts;
                     debts = loadedData.debts;
                     transactions = loadedData.transactions; // Se parseará dateObj en el siguiente loadData
                     budgets = loadedData.budgets;
                     appSettings = loadedData.settings;

                     // Asegurar que la moneda exista si falta en el archivo importado
                     if (!appSettings.currency) { appSettings.currency = 'EUR'; }

                     // --- Guardar y Recargar ---
                     saveData(); // Guardar los nuevos datos importados
                     alert('¡Datos importados correctamente! La aplicación se recargará.');
                     window.location.reload(); // Recargar para aplicar todos los cambios y parsear dateObj
                 } else {
                      console.log("Importación cancelada por el usuario.");
                      fileInput.value = ''; // Resetear input
                 }

            } catch (error) {
                console.error("Error al procesar el archivo JSON:", error);
                alert(`Error al importar: ${error.message}`);
                fileInput.value = ''; // Resetear input
            }
        };

        reader.onerror = function() {
            console.error("Error al leer el archivo.");
            alert('Error al leer el archivo seleccionado.');
            fileInput.value = ''; // Resetear input
        };

        reader.readAsText(file); // Leer el archivo como texto
    }

}); // Fin del DOMContentLoaded

