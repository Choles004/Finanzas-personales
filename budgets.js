// budgets.js

document.addEventListener('DOMContentLoaded', () => {
    // Dependencias
    if (typeof budgets === 'undefined' || typeof transactions === 'undefined' || typeof formatCurrency === 'undefined' || typeof saveData === 'undefined') {
        console.error("Error: common.js o sus datos no parecen haberse cargado correctamente antes de budgets.js");
        alert("Error crítico al cargar la página de presupuestos. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const budgetForm = document.getElementById('budget-form');
    const budgetFormTitle = document.getElementById('budget-form-title');
    const budgetCategoryInput = document.getElementById('budget-category');
    const budgetAmountInput = document.getElementById('budget-amount');
    const categorySuggestionsDatalist = document.getElementById('category-suggestions-budget');
    const budgetListUl = document.getElementById('budget-list');
    const editBudgetIdInput = document.getElementById('edit-budget-id'); // Asumiendo que lo llamamos así
    const submitButton = document.getElementById('budget-submit-btn');
    const cancelButton = document.getElementById('cancel-edit-budget-btn');

    // --- Inicialización ---
    populateCategorySuggestionsForBudget(); // Llenar datalist
    renderBudgetList(); // Mostrar presupuestos actuales

    // --- Event Listeners ---

    // Envío del formulario (Añadir o Editar Presupuesto)
    budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const category = budgetCategoryInput.value.trim();
        const amount = parseFloat(budgetAmountInput.value);
        const editingId = editBudgetIdInput.value; // Usaremos la categoría como ID simple aquí

        // Validaciones
        if (!category) {
            alert("Por favor, introduce una categoría para el presupuesto.");
            budgetCategoryInput.focus();
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, introduce un monto mensual válido y positivo para el presupuesto.");
            budgetAmountInput.focus();
            return;
        }

        // Usar la categoría (en minúsculas) como identificador único del presupuesto
        const budgetId = category.toLowerCase();

        // Buscar si ya existe un presupuesto para esta categoría
        const existingBudgetIndex = budgets.findIndex(b => b.category.toLowerCase() === budgetId);

        if (editingId) {
             // --- Modo Edición ---
             // Asegurarse que estamos editando el correcto, aunque el ID debería coincidir
             if (editingId !== budgetId && existingBudgetIndex > -1 && budgets[existingBudgetIndex].category.toLowerCase() !== editingId) {
                  alert(`Estás intentando cambiar la categoría a "${category}", pero ya existe un presupuesto para esa categoría.`);
                  budgetCategoryInput.focus();
                  return;
             }
             // Si la categoría cambió y la nueva ya existe (y no es la que estamos editando)
             if (editingId !== budgetId && budgets.some(b=> b.category.toLowerCase() === budgetId)) {
                 alert(`Ya existe un presupuesto para la categoría "${category}". No se puede renombrar a una categoría existente.`);
                 budgetCategoryInput.focus();
                 return;
             }

             if (existingBudgetIndex > -1) {
                 // Actualizar monto y potencialmente categoría (si cambió)
                 budgets[existingBudgetIndex].category = category; // Actualizar nombre por si cambió capitalización
                 budgets[existingBudgetIndex].amount = amount;
                 console.log(`Presupuesto actualizado para categoría: ${category}`);
                 alert(`Presupuesto para "${category}" actualizado a ${formatCurrency(amount)}.`);
             } else {
                 // Esto no debería pasar si el editId viene de un presupuesto existente
                  console.error(`Error: No se encontró el presupuesto con ID (categoría) ${editingId} para editar.`);
                  alert("Error al actualizar el presupuesto. No se encontró.");
                  resetBudgetForm(); // Resetear por si acaso
                  return;
             }

        } else {
            // --- Modo Añadir ---
            if (existingBudgetIndex > -1) {
                alert(`Ya existe un presupuesto para la categoría "${category}". Puedes editarlo si deseas cambiar el monto.`);
                // Opcional: podríamos llamar a startEditingBudget(category) aquí
                budgetCategoryInput.focus();
                return;
            }

            const newBudget = {
                // id: budgetId, // Podríamos añadir un ID único si quisiéramos, pero la categoría funciona como key
                category: category, // Guardar con la capitalización original del usuario
                amount: amount
            };
            budgets.push(newBudget);
            console.log("Nuevo presupuesto añadido:", newBudget);
        }

        // --- Guardar y Actualizar UI ---
        try {
            saveData(); // Guardar cambios en el array budgets
            renderBudgetList(); // Actualizar la lista mostrada
            resetBudgetForm(); // Limpiar formulario
        } catch (error) {
            console.error("Error al guardar datos o renderizar lista de presupuestos:", error);
            alert("Se produjo un error al guardar los cambios del presupuesto.");
        }
    });

     // Cancelar Edición
    cancelButton.addEventListener('click', () => {
        resetBudgetForm();
    });

     // Delegación de eventos para botones Editar y Eliminar en la lista
    budgetListUl.addEventListener('click', (e) => {
        const target = e.target;
        const budgetCategory = target.dataset.category; // Usar data-category como ID

        if (!budgetCategory) return; // Salir si no se hizo clic en algo con data-category

        // Botón Editar
        if (target.classList.contains('edit-btn')) {
            startEditingBudget(budgetCategory);
        }
        // Botón Eliminar
        else if (target.classList.contains('delete-btn')) {
            deleteBudget(budgetCategory);
        }
    });


    // --- Funciones Específicas de la Página ---

    /**
     * Renderiza la lista de presupuestos con su progreso para el mes actual.
     */
    function renderBudgetList() {
        console.log("Renderizando lista de presupuestos...");
        budgetListUl.innerHTML = '';

        if (budgets.length === 0) {
            budgetListUl.innerHTML = '<li>No has definido ningún presupuesto mensual.</li>';
            return;
        }

        // Obtener fechas del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Ordenar presupuestos alfabéticamente por categoría
        const sortedBudgets = [...budgets].sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: 'base' }));

        sortedBudgets.forEach(budget => {
            // Calcular gasto actual en esta categoría para el mes corriente
            const currentSpending = calculateCategorySpending(budget.category, startOfMonth, startOfNextMonth); // De common.js

            const budgetAmount = budget.amount;
            const percentageSpent = budgetAmount > 0 ? Math.min((currentSpending / budgetAmount) * 100, 100) : 0; // No pasar de 100% visualmente
             const overBudget = currentSpending > budgetAmount;
             const percentageDisplay = budgetAmount > 0 ? ((currentSpending / budgetAmount) * 100).toFixed(0) : 0; // Porcentaje real para texto

            const li = document.createElement('li');
            li.classList.add('budget-item'); // Clase para estilo base
            if (overBudget) {
                li.classList.add('over-limit'); // Clase extra si se pasó
            }

            li.innerHTML = `
                <div class="item-info">
                    <strong>${escapeHtml(budget.category)}</strong>
                    <small>Presupuesto: ${formatCurrency(budgetAmount)} / Gastado: ${formatCurrency(currentSpending)}</small>
                    <div class="progress-bar-container" title="${percentageDisplay}% gastado ${overBudget ? '(¡Excedido!)' : ''}">
                        <div class="progress-bar ${overBudget ? 'over-budget' : ''} ${percentageSpent >= 100 ? 'full' : ''}"
                             style="width: ${percentageSpent.toFixed(2)}%;">
                             ${percentageDisplay}%
                        </div>
                    </div>
                     ${overBudget ? `<small style="color: var(--expense-color); font-weight: bold;">Excedido en: ${formatCurrency(currentSpending - budgetAmount)}</small>` : ''}
                     ${percentageSpent < 100 && !overBudget ? `<small>Restante: ${formatCurrency(budgetAmount - currentSpending)}</small>`: ''}
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-category="${escapeHtml(budget.category)}" title="Editar Presupuesto">Editar</button>
                    <button class="delete-btn" data-category="${escapeHtml(budget.category)}" title="Eliminar Presupuesto">X</button>
                </div>
            `;
            budgetListUl.appendChild(li);
        });
         console.log("Lista de presupuestos renderizada.");
    }

     /**
     * Prepara el formulario para editar un presupuesto existente.
     * @param {string} category La categoría (ID) del presupuesto a editar.
     */
    function startEditingBudget(category) {
        const budget = getBudgetByCategory(category); // De common.js
        if (!budget) {
            alert("No se encontró el presupuesto para editar.");
            return;
        }
        console.log(`Iniciando edición para presupuesto: ${category}`);

        // Usar la categoría como ID en el input oculto
        editBudgetIdInput.value = budget.category.toLowerCase();
        budgetCategoryInput.value = budget.category;
        budgetAmountInput.value = budget.amount.toFixed(2);

        budgetFormTitle.textContent = 'Editar Presupuesto';
        submitButton.textContent = 'Guardar Cambios';
        cancelButton.classList.remove('hidden');

        budgetForm.scrollIntoView({ behavior: 'smooth' });
        budgetCategoryInput.focus(); // Foco en la categoría (aunque usualmente se edita monto)
    }

     /**
     * Restablece el formulario al modo "Añadir Nuevo Presupuesto".
     */
    function resetBudgetForm() {
        console.log("Reseteando formulario de presupuesto.");
        budgetForm.reset();
        editBudgetIdInput.value = '';
        budgetFormTitle.textContent = 'Añadir Presupuesto Mensual';
        submitButton.textContent = 'Guardar Presupuesto';
        cancelButton.classList.add('hidden');
    }

     /**
     * Elimina un presupuesto después de confirmación.
     * @param {string} category La categoría (ID) del presupuesto a eliminar.
     */
    function deleteBudget(category) {
        const budget = getBudgetByCategory(category);
        if (!budget) {
            alert("No se encontró el presupuesto para eliminar.");
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar el presupuesto para la categoría "${escapeHtml(category)}"?\n\nMonto: ${formatCurrency(budget.amount)}`)) {
             // Filtrar el presupuesto del array global
            budgets = budgets.filter(b => b.category.toLowerCase() !== category.toLowerCase());

            try {
                saveData(); // Guardar el cambio
                console.log(`Presupuesto eliminado para categoría: ${category}`);
                renderBudgetList(); // Actualizar la lista
                resetBudgetForm(); // Resetear por si se estaba editando
                alert(`Presupuesto para "${escapeHtml(category)}" eliminado.`);
            } catch (error) {
                console.error("Error al guardar datos tras eliminar presupuesto:", error);
                alert("Se produjo un error al guardar los cambios después de eliminar el presupuesto.");
            }
        }
    }

    /** Popula el datalist con categorías de gastos existentes */
    function populateCategorySuggestionsForBudget() {
        const expenseCategories = getUniqueCategories('expense'); // De common.js
        categorySuggestionsDatalist.innerHTML = expenseCategories
            .map(cat => `<option value="${escapeHtml(cat)}"></option>`)
            .join('');
    }

}); // Fin del DOMContentLoaded

