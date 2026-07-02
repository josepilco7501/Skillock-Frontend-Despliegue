// ========================================
// CONFIGURACIÓN GLOBAL
// ========================================
const API_URL = 'https://skillock-despliegue.onrender.com/api';
let token = null;
let currentUsername = null;
let currentUserId = null;
let gameAccounts = [];

// ========================================
// FUNCIONES AUXILIARES - API
// ========================================

/**
 * Realiza una petición a la API
 * @param {string} endpoint - Ruta del endpoint
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {object} body - Cuerpo de la petición (para POST, PUT)
 * @returns {Promise} - Respuesta JSON de la API
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    // Agregar token si existe
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Agregar body si existe
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);

        // Si respuesta es 401, limpiar sesión y redirigir a login
        if (response.status === 401) {
            showAuthView();
            token = null;
            currentUsername = null;
            currentUserId = null;
            return null;
        }

        // Si respuesta no es OK, lanzar error
        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const errorData = contentType.includes('application/json')
                ? await response.json().catch(() => ({}))
                : await response.text().catch(() => '');

            const error = new Error('API request failed');
            error.status = response.status;
            error.data = errorData;
            error.messageFromBackend = typeof errorData === 'string'
                ? errorData
                : (errorData?.errorMessage || errorData?.message || errorData?.title || '');
            throw error;
        }

        // Si es 204 (No Content), retornar true
        if (response.status === 204) {
            return true;
        }

        // Retornar datos JSON
        return await response.json();
    } catch (error) {
        console.error('Error en API Request:', error);
        return null;
    }
}

// ========================================
// FUNCIONES AUXILIARES - UI
// ========================================

/**
 * Muestra una vista y oculta las demás
 * @param {string} viewName - Nombre de la vista (sin "#" ni "View")
 */
function showView(viewName) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Mostrar vista específica
    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Actualizar navegación
    if (viewName !== 'auth') {
        updateNavbarActiveLink(viewName);
    }
}

/**
 * Actualiza el enlace activo en la navegación
 * @param {string} viewName - Nombre de la vista
 */
function updateNavbarActiveLink(viewName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.nav-link[data-view="${viewName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Muestra un mensaje de error
 * @param {string} elementId - ID del elemento donde mostrar el error
 * @param {string} message - Mensaje de error
 */
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');

        // Limpiar después de 3 segundos
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 3000);
    }
}

/**
 * Muestra un mensaje de éxito
 * @param {string} elementId - ID del elemento donde mostrar el éxito
 * @param {string} message - Mensaje de éxito
 */
function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.add('show');

        // Limpiar después de 3 segundos
        setTimeout(() => {
            successElement.classList.remove('show');
        }, 3000);
    }
}

/**
 * Abre un modal
 * @param {string} modalId - ID del modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Cierra un modal
 * @param {string} modalId - ID del modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ========================================
// FUNCIONES AUXILIARES - FORMATEO
// ========================================

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Retorna el nombre del juego según su enum
 * @param {number} gameEnum - Valor del enum
 * @returns {string} - Nombre del juego
 */
function getGameName(gameEnum) {
    const games = {
        0: 'Dota 2',
        1: 'CS2',
        2: 'Valorant'
    };
    return games[gameEnum] || 'Desconocido';
}

/**
 * Retorna la imagen del juego
 * @param {number} gameEnum - Valor del enum
 * @returns {string} - Ruta de la imagen
 */
function getGameImage(gameEnum) {
    const images = {
        0: './dota.png',
        1: './cs2.png',
        2: './valorant.png'
    };
    return images[gameEnum] || './logo.png';
}

/**
 * Retorna el nombre del estado de la apuesta
 * @param {number} statusEnum - Valor del enum
 * @returns {string} - Nombre del estado
 */
function getBetStatusName(statusEnum) {
    const statuses = {
        0: 'Draft',
        1: 'Negociando',
        2: 'Acordado',
        3: 'Fondeando',
        4: 'Activo',
        5: 'Completado',
        6: 'Cancelado',
        7: 'Disputado'
    };
    return statuses[statusEnum] || 'Desconocido';
}

