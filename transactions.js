// transactions.js

document.addEventListener('DOMContentLoaded', () => {
    // Dependencias
    if (typeof transactions === 'undefined' || typeof formatCurrency === 'undefined') {
        console.error("Error: common.js o sus datos no parecen haberse cargado antes de transactions.js");
        alert("Error crítico al cargar el historial de transacciones. Revisa la consola.");
        return;
    }

    // --- Selección de Elementos DOM ---
    const searchInput = document.getElementById('search-input');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterMonthInput = document.getElementById('filter-month');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const tableBody = document.getElementById('transaction-list');
    const tableHeaders = document.querySelectorAll('#transaction-table th[data-sort]');
    // const paginationControls = document.getElementById('pagination-controls'); // Para futura paginación

    // --- Estado Local de la Página ---
    let currentSort = { column: 'date', direction: 'desc' }; // Ordenar por fecha descendente por defecto
    let currentFilters = {
        searchTerm: '',
        type: '',
        month: '' // Formato YYYY-MM
    };

    // --- Inicialización ---
    renderTransactionTable(); // Renderizar tabla inicial

    // --- Event Listeners ---

    // Búsqueda en tiempo real (o casi)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.searchTerm = searchInput.value.toLowerCase().trim();
            renderTransactionTable();
        }, 300); // Pequeño retraso para no buscar en cada tecla
    });

    // Filtro por tipo
    filterTypeSelect.addEventListener('change', () => {
        currentFilters.type = filterTypeSelect.value;
        renderTransactionTable();
    });

    // Filtro por mes
    filterMonthInput.addEventListener('change', () => {
        currentFilters.month = filterMonthInput.value; // Formato YYYY-MM
        renderTransactionTable();
    });

    // Limpiar filtros
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterTypeSelect.value = '';
        filterMonthInput.value = '';
        currentFilters = { searchTerm: '', type: '', month: '' };
        // Resetear ordenación también? Opcional
        // currentSort = { column: 'date', direction: 'desc' };
        renderTransactionTable();
    });

    // Ordenación de columnas
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (!column) return;

            if (currentSort.column === column) {
                // Cambiar dirección
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Nueva columna, dirección por defecto
                currentSort.column = column;
                // Ordenar numérico/fecha descendente por defecto, texto ascendente
                currentSort.direction = (column === 'date' || column === 'amount') ? 'desc' : 'asc';
            }
            renderTransactionTable(); // Volver a renderizar con nueva ordenación
        });
    });

    // Delegación de eventos para botones Eliminar y Editar en la tabla
    tableBody.addEventListener('click', (e) => {
        const target = e.target;

        // Botón Eliminar
        if (target.classList.contains('delete-btn') && target.dataset.id) {
            deleteTransactionConfirm(target.dataset.id);
        }
        // Botón Editar
        else if (target.classList.contains('edit-btn') && target.dataset.id) {
            // Redirigir a la página de edición con el ID como parámetro
            window.location.href = `add_edit_transaction.html?edit=${target.dataset.id}`;
        }
    });


    // --- Funciones Principales ---

    /**
     * Filtra, ordena y renderiza las transacciones en la tabla.
     */
    function renderTransactionTable() {
        console.log("Renderizando tabla de transacciones con filtros:", currentFilters, "y orden:", currentSort);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>'; // Indicador de carga

        // 1. Filtrar Transacciones
        let filtered = filterTransactions();

        // 2. Ordenar Transacciones
        sortTransactions(filtered);

        // 3. Renderizar Filas
        tableBody.innerHTML = ''; // Limpiar tabla (después de filtrar/ordenar)
        if (filtered.length === 0) {
            const message = (currentFilters.searchTerm || currentFilters.type || currentFilters.month)
                ? 'No hay transacciones que coincidan con los filtros.'
                : 'No hay transacciones registradas.';
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">${message}</td></tr>`;
        } else {
            filtered.forEach(t => {
                tableBody.appendChild(createTransactionRow(t));
            });
        }

        // 4. Actualizar indicadores de ordenación en cabeceras
        updateSortIndicators();
        console.log(`${filtered.length} transacciones renderizadas.`);
    }

    /**
     * Aplica los filtros actuales al array global de transacciones.
     * @returns {Array} Array de transacciones filtradas.
     */
    function filterTransactions() {
        return transactions.filter(t => {
            // Filtro por término de búsqueda (en descripción, categoría, cuentas, deuda)
            const searchTermMatch = !currentFilters.searchTerm || (
                (t.description && t.description.toLowerCase().includes(currentFilters.searchTerm)) ||
                (t.category && t.category.toLowerCase().includes(currentFilters.searchTerm)) ||
                (t.accountId && getAccountNameById(t.accountId).toLowerCase().includes(currentFilters.searchTerm)) ||
                (t.fromAccountId && getAccountNameById(t.fromAccountId).toLowerCase().includes(currentFilters.searchTerm)) ||
                (t.toAccountId && getAccountNameById(t.toAccountId).toLowerCase().includes(currentFilters.searchTerm)) ||
                (t.debtId && getDebtNameById(t.debtId).toLowerCase().includes(currentFilters.searchTerm))
            );

            // Filtro por tipo
            const typeMatch = !currentFilters.type || t.type === currentFilters.type;

            // Filtro por mes (YYYY-MM)
            const monthMatch = !currentFilters.month || (
                t.date && t.date.startsWith(currentFilters.month)
            );

            return searchTermMatch && typeMatch && monthMatch;
        });
    }

    /**
     * Ordena un array de transacciones IN PLACE según `currentSort`.
     * @param {Array} transactionsToSort El array de transacciones a ordenar.
     */
    function sortTransactions(transactionsToSort) {
        transactionsToSort.sort((a, b) => {
            let valA, valB;

            // Obtener valores a comparar
            switch (currentSort.column) {
                case 'date':
                    // Usar dateObj para comparación precisa
                    valA = a.dateObj || new Date(0); // Fecha mínima si es inválida
                    valB = b.dateObj || new Date(0);
                    break;
                case 'amount':
                    valA = typeof a.amount === 'number' ? a.amount : 0;
                    valB = typeof b.amount === 'number' ? b.amount : 0;
                    break;
                case 'description':
                    valA = a.description?.toLowerCase() || '';
                    valB = b.description?.toLowerCase() || '';
                    break;
                case 'category':
                    valA = a.category?.toLowerCase() || '';
                    valB = b.category?.toLowerCase() || '';
                    break;
                case 'type':
                     // Ordenar por nombre traducido del tipo
                     valA = getTransactionTypeName(a.type)?.toLowerCase() || '';
                     valB = getTransactionTypeName(b.type)?.toLowerCase() || '';
                     break;
                default: // No ordenar si la columna no es válida
                    return 0;
            }

            // Comparación
            let comparison = 0;
            if (valA < valB) {
                comparison = -1;
            } else if (valA > valB) {
                comparison = 1;
            }

            // Aplicar dirección
            return currentSort.direction === 'desc' ? (comparison * -1) : comparison;
        });
    }

    /**
     * Crea un elemento TR (fila de tabla) para una transacción.
     * @param {object} t La transacción.
     * @returns {HTMLTableRowElement} El elemento TR creado.
     */
    function createTransactionRow(t) {
        const row = document.createElement('tr');
        const typeClass = `type-${t.type}`;
        const typeText = getTransactionTypeName(t.type); // De common.js

        // Construir detalles (descripción + enlaces cuenta/deuda)
        let detailsHtml = `<span class="transaction-details">${escapeHtml(t.description)}</span>`;
        if (t.type === 'income' || t.type === 'expense' || t.type === 'debt_payment') {
            detailsHtml += `<span class="account-link">Cuenta: ${escapeHtml(getAccountNameById(t.accountId))}</span>`;
            if (t.type === 'debt_payment') {
                detailsHtml += `<span class="account-link">Deuda: ${escapeHtml(getDebtNameById(t.debtId))}</span>`;
            }
        } else if (t.type === 'transfer') {
            detailsHtml += `<span class="account-link">De: ${escapeHtml(getAccountNameById(t.fromAccountId))}</span>`;
            detailsHtml += `<span class="account-link">A: ${escapeHtml(getAccountNameById(t.toAccountId))}</span>`;
        }

        // Formatear fecha desde dateObj para consistencia local
        const formattedDate = t.dateObj instanceof Date && !isNaN(t.dateObj)
             ? t.dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
             : t.date; // Fallback a la cadena original

        row.innerHTML = `
            <td class="${typeClass}">${typeText}</td>
            <td>${detailsHtml}</td>
            <td class="${typeClass} text-right">${formatCurrency(t.amount)}</td>
            <td>${t.category ? escapeHtml(t.category) : (t.type === 'transfer' ? '-' : 'N/A')}</td>
            <td class="text-center">${formattedDate}</td>
            <td>
                <button class="edit-btn" data-id="${t.id}" title="Editar Transacción">Editar</button>
                <button class="delete-btn" data-id="${t.id}" title="Eliminar Transacción">X</button>
            </td>
        `;
        return row;
    }

    /**
     * Actualiza los indicadores visuales (▲/▼) en las cabeceras de la tabla.
     */
    function updateSortIndicators() {
        tableHeaders.forEach(th => {
            const column = th.dataset.sort;
            const icon = th.querySelector('.sort-icon');
            if (!icon) return; // Si algún th no tiene icono

            th.classList.remove('sort-asc', 'sort-desc');
            icon.textContent = ''; // Limpiar icono

            if (column === currentSort.column) {
                th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
                // icon.textContent = currentSort.direction === 'asc' ? '▲' : '▼'; // El CSS lo hace con ::after
            }
        });
    }

    /**
     * Pide confirmación y elimina una transacción.
     * @param {string} transactionId ID de la transacción a eliminar.
     */
    function deleteTransactionConfirm(transactionId) {
        const transaction = getTransactionById(transactionId); // de common.js
        if (!transaction) {
            alert("Error: No se encontró la transacción para eliminar.");
            return;
        }

        if (confirm(`¿Estás seguro de eliminar esta transacción?\n\nTipo: ${getTransactionTypeName(transaction.type)}\nDescripción: ${transaction.description}\nMonto: ${formatCurrency(transaction.amount)}\nFecha: ${transaction.date}`)) {
            // Filtrar la transacción del array global
            transactions = transactions.filter(t => t.id !== transactionId);

            try {
                saveData(); // Guardar el cambio
                console.log(`Transacción eliminada: ${transactionId}`);
                renderTransactionTable(); // Volver a renderizar la tabla actualizada
                alert("Transacción eliminada correctamente.");
                // Opcional: Actualizar resumen si estuviera visible en esta página
            } catch (error) {
                console.error("Error al guardar datos tras eliminar transacción:", error);
                alert("Se produjo un error al guardar los cambios después de eliminar.");
                // Recargar datos podría ser una opción si falla
            }
        }
    }

}); // Fin del DOMContentLoaded

