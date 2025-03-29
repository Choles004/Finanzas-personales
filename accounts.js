// accounts.js

document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que common.js se cargó y los datos están disponibles
    if (typeof accounts === 'undefined' || typeof formatCurrency === 'undefined') {
        console.error("Error: common.js no parece haberse cargado correctamente antes de accounts.js");
        alert("Error crítico al cargar la página de cuentas. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const accountForm = document.getElementById('account-form');
    const accountFormTitle = document.getElementById('account-form-title');
    const accountNameInput = document.getElementById('account-name');
    const accountTypeSelect = document.getElementById('account-type');
    const accountBalanceInput = document.getElementById('account-balance');
    const accountListUl = document.getElementById('account-list');
    const editAccountIdInput = document.getElementById('edit-account-id');
    const submitButton = document.getElementById('account-submit-btn');
    const cancelButton = document.getElementById('cancel-edit-account-btn');

    // --- Renderizado Inicial ---
    renderAccountList();

    // --- Event Listeners ---

    // Envío del formulario (Añadir o Editar Cuenta)
    accountForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Evitar recarga de página

        const name = accountNameInput.value.trim();
        const type = accountTypeSelect.value;
        // Convertir a número, asegurando que sea válido, usar 0 si no
        const initialBalance = parseFloat(accountBalanceInput.value) || 0;
        const editingId = editAccountIdInput.value;

        if (!name) {
            alert("Por favor, introduce un nombre para la cuenta.");
            accountNameInput.focus();
            return;
        }
        // No se necesita validar saldo inicial > 0, puede ser 0 o negativo

        if (editingId) {
            // --- Modo Edición ---
            const accountIndex = accounts.findIndex(acc => acc.id === editingId);
            if (accountIndex > -1) {
                // Comprobar si el nombre ya existe (excluyendo la cuenta actual)
                if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase() && acc.id !== editingId)) {
                    alert(`Ya existe otra cuenta con el nombre "${name}".`);
                    accountNameInput.focus();
                    return;
                }
                // Actualizar los datos de la cuenta
                accounts[accountIndex].name = name;
                accounts[accountIndex].type = type;
                accounts[accountIndex].initialBalance = initialBalance;

                console.log(`Cuenta actualizada: ${editingId}`);
                alert(`Cuenta "${name}" actualizada.`);
            } else {
                console.error(`Error: No se encontró la cuenta con ID ${editingId} para editar.`);
                alert("Error al actualizar la cuenta. No se encontró.");
            }
        } else {
            // --- Modo Añadir ---
            // Comprobar si el nombre ya existe
            if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
                 alert(`Ya existe una cuenta con el nombre "${name}".`);
                 accountNameInput.focus();
                 return;
            }

            const newAccount = {
                id: getUniqueId('acc'), // Función de common.js
                name,
                type,
                initialBalance
            };
            accounts.push(newAccount);
            console.log("Nueva cuenta añadida:", newAccount);
        }

        // --- Guardar y Actualizar UI ---
        try {
            saveData(); // ¡Llamada crucial para guardar los cambios!
            renderAccountList(); // Volver a dibujar la lista
            resetAccountForm(); // Limpiar el formulario
        } catch (error) {
             console.error("Error al guardar datos o renderizar lista:", error);
             alert("Se produjo un error al guardar los cambios. Revisa la consola.");
        }
    });

    // Cancelar Edición
    cancelButton.addEventListener('click', () => {
        resetAccountForm();
    });

    // Delegación de eventos para botones Editar y Eliminar en la lista
    accountListUl.addEventListener('click', (e) => {
        const target = e.target;

        // Botón Editar
        if (target.classList.contains('edit-btn') && target.dataset.id) {
            const accountId = target.dataset.id;
            startEditingAccount(accountId);
        }
        // Botón Eliminar
        else if (target.classList.contains('delete-btn') && target.dataset.id) {
            const accountId = target.dataset.id;
            deleteAccount(accountId);
        }
    });

    // --- Funciones Específicas de la Página ---

    /**
     * Renderiza la lista de cuentas en el UL.
     */
    function renderAccountList() {
        console.log("Renderizando lista de cuentas...");
        accountListUl.innerHTML = ''; // Limpiar lista actual

        if (accounts.length === 0) {
            accountListUl.innerHTML = '<li>No hay cuentas registradas. Añade una usando el formulario.</li>';
            return;
        }

        // Ordenar cuentas alfabéticamente por nombre para consistencia
        const sortedAccounts = [...accounts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        sortedAccounts.forEach(acc => {
            const balance = calculateAccountBalance(acc.id); // De common.js
            const li = document.createElement('li');

            // Añadir clases específicas por tipo para styling (ver CSS)
            li.classList.add('item-list-item'); // Clase genérica si es necesario
            if (acc.type === 'credit_card') li.classList.add('account-credit');
            if (acc.type === 'investment') li.classList.add('account-investment');

            li.innerHTML = `
                <div class="item-info">
                    <strong>${escapeHtml(acc.name)}</strong>
                    <small>Tipo: ${getAccountTypeName(acc.type)}</small>
                    <small>Saldo Inicial: ${formatCurrency(acc.initialBalance)}</small>
                </div>
                <div class="item-balance" style="color: ${balance < 0 ? 'var(--expense-color)' : 'var(--income-color)'};">
                    Saldo Actual: ${formatCurrency(balance)}
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${acc.id}" title="Editar Cuenta">Editar</button>
                    <button class="delete-btn" data-id="${acc.id}" title="Eliminar Cuenta">X</button>
                </div>
            `;
            accountListUl.appendChild(li);
        });
        console.log("Lista de cuentas renderizada.");
    }

    /**
     * Prepara el formulario para editar una cuenta existente.
     * @param {string} accountId ID de la cuenta a editar.
     */
    function startEditingAccount(accountId) {
        const account = getAccountById(accountId); // De common.js
        if (!account) {
            alert("No se encontró la cuenta para editar.");
            return;
        }

        console.log(`Iniciando edición para cuenta: ${accountId}`);

        // Rellenar el formulario con los datos de la cuenta
        editAccountIdInput.value = account.id;
        accountNameInput.value = account.name;
        accountTypeSelect.value = account.type;
        accountBalanceInput.value = account.initialBalance.toFixed(2); // Asegurar formato para input number

        // Cambiar UI del formulario a modo edición
        accountFormTitle.textContent = 'Editar Cuenta';
        submitButton.textContent = 'Guardar Cambios';
        submitButton.classList.add('edit-mode'); // Podríamos usar esto para estilizar
        cancelButton.classList.remove('hidden'); // Mostrar botón cancelar

        // Opcional: Hacer scroll hacia el formulario
        accountForm.scrollIntoView({ behavior: 'smooth' });
        accountNameInput.focus(); // Poner foco en el primer campo
    }

    /**
     * Restablece el formulario al modo "Añadir Nueva Cuenta".
     */
    function resetAccountForm() {
        console.log("Reseteando formulario de cuenta.");
        accountForm.reset(); // Resetea valores de inputs
        editAccountIdInput.value = ''; // Limpiar ID de edición
        accountFormTitle.textContent = 'Añadir Nueva Cuenta';
        submitButton.textContent = 'Añadir Cuenta';
        submitButton.classList.remove('edit-mode');
        cancelButton.classList.add('hidden'); // Ocultar botón cancelar
    }

    /**
     * Elimina una cuenta después de confirmación y validación.
     * @param {string} accountId ID de la cuenta a eliminar.
     */
    function deleteAccount(accountId) {
        const account = getAccountById(accountId);
        if (!account) {
            alert("No se encontró la cuenta para eliminar.");
            return;
        }

        // --- Validación Crucial: Comprobar si hay transacciones asociadas ---
        const hasTransactions = transactions.some(t =>
            t.accountId === accountId ||
            t.fromAccountId === accountId ||
            t.toAccountId === accountId
        );

        if (hasTransactions) {
            alert(`No se puede eliminar la cuenta "${escapeHtml(account.name)}" porque tiene transacciones asociadas.\n\nPara eliminarla, primero debes eliminar o reasignar todas las transacciones relacionadas con esta cuenta.`);
            return;
        }

        // --- Confirmación ---
        if (confirm(`¿Estás SEGURO de que quieres eliminar la cuenta "${escapeHtml(account.name)}"?\n\nSaldo Actual: ${formatCurrency(calculateAccountBalance(accountId))}\n\n¡Esta acción no se puede deshacer!`)) {
            // Filtrar la cuenta del array
            accounts = accounts.filter(acc => acc.id !== accountId);

            // --- Guardar y Actualizar UI ---
            try {
                saveData(); // ¡Guardar el cambio!
                console.log(`Cuenta eliminada: ${accountId}`);
                renderAccountList(); // Volver a dibujar la lista
                resetAccountForm(); // Resetear por si se estaba editando la cuenta eliminada
                alert(`Cuenta "${escapeHtml(account.name)}" eliminada.`);
            } catch (error) {
                console.error("Error al guardar datos tras eliminar cuenta:", error);
                // Si falla el guardado, podríamos intentar revertir la eliminación (más complejo)
                // Por ahora, solo informamos
                alert("Se produjo un error al guardar los cambios después de eliminar. Revisa la consola.");
                // Volver a cargar los datos podría ser una opción drástica pero segura
                // loadData(); renderAccountList();
            }
        }
    }

}); // Fin del DOMContentLoaded