/**
 * Retorna la clase CSS para el estado de una apuesta
 * @param {number} statusEnum - Valor del enum
 * @returns {string} - Clase CSS
 */
function getBetStatusClass(statusEnum) {
    const classes = {
        0: 'status-draft',
        1: 'status-negotiating',
        2: 'status-agreed',
        3: 'status-funding',
        4: 'status-active',
        5: 'status-completed',
        6: 'status-cancelled',
        7: 'status-disputed'
    };
    return classes[statusEnum] || '';
}

/**
 * Formatea una fecha
 * @param {string} dateString - Fecha en string
 * @returns {string} - Fecha formateada
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// ========================================
// VISTA 1: LOGIN/REGISTRO
// ========================================

/**
 * Muestra la vista de autenticación
 */
function showAuthView() {
    showView('auth');
}

/**
 * Inicializa los eventos de la vista de autenticación
 */
function initAuthView() {
    // Tabs de login/registro
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            
            // Actualizar botones
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Actualizar contenido
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

    // Formulario de login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await apiRequest('/auth/acceso', 'POST', {
                email,
                password
            });

            if (response) {
                // Guardar token y datos de usuario
                token = response.token;
                currentUsername = response.username;
                // Parsear el ID del usuario desde el JWT
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserId = payload.sub;

                // Limpiar formulario
                document.getElementById('loginForm').reset();

                // Ir al dashboard
                showDashboardView();
            }
        } catch (error) {
            showError('loginError', error.messageFromBackend || 'Credenciales inválidas');
        }
    });

    // Formulario de registro
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await apiRequest('/auth/registro', 'POST', {
                username,
                email,
                password
            });

            if (response) {
                // Mostrar mensaje de éxito
                showSuccess('registerError', 'Cuenta creada exitosamente. Iniciando sesión...');

                // Guardar token y datos
                token = response.token;
                currentUsername = response.username;
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserId = payload.sub;

                // Limpiar formulario
                document.getElementById('registerForm').reset();

                // Ir al dashboard después de 1 segundo
                setTimeout(() => {
                    showDashboardView();
                }, 1000);
            }
        } catch (error) {
            if (error.status === 409) {
                showError('registerError', error.messageFromBackend || 'El usuario o email ya existe');
            } else {
                showError('registerError', error.messageFromBackend || 'Error al crear la cuenta');
            }
        }
    });
}

// ========================================
// VISTA 2: DASHBOARD
// ========================================

/**
 * Muestra la vista del dashboard
 */
async function showDashboardView() {
    showView('dashboard');
    await loadDashboardData();
}

/**
 * Carga los datos necesarios para el dashboard
 */
async function loadDashboardData() {
    try {
        // Actualizar nombre de usuario
        document.getElementById('currentUsername').textContent = currentUsername;

        // Obtener datos de wallet
        const wallet = await apiRequest('/wallet');
        if (wallet) {
            const availableFormatted = formatCurrency(wallet.saldoDisponible);
            const retainedFormatted = formatCurrency(wallet.saldoRetenido);

            document.getElementById('walletBalance').textContent = `💚 ${availableFormatted}`;
            document.getElementById('availableBalance').textContent = availableFormatted;
            document.getElementById('retainedBalance').textContent = retainedFormatted;
        }

        // Obtener cuentas de juego
        gameAccounts = await apiRequest('/game-accounts');
        loadGameAccounts();

        // Obtener apuestas recientes (primeras 5)
        const betsResponse = await apiRequest('/bets?pagina=1&tamano=5');
        if (betsResponse) {
            loadRecentBets(betsResponse.items);

            // Contar apuestas activas
            document.getElementById('activeBetsCount').textContent = betsResponse.items.filter(bet => bet.status === 4).length;
        }
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    }
}

