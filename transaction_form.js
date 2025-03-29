// transaction_form.js

document.addEventListener('DOMContentLoaded', () => {
    // Verificar dependencias
    if (typeof accounts === 'undefined' || typeof debts === 'undefined' || typeof transactions === 'undefined' || typeof formatCurrency === 'undefined') {
        console.error("Error: common.js o sus datos no parecen haberse cargado correctamente antes de transaction_form.js");
        alert("Error crítico al cargar el formulario de transacciones. Revisa la consola.");
        // Podríamos deshabilitar el formulario o redirigir
        return;
    }

    // --- Selección de Elementos DOM ---
    const form = document.getElementById('transaction-form');
    const formTitle = document.getElementById('form-title');
    const typeSelect = document.getElementById('transaction-type');
    const descriptionInput = document.getElementById('transaction-description');
    const amountInput = document.getElementById('transaction-amount');
    const dateInput = document.getElementById('transaction-date');
    const categoryInput = document.getElementById('transaction-category');
    const categorySuggestions = document.getElementById('category-suggestions');
    const accountSelect = document.getElementById('transaction-account');
    const accountFromSelect = document.getElementById('transaction-account-from');
    const accountToSelect = document.getElementById('transaction-account-to');
    const debtSelect = document.getElementById('transaction-debt');
    const editIdInput = document.getElementById('edit-id');
    const submitButton = document.getElementById('submit-btn');

    // Contenedores de campos específicos
    const categoryFieldDiv = document.getElementById('category-field');
    const accountFieldDiv = document.getElementById('account-field');
    const accountFromFieldDiv = document.getElementById('account-from-field');
    const accountToFieldDiv = document.getElementById('account-to-field');
    const debtFieldDiv = document.getElementById('debt-field');

    // --- Inicialización ---
    populateAccountDropdowns();
    populateDebtDropdown();
    populateCategorySuggestions();
    loadTransactionForEditing(); // Intentar cargar datos si es una edición
    updateFormVisibility(); // Ajustar campos visibles según tipo (inicial o cargado)

    // Establecer fecha por defecto a hoy SI NO estamos editando
    if (!editIdInput.value && !dateInput.value) {
         // Formatear fecha como YYYY-MM-DD
         const today = new Date();
         const year = today.getFullYear();
         const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Meses son 0-11
         const day = today.getDate().toString().padStart(2, '0');
         dateInput.value = `${year}-${month}-${day}`;
    }


    // --- Event Listeners ---

    // Cambiar visibilidad de campos al cambiar tipo
    typeSelect.addEventListener('change', updateFormVisibility);

    // Envío del formulario (Añadir o Editar)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = typeSelect.value;
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value; // Formato YYYY-MM-DD
        const category = categoryInput.value.trim();
        const accountId = accountSelect.value;
        const fromAccountId = accountFromSelect.value;
        const toAccountId = accountToSelect.value;
        const debtId = debtSelect.value;
        const editingId = editIdInput.value;

        // --- Validaciones Robustas ---
        if (!description) { alert("La descripción es obligatoria."); descriptionInput.focus(); return; }
        if (isNaN(amount) || amount <= 0) { alert("Introduce un monto válido y positivo."); amountInput.focus(); return; }
        if (!date) { alert("La fecha es obligatoria."); dateInput.focus(); return; }
        // Validar fecha real (evitar fechas imposibles parseadas por el navegador)
        if (!parseLocalDate(date)) { alert("La fecha introducida no es válida."); dateInput.focus(); return; }


        let transactionData = {
            // id se asignará al añadir o se usará editingId
            type,
            description,
            amount,
            date, // Guardar como YYYY-MM-DD
            // Campos específicos se añadirán abajo
        };

        // Validaciones y datos específicos por tipo
        if (type === 'income' || type === 'expense') {
            if (!accountId) { alert(`Selecciona la cuenta para el ${type === 'income' ? 'ingreso' : 'gasto'}.`); accountSelect.focus(); return; }
            if (!category && type === 'expense') { alert("La categoría es recomendable para los gastos."); /* No bloquear, pero avisar? */ }
            transactionData.accountId = accountId;
            transactionData.category = category || (type === 'income' ? 'Ingreso Varios' : 'Gasto Varios'); // Categoría por defecto
        } else if (type === 'transfer') {
            if (!fromAccountId || !toAccountId) { alert("Selecciona cuenta de origen y destino."); accountFromSelect.focus(); return; }
            if (fromAccountId === toAccountId) { alert("Las cuentas de origen y destino deben ser diferentes."); accountFromSelect.focus(); return; }
            transactionData.fromAccountId = fromAccountId;
            transactionData.toAccountId = toAccountId;
            transactionData.category = 'Transferencia'; // Forzar categoría
        } else if (type === 'debt_payment') {
            if (!accountId) { alert("Selecciona la cuenta desde la que pagas."); accountSelect.focus(); return; }
            if (!debtId) { alert("Selecciona la deuda que estás pagando."); debtSelect.focus(); return; }

            // Advertencia si el pago es mayor al pendiente (opcional, pero útil)
            const remainingDebt = calculateDebtRemaining(debtId);
            if (amount > remainingDebt) {
                if (!confirm(`El monto a pagar (${formatCurrency(amount)}) es mayor que el saldo pendiente (${formatCurrency(remainingDebt)}) de la deuda seleccionada.\n\n¿Deseas continuar igualmente?`)) {
                    amountInput.focus();
                    return;
                }
            }
            transactionData.accountId = accountId;
            transactionData.debtId = debtId;
            transactionData.category = category || 'Pago Deuda'; // Categoría por defecto o la ingresada
            // Auto-generar descripción si está vacía
            if (!transactionData.description) {
                 transactionData.description = `Pago ${getDebtNameById(debtId) || 'Deuda'}`;
            }
        } else {
            alert("Tipo de transacción no válido."); // Seguridad
            return;
        }

        // --- Guardado (Añadir o Editar) ---
        try {
            if (editingId) {
                // --- Modo Edición ---
                const index = transactions.findIndex(t => t.id === editingId);
                if (index > -1) {
                    // Actualizar manteniendo el ID original y añadiendo dateObj
                    transactions[index] = {
                        ...transactions[index], // Mantener ID y quizás otros campos no editables
                        ...transactionData,    // Sobrescribir con los nuevos datos
                        dateObj: parseLocalDate(transactionData.date) // Actualizar dateObj
                    };
                     console.log(`Transacción actualizada: ${editingId}`);
                    alert('Transacción actualizada correctamente.');
                } else {
                     throw new Error(`No se encontró la transacción con ID ${editingId} para editar.`);
                }
            } else {
                // --- Modo Añadir ---
                const newTransaction = {
                    ...transactionData,
                    id: getUniqueId('txn'),
                    dateObj: parseLocalDate(transactionData.date) // Añadir dateObj
                };
                transactions.push(newTransaction);
                console.log("Nueva transacción añadida:", newTransaction);
                alert('Transacción añadida correctamente.');
            }

            saveData(); // Guardar cambios en localStorage

            // Redirigir al historial después de guardar
            window.location.href = 'transactions.html';

        } catch (error) {
            console.error("Error al guardar la transacción:", error);
            alert(`Se produjo un error al guardar la transacción: ${error.message}`);
        }
    });


    // --- Funciones Auxiliares del Formulario ---

    /** Actualiza la visibilidad de los campos del formulario según el tipo seleccionado. */
    function updateFormVisibility() {
        const type = typeSelect.value;

        // Ocultar todos los campos específicos primero
        categoryFieldDiv.classList.add('hidden');
        accountFieldDiv.classList.add('hidden');
        accountFromFieldDiv.classList.add('hidden');
        accountToFieldDiv.classList.add('hidden');
        debtFieldDiv.classList.add('hidden');

        // Mostrar campos según el tipo
        if (type === 'income' || type === 'expense') {
            categoryFieldDiv.classList.remove('hidden');
            accountFieldDiv.classList.remove('hidden');
        } else if (type === 'transfer') {
            accountFromFieldDiv.classList.remove('hidden');
            accountToFieldDiv.classList.remove('hidden');
            // Categoría no aplica para transferencias, se mantiene oculta y se fuerza en el guardado
        } else if (type === 'debt_payment') {
            categoryFieldDiv.classList.remove('hidden'); // Permitir categoría (ej: Pago Préstamo Coche)
            accountFieldDiv.classList.remove('hidden'); // Cuenta desde la que se paga
            debtFieldDiv.classList.remove('hidden');    // Deuda que se paga
        }
    }

    /** Popula los desplegables de cuentas. */
    function populateAccountDropdowns() {
        const optionsHtml = accounts.length > 0
            ? accounts.map(acc => `<option value="${acc.id}">${escapeHtml(acc.name)} (${formatCurrency(calculateAccountBalance(acc.id))})</option>`).join('')
            : '<option value="">-- Añade una cuenta primero --</option>';

        accountSelect.innerHTML = optionsHtml;
        accountFromSelect.innerHTML = optionsHtml;
        accountToSelect.innerHTML = optionsHtml;
    }

    /** Popula el desplegable de deudas pendientes. */
    function populateDebtDropdown() {
        const pendingDebts = debts.filter(d => calculateDebtRemaining(d.id) > 0);
        const optionsHtml = pendingDebts.length > 0
            ? pendingDebts.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${formatCurrency(calculateDebtRemaining(d.id))} pend.)</option>`).join('')
            : '<option value="">-- No hay deudas pendientes --</option>';

        debtSelect.innerHTML = optionsHtml;
    }

    /** Popula las sugerencias de categorías. */
    function populateCategorySuggestions() {
        // Obtener categorías de gastos e ingresos
        const expenseCategories = getUniqueCategories('expense');
        const incomeCategories = getUniqueCategories('income');
        // Combinar y asegurar unicidad (aunque getUniqueCategories ya lo hace)
        const allCategories = [...new Set([...expenseCategories, ...incomeCategories])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        categorySuggestions.innerHTML = allCategories.map(cat => `<option value="${escapeHtml(cat)}"></option>`).join('');
    }

    /** Carga los datos de una transacción si se está editando (basado en URL param). */
    function loadTransactionForEditing() {
        const transactionId = getUrlParameter('edit'); // Busca ?edit=txn_123...
        if (!transactionId) {
            formTitle.textContent = 'Añadir Nueva Transacción';
            submitButton.textContent = 'Añadir Transacción';
            return; // No estamos editando
        }

        const transaction = getTransactionById(transactionId); // De common.js
        if (!transaction) {
            alert(`Error: No se encontró la transacción con ID ${transactionId} para editar.`);
            // Redirigir o limpiar el ID de edición
            window.location.href = 'transactions.html'; // Volver al historial
            return;
        }

        console.log("Cargando transacción para editar:", transaction);

        // Rellenar formulario
        editIdInput.value = transaction.id;
        typeSelect.value = transaction.type;
        descriptionInput.value = transaction.description;
        amountInput.value = transaction.amount.toFixed(2);
        dateInput.value = transaction.date; // Ya está en YYYY-MM-DD
        categoryInput.value = transaction.category || '';

        // Rellenar campos específicos (importante hacer esto ANTES de llamar a updateFormVisibility si se basa en el tipo)
        if (transaction.accountId) accountSelect.value = transaction.accountId;
        if (transaction.fromAccountId) accountFromSelect.value = transaction.fromAccountId;
        if (transaction.toAccountId) accountToSelect.value = transaction.toAccountId;
        if (transaction.debtId) debtSelect.value = transaction.debtId;

        // Actualizar UI para modo edición
        formTitle.textContent = 'Editar Transacción';
        submitButton.textContent = 'Guardar Cambios';

        // Forzar actualización de visibilidad AHORA que el tipo está seleccionado
        updateFormVisibility();
    }

}); // Fin del DOMContentLoaded

