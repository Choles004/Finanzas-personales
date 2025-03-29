// debts.js

document.addEventListener('DOMContentLoaded', () => {
    // Verificar dependencias de common.js
    if (typeof debts === 'undefined' || typeof formatCurrency === 'undefined' || typeof saveData === 'undefined') {
        console.error("Error: common.js no parece haberse cargado correctamente antes de debts.js");
        alert("Error crítico al cargar la página de deudas. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const debtForm = document.getElementById('debt-form');
    const debtFormTitle = document.getElementById('debt-form-title');
    const debtNameInput = document.getElementById('debt-name');
    const debtAmountInput = document.getElementById('debt-amount');
    const debtDueDateInput = document.getElementById('debt-due-date');
    const debtListUl = document.getElementById('debt-list');
    const editDebtIdInput = document.getElementById('edit-debt-id');
    const submitButton = document.getElementById('debt-submit-btn');
    const cancelButton = document.getElementById('cancel-edit-debt-btn');

    // --- Renderizado Inicial ---
    renderDebtList();

    // --- Event Listeners ---

    // Envío del formulario (Añadir o Editar Deuda)
    debtForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = debtNameInput.value.trim();
        const initialAmount = parseFloat(debtAmountInput.value);
        // Obtener fecha, asegurar que sea null si está vacío, no una cadena vacía
        const dueDate = debtDueDateInput.value ? debtDueDateInput.value : null;
        const editingId = editDebtIdInput.value;

        // Validaciones
        if (!name) {
            alert("Por favor, introduce un nombre para la deuda.");
            debtNameInput.focus();
            return;
        }
        if (isNaN(initialAmount) || initialAmount <= 0) {
            alert("Por favor, introduce un monto inicial válido y mayor que cero.");
            debtAmountInput.focus();
            return;
        }
        // Validación de fecha (opcional, asegurarse que no sea inválida si se introduce)
        if (dueDate && isNaN(new Date(dueDate + 'T00:00:00').getTime())) {
            alert("La fecha de vencimiento introducida no es válida.");
            debtDueDateInput.focus();
            return;
        }


        if (editingId) {
            // --- Modo Edición ---
            const debtIndex = debts.findIndex(d => d.id === editingId);
            if (debtIndex > -1) {
                // Comprobar nombre duplicado (excluyendo la deuda actual)
                if (debts.some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== editingId)) {
                    alert(`Ya existe otra deuda con el nombre "${name}".`);
                    debtNameInput.focus();
                    return;
                }
                // Actualizar datos
                debts[debtIndex].name = name;
                debts[debtIndex].initialAmount = initialAmount;
                debts[debtIndex].dueDate = dueDate; // Guardar null si está vacío
                console.log(`Deuda actualizada: ${editingId}`);
                alert(`Deuda "${name}" actualizada.`);
            } else {
                console.error(`Error: No se encontró la deuda con ID ${editingId} para editar.`);
                alert("Error al actualizar la deuda. No se encontró.");
            }
        } else {
            // --- Modo Añadir ---
             // Comprobar nombre duplicado
            if (debts.some(d => d.name.toLowerCase() === name.toLowerCase())) {
                 alert(`Ya existe una deuda con el nombre "${name}".`);
                 debtNameInput.focus();
                 return;
            }
            const newDebt = {
                id: getUniqueId('debt'),
                name,
                initialAmount,
                dueDate // Guardar null si está vacío
            };
            debts.push(newDebt);
            console.log("Nueva deuda añadida:", newDebt);
        }

        // --- Guardar y Actualizar UI ---
        try {
            saveData(); // Guardar cambios
            renderDebtList(); // Actualizar lista
            resetDebtForm(); // Limpiar formulario
        } catch (error) {
             console.error("Error al guardar datos o renderizar lista de deudas:", error);
             alert("Se produjo un error al guardar los cambios de la deuda. Revisa la consola.");
        }
    });

    // Cancelar Edición
    cancelButton.addEventListener('click', () => {
        resetDebtForm();
    });

    // Delegación de eventos para botones Editar y Eliminar en la lista
    debtListUl.addEventListener('click', (e) => {
        const target = e.target;

        // Botón Editar
        if (target.classList.contains('edit-btn') && target.dataset.id) {
            startEditingDebt(target.dataset.id);
        }
        // Botón Eliminar
        else if (target.classList.contains('delete-btn') && target.dataset.id) {
            deleteDebt(target.dataset.id);
        }
    });

    // --- Funciones Específicas de la Página ---

    /**
     * Renderiza la lista de deudas en el UL.
     */
    function renderDebtList() {
        console.log("Renderizando lista de deudas...");
        debtListUl.innerHTML = '';

        if (debts.length === 0) {
            debtListUl.innerHTML = '<li>No hay deudas registradas.</li>';
            return;
        }

        const sortedDebts = [...debts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        sortedDebts.forEach(debt => {
            const remaining = calculateDebtRemaining(debt.id); // De common.js
            const li = document.createElement('li');
            li.classList.add('debt-item'); // Clase específica para estilo

            // Formatear fecha si existe
            let dueDateFormatted = 'N/A';
            if (debt.dueDate) {
                const dateObj = parseLocalDate(debt.dueDate); // Usar parseador local
                if (dateObj) {
                    dueDateFormatted = dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
                }
            }

            li.innerHTML = `
                <div class="item-info">
                    <strong>${escapeHtml(debt.name)}</strong>
                    <small>Monto Inicial: ${formatCurrency(debt.initialAmount)}</small>
                    <small>Vencimiento: ${dueDateFormatted}</small>
                </div>
                <div class="item-status" style="color: ${remaining > 0 ? 'var(--debt-color)' : 'var(--income-color)'};">
                    ${remaining > 0 ? `Pendiente: ${formatCurrency(remaining)}` : '¡Pagada!'}
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${debt.id}" title="Editar Deuda">Editar</button>
                    <button class="delete-btn" data-id="${debt.id}" title="Eliminar Deuda">X</button>
                </div>
            `;
            debtListUl.appendChild(li);
        });
        console.log("Lista de deudas renderizada.");
    }

    /**
     * Prepara el formulario para editar una deuda existente.
     * @param {string} debtId ID de la deuda a editar.
     */
    function startEditingDebt(debtId) {
        const debt = getDebtById(debtId); // De common.js
        if (!debt) {
            alert("No se encontró la deuda para editar.");
            return;
        }
        console.log(`Iniciando edición para deuda: ${debtId}`);

        editDebtIdInput.value = debt.id;
        debtNameInput.value = debt.name;
        debtAmountInput.value = debt.initialAmount.toFixed(2);
        debtDueDateInput.value = debt.dueDate || ''; // Poner cadena vacía si es null

        debtFormTitle.textContent = 'Editar Deuda';
        submitButton.textContent = 'Guardar Cambios';
        cancelButton.classList.remove('hidden');

        debtForm.scrollIntoView({ behavior: 'smooth' });
        debtNameInput.focus();
    }

    /**
     * Restablece el formulario al modo "Añadir Nueva Deuda".
     */
    function resetDebtForm() {
        console.log("Reseteando formulario de deuda.");
        debtForm.reset();
        editDebtIdInput.value = '';
        debtFormTitle.textContent = 'Añadir Nueva Deuda';
        submitButton.textContent = 'Añadir Deuda';
        cancelButton.classList.add('hidden');
    }

    /**
     * Elimina una deuda después de confirmación y validación.
     * @param {string} debtId ID de la deuda a eliminar.
     */
    function deleteDebt(debtId) {
        const debt = getDebtById(debtId);
        if (!debt) {
            alert("No se encontró la deuda para eliminar.");
            return;
        }

        // --- Validación Crucial: Comprobar si hay PAGOS asociados ---
        const hasPayments = transactions.some(t => t.type === 'debt_payment' && t.debtId === debtId);

        if (hasPayments) {
            alert(`No se puede eliminar la deuda "${escapeHtml(debt.name)}" porque tiene pagos registrados.\n\nPara eliminarla, primero debes eliminar las transacciones de pago asociadas.`);
            return;
        }

        // --- Confirmación ---
        const remaining = calculateDebtRemaining(debtId);
        if (confirm(`¿Estás SEGURO de que quieres eliminar la deuda "${escapeHtml(debt.name)}"?\n\n${remaining > 0 ? `Monto Pendiente: ${formatCurrency(remaining)}` : 'Estado: Pagada'}\n\n¡Esta acción no se puede deshacer!`)) {
            debts = debts.filter(d => d.id !== debtId);

            try {
                saveData(); // Guardar el cambio
                console.log(`Deuda eliminada: ${debtId}`);
                renderDebtList(); // Actualizar lista
                resetDebtForm(); // Resetear por si se estaba editando
                alert(`Deuda "${escapeHtml(debt.name)}" eliminada.`);
            } catch (error) {
                console.error("Error al guardar datos tras eliminar deuda:", error);
                alert("Se produjo un error al guardar los cambios después de eliminar la deuda.");
                // Podríamos recargar datos aquí si falla el guardado
            }
        }
    }

}); // Fin del DOMContentLoaded