/**
 * Carga las cuentas de juego en el dashboard
 */
function loadGameAccounts() {
    const container = document.getElementById('gameAccountsList');
    container.innerHTML = '';

    if (gameAccounts.length === 0) {
        container.innerHTML = '<div class="account-card empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p style="color: var(--text-secondary);">No tienes cuentas vinculadas</p></div>';
        return;
    }

    gameAccounts.forEach(account => {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <img src="${getGameImage(account.game)}" alt="${getGameName(account.game)}" class="account-image">
            <div class="account-tag">${account.gamePlayerTag}</div>
        `;
        container.appendChild(card);
    });
}

/**
 * Carga las apuestas recientes en la tabla
 * @param {array} bets - Array de apuestas
 */
function loadRecentBets(bets) {
    const tbody = document.querySelector('#recentBetsTable tbody');
    tbody.innerHTML = '';

    bets.forEach(bet => {
        const row = tbody.insertRow();
        const monto = bet.agreedAmountPerTeam ? formatCurrency(bet.agreedAmountPerTeam) : '-';
        const premio = bet.premioNeto ? formatCurrency(bet.premioNeto) : '-';
        const statusClass = getBetStatusClass(bet.status);
        const statusName = getBetStatusName(bet.status);

        row.innerHTML = `
            <td>${getGameName(bet.game)}</td>
            <td>${bet.teamB?.members?.[0]?.username || 'N/A'}</td>
            <td>${monto}</td>
            <td>${premio}</td>
            <td><span class="status-badge ${statusClass}">${statusName}</span></td>
            <td>${formatDate(bet.createdAt)}</td>
            <td>
                ${bet.matchId ? `<button class="btn-join-bet" data-bet-code="${bet.matchId}">Unirse</button>` : ''}
                <button class="btn-details" data-bet-id="${bet.id}">Ver</button>
            </td>
        `;
    });

    // Agregar eventos a botones Ver (cargar por id; el código se mostrará dentro)
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const betId = e.target.getAttribute('data-bet-id');
            viewBetDetails(betId);
        });
    });

    document.querySelectorAll('.btn-join-bet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const betCode = e.target.getAttribute('data-bet-code');
            joinBetByCode(betCode);
        });
    });
}

/**
 * Inicializa los eventos del dashboard
 */
function initDashboardView() {
    // Botón vincular cuenta de juego
    document.getElementById('linkGameAccountBtn').addEventListener('click', () => {
        openModal('linkGameAccountModal');
    });

    // Formulario visible para unirse a apuesta por código
    const joinBetForm = document.getElementById('joinBetForm');
    if (joinBetForm) {
        joinBetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const betCode = document.getElementById('joinBetCode').value.trim();
            const teamSizeB = parseInt(document.getElementById('joinBetTeamSize').value);

            if (!betCode || betCode.length !== 4) {
                showError('joinBetError', 'Ingresa un código válido de 4 dígitos');
                return;
            }

            if (![1, 3, 5].includes(teamSizeB)) {
                showError('joinBetError', 'Selecciona un tamaño de equipo válido');
                return;
            }

            try {
                const response = await apiRequest(`/bets/${betCode}/rival`, 'POST', { teamSizeB });
                if (response) {
                    showSuccess('joinBetError', 'Te uniste a la apuesta correctamente');
                    joinBetForm.reset();
                    await showNegotiationView(response.id);
                }
            } catch (error) {
                    showError('joinBetError', error.messageFromBackend || 'No se pudo unir a la apuesta');
            }
        });
    }

    // Botón nueva apuesta (dashboard)
    document.getElementById('newBetBtn').addEventListener('click', () => {
        loadGameAccountsForSelect('betGameAccount');
        openModal('newBetModal');
    });

    // Logout (dashboard)
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.getAttribute('data-view');
            if (viewName === 'dashboard') showDashboardView();
            else if (viewName === 'bets') showBetsView();
            else if (viewName === 'wallet') showWalletView();
        });
    });
}

// ========================================
// VISTA 3: MIS APUESTAS
// ========================================

/**
 * Muestra la vista de apuestas
 */
async function showBetsView() {
    showView('bets');
    await loadBetsViewData();
}

/**
 * Carga los datos para la vista de apuestas
 */
async function loadBetsViewData() {
    try {
        // Actualizar nombre de usuario
        document.getElementById('currentUsername2').textContent = currentUsername;

        // Obtener wallet
        const wallet = await apiRequest('/wallet');
        if (wallet) {
            document.getElementById('walletBalance2').textContent = `💚 ${formatCurrency(wallet.saldoDisponible)}`;
        }

        // Cargar todas las apuestas (pagina 1)
        loadAllBets(1);
    } catch (error) {
        console.error('Error cargando vista de apuestas:', error);
    }
}

/**
 * Carga todas las apuestas con paginación
 * @param {number} page - Número de página
 */
async function loadAllBets(page = 1) {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        const endpoint = `/bets?pagina=${page}&tamano=20`;

        const response = await apiRequest(endpoint);
        if (response) {
            // Filtrar por estado si está seleccionado
            let bets = response.items;
            if (statusFilter) {
                const statusValue = Number(statusFilter);
                bets = bets.filter(bet => bet.status === statusValue);
            }

            // Cargar tabla
            loadBetsTable(bets);

            // Cargar paginación
            loadPagination(response.pagina, response.totalPaginas, page);
        }
    } catch (error) {
        console.error('Error cargando apuestas:', error);
    }
}

/**
 * Carga las apuestas en la tabla de vista completa
 * @param {array} bets - Array de apuestas
 */
function loadBetsTable(bets) {
    const tbody = document.querySelector('#allBetsTable tbody');
    tbody.innerHTML = '';

    bets.forEach(bet => {
        const row = tbody.insertRow();
        const monto = bet.agreedAmountPerTeam ? formatCurrency(bet.agreedAmountPerTeam) : '-';
        const premio = bet.premioNeto ? formatCurrency(bet.premioNeto) : '-';
        const statusClass = getBetStatusClass(bet.status);
        const statusName = getBetStatusName(bet.status);

        row.innerHTML = `
            <td>${getGameName(bet.game)}</td>
            <td>${bet.rivalLiderUsername || 'N/A'}</td>
            <td>${monto}</td>
            <td>${premio}</td>
            <td><span class="status-badge ${statusClass}">${statusName}</span></td>
            <td>${formatDate(bet.createdAt)}</td>
            <td>
                ${bet.matchId ? `<button class="btn-join-bet" data-bet-code="${bet.matchId}">Unirse</button>` : ''}
                <button class="btn-details" data-bet-id="${bet.id}">Ver</button>
            </td>
        `;
    });

    // Agregar eventos a botones Ver (cargar por id; el código se mostrará dentro)
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const betId = e.target.getAttribute('data-bet-id');
            viewBetDetails(betId);
        });
    });

    document.querySelectorAll('.btn-join-bet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const betCode = e.target.getAttribute('data-bet-code');
            joinBetByCode(betCode);
        });
    });
}

/**
 * Une al jugador a una apuesta usando el código público (matchId).
 * @param {string} betCode - Código de la apuesta
 */
async function joinBetByCode(betCode) {
    try {
        const result = await apiRequest(`/bets/${betCode}/rival`, 'POST', {
            teamSizeB: 1
        });

        if (result) {
            showSuccess('loginError', 'Te uniste a la apuesta correctamente');
            await showNegotiationView(result.id);
        }
    } catch (error) {
        console.error('Error al unirse a la apuesta:', error);
        showError('loginError', error.messageFromBackend || 'No se pudo unir a la apuesta');
    }
}

/**
 * Carga la paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 * @param {number} page - Página a cargar
 */
function loadPagination(currentPage, totalPages, page) {
    const container = document.getElementById('paginationContainer');
    container.innerHTML = '';

    // Botón anterior
    if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Anterior';
        prevBtn.addEventListener('click', () => loadAllBets(page - 1));
        container.appendChild(prevBtn);
    }

    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === page) {
            pageBtn.classList.add('active');
        }
        pageBtn.addEventListener('click', () => loadAllBets(i));
        container.appendChild(pageBtn);
    }

    // Botón siguiente
    if (page < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Siguiente →';
        nextBtn.addEventListener('click', () => loadAllBets(page + 1));
        container.appendChild(nextBtn);
    }
}

/**
 * Ver detalles de una apuesta (abre la vista de negociación)
 * @param {string} betId - Identificador GUID de la apuesta
 */
async function viewBetDetails(betId) {
    try {
        await showNegotiationView(betId);
    } catch (error) {
        console.error('Error abriendo negociación:', error);
        showError('counterMontoError', error.messageFromBackend || 'Error al abrir la apuesta');
    }
}

/**
 * Inicializa los eventos de la vista de apuestas
 */
function initBetsView() {
    // Botón nueva apuesta
    document.getElementById('newBetBtn2').addEventListener('click', () => {
        loadGameAccountsForSelect('betGameAccount');
        openModal('newBetModal');
    });

    // Filtro de estado
    document.getElementById('statusFilter').addEventListener('change', () => {
        loadAllBets(1);
    });

    // Logout
    document.getElementById('logoutBtn2').addEventListener('click', logout);

    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.getAttribute('data-view');
            if (viewName === 'dashboard') showDashboardView();
            else if (viewName === 'bets') showBetsView();
            else if (viewName === 'wallet') showWalletView();
        });
    });
}

// ========================================
// VISTA 4: WALLET
// ========================================

/**
 * Muestra la vista de wallet
 */
async function showWalletView() {
    showView('wallet');
    await loadWalletViewData();
}

/**
 * Carga los datos para la vista de wallet
 */
async function loadWalletViewData() {
    try {
        // Actualizar nombre de usuario
        document.getElementById('currentUsername3').textContent = currentUsername;

        // Obtener datos de wallet
        const wallet = await apiRequest('/wallet');
        if (wallet) {
            const available = formatCurrency(wallet.saldoDisponible);
            const retained = formatCurrency(wallet.saldoRetenido);

            document.getElementById('walletBalance3').textContent = `💚 ${available}`;
            document.getElementById('walletAvailable').textContent = available;
            document.getElementById('walletRetained').textContent = retained;
        }
    } catch (error) {
        console.error('Error cargando wallet:', error);
    }
}

/**
 * Inicializa los eventos de la vista de wallet
 */
function initWalletView() {
    // Formulario de depósito
    document.getElementById('depositForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('depositAmount').value);

        try {
            const response = await apiRequest('/wallet/deposito', 'POST', {
                monto: amount
            });

            if (response) {
                showSuccess('depositSuccess', 'Depósito realizado exitosamente');
                document.getElementById('depositForm').reset();
                loadWalletViewData();
            }
        } catch (error) {
            showError('depositError', error.messageFromBackend || 'Error al realizar el depósito');
        }
    });

    // Formulario de retiro
    document.getElementById('withdrawalForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('withdrawalAmount').value);

        try {
            const response = await apiRequest('/wallet/retiro', 'POST', {
                monto: amount
            });

            if (response) {
                showSuccess('withdrawalSuccess', 'Retiro realizado exitosamente');
                document.getElementById('withdrawalForm').reset();
                loadWalletViewData();
            }
        } catch (error) {
            if (error.status === 422) {
                showError('withdrawalError', error.messageFromBackend || 'Saldo insuficiente');
            } else {
                showError('withdrawalError', error.messageFromBackend || 'Error al realizar el retiro');
            }
        }
    });

    // Logout
    document.getElementById('logoutBtn3').addEventListener('click', logout);

    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.getAttribute('data-view');
            if (viewName === 'dashboard') showDashboardView();
            else if (viewName === 'bets') showBetsView();
            else if (viewName === 'wallet') showWalletView();
        });
    });
}

// ========================================
// MODALES
// ========================================

/**
 * Inicializa los eventos de los modales
 */
function initModals() {
    // Cerrar modales al hacer click en X
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                const modalId = modal.getAttribute('id');
                closeModal(modalId);
            }
        });
    });

    // Cerrar modales al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

/**
 * Carga las cuentas de juego en el select
 * @param {string} selectId - ID del select
 */
async function loadGameAccountsForSelect(selectId) {
    try {
        const accounts = await apiRequest('/game-accounts');
        const select = document.getElementById(selectId);
        
        // Limpiar opciones actuales (excepto la primera)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Agregar cuentas
        if (accounts && accounts.length > 0) {
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${getGameName(account.game)} - ${account.gamePlayerTag}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando cuentas de juego:', error);
    }
}

/**
 * Inicializa el modal de vincular cuenta de juego
 */
function initLinkGameAccountModal() {
    document.getElementById('linkGameAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const game = parseInt(document.getElementById('gameSelect').value);
        const gamePlayerId = document.getElementById('gamePlayerId').value;
        const gamePlayerTag = document.getElementById('gamePlayerTag').value;

        try {
            const response = await apiRequest('/game-accounts', 'POST', {
                game,
                gamePlayerId,
                gamePlayerTag
            });

            if (response) {
                showSuccess('linkGameAccountError', 'Cuenta vinculada exitosamente');
                document.getElementById('linkGameAccountForm').reset();
                closeModal('linkGameAccountModal');

                // Recargar cuentas de juego
                gameAccounts = await apiRequest('/game-accounts');
                loadGameAccounts();
            }
        } catch (error) {
            if (error.status === 409) {
                showError('linkGameAccountError', error.messageFromBackend || 'La cuenta ya existe');
            } else {
                showError('linkGameAccountError', error.messageFromBackend || 'Error al vincular la cuenta');
            }
        }
    });
}

/**
 * Inicializa el modal de nueva apuesta
 */
function generateMatchCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Inicializa el modal de nueva apuesta
 */
function initNewBetModal() {
    document.getElementById('newBetForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const game = parseInt(document.getElementById('betGame').value);
        const teamSizeA = parseInt(document.getElementById('teamSizeA').value);
        const gameAccountId = document.getElementById('betGameAccount').value;
        const montoInicial = parseFloat(document.getElementById('montoInicial').value);
        const matchId = generateMatchCode();
        const matchStartedAtISO = new Date().toISOString();

        try {
            const response = await apiRequest('/bets', 'POST', {
                game,
                teamSizeA,
                gameAccountId,
                matchId,
                montoInicial,
                matchStartedAt: matchStartedAtISO
            });

            if (response) {
                showSuccess('newBetError', 'Apuesta creada exitosamente');
                document.getElementById('newBetForm').reset();
                closeModal('newBetModal');

                // Abrir vista de negociación con la apuesta creada (cargar por id; mostrar matchId dentro de la vista)
                setTimeout(() => {
                    showNegotiationView(response.id);
                }, 500);
            }
        } catch (error) {
            showError('newBetError', error.messageFromBackend || 'Error al crear la apuesta');
        }
    });
}

// ========================================
// VISTA 5: NEGOCIACIÓN DE APUESTA
// ========================================

let currentBetNegotiation = null;
let proposalHistory = [];

/**
 * Retorna el código público de la apuesta de negociación.
 * El backend de negociación usa `matchId`, no el GUID.
 */
function getNegotiationBetCode() {
    return currentBetNegotiation?.matchId || currentBetNegotiation?.id;
}

/**
 * Muestra la vista de negociación para una apuesta
 */
async function showNegotiationView(betCode) {
    showView('negotiation');
    await loadNegotiationData(betCode);
}

function showNegotiationMessage(type, message) {
    const el = document.getElementById('negotiationMessage');
    if (!el) return;

    el.className = type === 'success'
        ? 'success-message negotiation-message show'
        : 'error-message negotiation-message show';
    el.textContent = message;
}

/**
 * Carga los datos de la apuesta para negociación
 */
async function loadNegotiationData(betCode) {
    try {
        const bet = await apiRequest(`/bets/${betCode}`);
        if (!bet) {
            showError('counterMontoError', 'No se encontró la apuesta');
            return;
        }

        currentBetNegotiation = bet;
        proposalHistory = [];

        // Llenar datos generales (mostrar siempre el matchId / código de apuesta)
        const displayCode = bet.matchId || betCode || bet.id;
        document.getElementById('negotiationCode').textContent = `Código: ${displayCode}`;
        document.getElementById('negotiationGame').textContent = getGameName(bet.game);
        document.getElementById('negotiationTeamSize').textContent = `${bet.teamSizeA}v${bet.teamSizeB || '-'}`;
        document.getElementById('negotiationStatus').textContent = getBetStatusName(bet.status);

        // Determinar cuál es mi equipo
        const myTeamLider = bet.teamA?.liderUserId === currentUserId;
        const myTeam = myTeamLider ? bet.teamA : bet.teamB;
        const rivalTeam = myTeamLider ? bet.teamB : bet.teamA;

        // Mostrar propuestas
        const monto = bet.agreedAmountPerTeam || bet.montoInicial || '-';
        document.getElementById('myTeamProposal').textContent = `$${typeof monto === 'number' ? monto.toFixed(2) : monto}`;
        document.getElementById('rivalTeamProposal').textContent = `$${typeof monto === 'number' ? monto.toFixed(2) : monto}`;

        // Mostrar aceptación
        const myAccepted = myTeam?.liderAcepto ? '✓ Aceptado' : '⏳ Pendiente';
        const rivalAccepted = rivalTeam?.liderAcepto ? '✓ Aceptado' : '⏳ Pendiente';

        document.getElementById('myTeamAccepted').textContent = myAccepted;
        document.getElementById('myTeamAccepted').className = `acceptance-status ${myTeam?.liderAcepto ? 'accepted' : 'pending'}`;

        document.getElementById('rivalTeamAccepted').textContent = rivalAccepted;
        document.getElementById('rivalTeamAccepted').className = `acceptance-status ${rivalTeam?.liderAcepto ? 'accepted' : 'pending'}`;

        // Limpiar input de contra-propuesta
        document.getElementById('counterMontoInput').value = '';

        // Agregar a historial simulado
        if (monto !== '-') {
            proposalHistory.push({
                team: 'rival',
                monto: monto,
                timestamp: new Date().toLocaleString('es-ES')
            });
            updateProposalHistory();
        }
    } catch (error) {
        console.error('Error cargando datos de negociación:', error);
        showError('counterMontoError', error.messageFromBackend || 'Error al cargar la apuesta');
    }
}

/**
 * Actualiza el historial de propuestas
 */
function updateProposalHistory() {
    const container = document.getElementById('proposalHistory');
    if (proposalHistory.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Aún no hay propuestas</p>';
        return;
    }

    container.innerHTML = proposalHistory.map(item => `
        <div class="history-item ${item.team === 'rival' ? 'rival' : ''}">
            <strong>${item.team === 'rival' ? 'Rival' : 'Tú'}:</strong> $${typeof item.monto === 'number' ? item.monto.toFixed(2) : item.monto} 
            <span style="color: var(--text-secondary); font-size: 11px; margin-left: 10px;">${item.timestamp}</span>
        </div>
    `).join('');
}

/**
 * Inicializa los eventos de la vista de negociación
 */
function initNegotiationView() {
    // Botón volver
    document.getElementById('backToBetsBtn').addEventListener('click', () => {
        showBetsView();
    });

    // Botón copiar código de apuesta
    const copyBtn = document.getElementById('copyNegotiationCodeBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const code = currentBetNegotiation?.matchId || (document.getElementById('negotiationCode')?.textContent || '').replace('Código:', '').trim();
            if (!code) {
                showNegotiationMessage('error', 'No hay código para copiar');
                return;
            }

            try {
                await navigator.clipboard.writeText(code);
                showNegotiationMessage('success', 'Código copiado al portapapeles');
            } catch (err) {
                console.error('Error copiando al portapapeles:', err);
                showNegotiationMessage('error', err.messageFromBackend || 'No se pudo copiar el código');
            }
        });
    }

    // Botón aceptar/confirmar monto
    const confirmMonto = async () => {
        if (!currentBetNegotiation) return;
        try {
            const betCode = getNegotiationBetCode();
            const result = await apiRequest(`/bets/${betCode}/monto/confirmacion`, 'PUT', {});
            if (result) {
                showNegotiationMessage('success', 'Monto confirmado exitosamente');
                setTimeout(() => loadNegotiationData(currentBetNegotiation.id), 500);
            }
        } catch (error) {
            showNegotiationMessage('error', error.messageFromBackend || 'Error al confirmar el monto');
        }
    };

    document.getElementById('acceptMontoBtn').addEventListener('click', confirmMonto);


    // Botón contra-proponer monto
    document.getElementById('counterMontoBtn').addEventListener('click', async () => {
        const monto = parseFloat(document.getElementById('counterMontoInput').value);
        if (!monto || monto <= 0) {
            showNegotiationMessage('error', 'Ingresa un monto válido');
            return;
        }

        if (!currentBetNegotiation) return;

        try {
            const betCode = getNegotiationBetCode();
            const result = await apiRequest(`/bets/${betCode}/monto`, 'PUT', {
                montoPerTeam: monto
            });

            if (result) {
                // Agregar al historial
                proposalHistory.push({
                    team: 'my',
                    monto: monto,
                    timestamp: new Date().toLocaleString('es-ES')
                });
                updateProposalHistory();

                showNegotiationMessage('success', 'Monto propuesto exitosamente');
                setTimeout(() => loadNegotiationData(currentBetNegotiation.id), 500);
            }
        } catch (error) {
            showNegotiationMessage('error', error.messageFromBackend || 'Error al proponer el monto');
        }
    });

    // Botón actualizar estado
    document.getElementById('refreshNegotiationBtn').addEventListener('click', async () => {
        if (currentBetNegotiation) {
            await loadNegotiationData(currentBetNegotiation.id);
            showNegotiationMessage('success', 'Estado actualizado');
        }
    });

    // Botón cancelar apuesta
    document.getElementById('cancelBetBtn').addEventListener('click', async () => {
        if (!currentBetNegotiation) return;

        const motivo = prompt('¿Cuál es el motivo de cancelación?', 'Sin especificar');
        if (motivo === null) return;

        try {
            const result = await apiRequest(`/bets/${currentBetNegotiation.id}`, 'DELETE', { motivo });
            if (result) {
                showNegotiationMessage('success', 'Apuesta cancelada');
                setTimeout(() => showBetsView(), 1500);
            }
        } catch (error) {
            showNegotiationMessage('error', error.messageFromBackend || 'Error al cancelar la apuesta');
        }
    });
}

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

/**
 * Realiza logout
 */
function logout() {
    token = null;
    currentUsername = null;
    currentUserId = null;
    gameAccounts = [];
    showAuthView();
}

// ========================================
// INICIALIZACIÓN
// ========================================

/**
 * Inicializa toda la aplicación
 */
function initApp() {
    // Inicializar vistas
    initAuthView();
    initDashboardView();
    initBetsView();
    initWalletView();
    initNegotiationView();

    // Inicializar modales
    initModals();
    initLinkGameAccountModal();
    initNewBetModal();

    // Mostrar vista de autenticación por defecto
    showAuthView();
}

// Iniciar aplicación cuando DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

