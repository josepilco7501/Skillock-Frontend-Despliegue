// ============================================
// SKILLOCK - PANEL DE ADMINISTRADOR
// ============================================

// Variable global para almacenar el token JWT
let adminToken = null;

// URL base de la API
const API_BASE = 'https://skillock-despliegue.onrender.com';

// Mapeo de juegos
const GAME_MAP = {
    0: 'Dota 2',
    1: 'CS2',
    2: 'Valorant'
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Realiza una petición HTTP autenticada
 */
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Agregar token JWT si existe
    if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Si es 401, volver al login
        if (response.status === 401) {
            showLoginView();
            showError('adminLoginError', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
            return null;
        }

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error en petición API:', error);
        return null;
    }
}


// Registrar administrador desde el panel
const showAdminRegisterFormBtn = document.getElementById('showAdminRegisterFormBtn');
if (showAdminRegisterFormBtn) {
    showAdminRegisterFormBtn.addEventListener('click', () => {
        const registerCard = document.getElementById('adminRegisterCard');
        if (registerCard) {
            registerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

const adminRegisterForm = document.getElementById('adminRegisterForm');
if (adminRegisterForm) {
    adminRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminRegUsername').value;
        const email = document.getElementById('adminRegEmail').value;
        const password = document.getElementById('adminRegPassword').value;

        clearError('adminLoginError');

        try {
            const resp = await fetch(`${API_BASE}/api/auth/admin/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ username, email, password })
            });

            const txt = await resp.text().catch(() => null);
            if (resp.ok) {
                document.getElementById('adminRegisterMsg').style.display = 'block';
                document.getElementById('adminRegisterMsg').textContent = 'Administrador creado correctamente.';
                adminRegisterForm.reset();
                loadUsers();
            } else {
                alert('Error registrando admin: ' + (txt || resp.status));
            }
        } catch (err) {
            console.error(err);
            alert('Error de red al registrar administrador.');
        }
    });
}

/**
 * Muestra un mensaje de error
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

/**
 * Limpia un mensaje de error
 */
function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

/**
 * Cambia de vista en el navbar
 */
function switchAdminView(viewName) {
    // Actualizar links activos
    document.querySelectorAll('[data-admin-view]').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-admin-view="${viewName}"]`).classList.add('active');

    // Mostrar/ocultar contenido
    document.getElementById('dashboardContent').style.display = viewName === 'dashboard' ? 'block' : 'none';
    document.getElementById('betsContent').style.display = viewName === 'bets' ? 'block' : 'none';
    document.getElementById('usersContent').style.display = viewName === 'users' ? 'block' : 'none';

    // Cargar datos según la vista
    if (viewName === 'bets') {
        loadAllBets();
    } else if (viewName === 'users') {
        loadUsers();
    }
}

/**
 * Muestra la vista de login
 */
function showLoginView() {
    document.getElementById('adminLoginView').classList.add('active');
    document.getElementById('adminDashboardView').classList.remove('active');
}

/**
 * Muestra la vista del dashboard
 */
function showDashboardView() {
    document.getElementById('adminLoginView').classList.remove('active');
    document.getElementById('adminDashboardView').classList.add('active');
}

/**
 * Formatea una fecha a formato legible
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Obtiene los primeros 8 caracteres del ID
 */
function getBetCode(id) {
    return id.substring(0, 8).toUpperCase();
}

/**
 * Normaliza la respuesta de la API de apuestas.
 * Puede venir como arreglo directo o como paginada con `items`.
 */
function getBetList(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.items)) return response.items;
    if (response && Array.isArray(response.Items)) return response.Items;
    return [];
}

/**
 * Obtiene el rol del usuario desde la respuesta del login o desde el JWT.
 * Se contemplan varias variantes para evitar problemas por el nombre del claim.
 */
function getRoleFromAuthResponse(response, token) {
    if (response?.role) return response.role;

    try {
        const parts = token.split('.');
        const decoded = JSON.parse(atob(parts[1]));
        return (
            decoded.role ||
            decoded.Role ||
            decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ||
            null
        );
    } catch {
        return null;
    }
}

// ============================================
// LOGIN
// ============================================

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('adminLoginError');

    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    // Llamar a POST /api/auth/acceso
    const response = await apiCall('/api/auth/acceso', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    if (!response || !response.token) {
        showError('adminLoginError', 'Error en el inicio de sesión. Verifica tus credenciales.');
        return;
    }

    // Guardar token en variable global
    adminToken = response.token;

    // Verificar que el rol realmente sea Admin
    const role = getRoleFromAuthResponse(response, adminToken);

    if (role !== 'Admin') {
        showError('adminLoginError', 'Acceso denegado. Solo administradores pueden acceder.');
        adminToken = null;
        return;
    }

    // Login exitoso
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    showDashboardView();
    loadDashboardData();
});

// ============================================
// LOGOUT
// ============================================

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    adminToken = null;
    showLoginView();
    clearError('adminLoginError');
});

// ============================================
// NAVEGACIÓN
// ============================================

document.querySelectorAll('[data-admin-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = e.target.dataset.adminView;
        switchAdminView(viewName);
    });
});

// ============================================
// CARGAR DATOS DEL DASHBOARD
// ============================================

async function loadDashboardData() {
    // Cargar apuestas completadas
    const response = await apiCall('/api/bets/completed');

    if (!response) {
        console.error('No se pudieron cargar las apuestas');
        return;
    }

    // Tomar la lista real desde la respuesta paginada
    const completedBets = getBetList(response);

    // Calcular estadísticas
    const totalCompletedBets = completedBets.length;
    const totalBetAmount = completedBets.reduce((sum, bet) => {
        // Monto total = agreedAmountPerTeam * 2 (ambos equipos)
        return sum + (bet.agreedAmountPerTeam * 2);
    }, 0);
    const totalCommission = totalBetAmount * 0.07; // 7% de comisión

    // Actualizar cards
    document.getElementById('totalCompletedBets').textContent = totalCompletedBets;
    document.getElementById('totalBetAmount').textContent = `$${totalBetAmount.toFixed(2)}`;
    document.getElementById('totalCommission').textContent = `$${totalCommission.toFixed(2)}`;

    // Cargar tabla de apuestas completadas en dashboard
    loadDashboardBetsTable(completedBets);
}

/**
 * Carga la tabla de apuestas completadas en el dashboard
 */
function loadDashboardBetsTable(completedBets) {
    const tbody = document.querySelector('#adminBetsTable tbody');
    tbody.innerHTML = '';

    if (completedBets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay apuestas completadas</td></tr>';
        return;
    }

    // Ordenar por fecha descendente (más recientes primero)
    completedBets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    completedBets.forEach(bet => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${getBetCode(bet.id)}</td>
            <td>${GAME_MAP[bet.game] || 'Desconocido'}</td>
            <td>$${bet.agreedAmountPerTeam.toFixed(2)}</td>
            <td>$${(bet.agreedAmountPerTeam * 2).toFixed(2)}</td>
            <td>${formatDate(bet.createdAt)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// CARGAR TODAS LAS APUESTAS
// ============================================

async function loadAllBets() {
    // Ahora cargamos apuestas activas para que el admin pueda liquidarlas
    const response = await apiCall('/api/bets/active');

    if (!response) {
        console.error('No se pudieron cargar las apuestas');
        return;
    }

    const bets = getBetList(response);

    const tbody = document.querySelector('#adminAllBetsTable tbody');
    tbody.innerHTML = '';

    if (bets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay apuestas activas</td></tr>';
        return;
    }

    // Ordenar por fecha descendente
    bets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    bets.forEach(bet => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${getBetCode(bet.id)}</td>
            <td>${GAME_MAP[bet.game] || 'Desconocido'}</td>
            <td>$${(bet.agreedAmountPerTeam || 0).toFixed(2)}</td>
            <td>$${((bet.premioNeto) || 0).toFixed(2)}</td>
            <td>${formatDate(bet.createdAt)}</td>
            <td>
               <button class="btn-small" data-action="liquidar-a" data-id="${bet.id}">Team A gana</button>
               <button class="btn-small" data-action="liquidar-b" data-id="${bet.id}">Team B gana</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Enlazar botones
    document.querySelectorAll('button[data-action^="liquidar-"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const resultado = action.endsWith('-a') ? 1 : 2; // MatchResult.TeamAWins = 1, TeamBWins = 2

            if (!confirm('¿Seguro quieres liquidar esta apuesta y asignar ganador?')) return;

            try {
                const resp = await fetch(`${API_BASE}/api/bets/${id}/liquidar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({ resultado })
                });

                if (resp.status === 200) {
                    alert('Apuesta liquidada correctamente.');
                    loadAllBets();
                    loadDashboardData();
                } else {
                    const txt = await resp.text().catch(() => null);
                    alert('Error al liquidar: ' + (txt || resp.status));
                }
            } catch (err) {
                console.error(err);
                alert('Error de red al liquidar la apuesta.');
            }
        });
    });
}

// ============================================
// DESCARGAR REPORTE PDF
// ============================================

async function downloadCompletedBetsReport() {
    // Requiere token de admin
    if (!adminToken) {
        showError('adminLoginError', 'Inicia sesión como administrador para descargar el reporte.');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/api/bets/completed/report`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (resp.status === 401) {
            showLoginView();
            showError('adminLoginError', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
            return;
        }

        // Si el servidor devuelve 422 (DomainException), mostrar el mensaje detallado
        if (resp.status === 422) {
            const text = await resp.text();
            console.error('Reporte error 422:', text);
            showError('adminLoginError', text || 'No fue posible generar el reporte (422).');
            return;
        }

        if (!resp.ok) {
            const txt = await resp.text().catch(() => null);
            console.error('Reporte error:', resp.status, txt);
            showError('adminLoginError', txt || 'No fue posible descargar el reporte.');
            return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'completed_bets_report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error descargando reporte:', err);
        showError('adminLoginError', 'Error al descargar el reporte.');
    }
}

// Enlazar botón de descarga (si existe)
const __downloadReportBtn = document.getElementById('downloadReportBtn');
if (__downloadReportBtn) __downloadReportBtn.addEventListener('click', () => downloadCompletedBetsReport());

// ============================================
// CARGAR USUARIOS
// ============================================

async function loadUsers() {
    const users = await apiCall('/api/users');

    const tbody = document.querySelector('#adminUsersTable tbody');
    const usersMessageDiv = document.getElementById('usersMessage');
    tbody.innerHTML = '';

    if (!users) {
        // Endpoint no disponible
        usersMessageDiv.style.display = 'block';
        tbody.innerHTML = `
            <tr>
                <td>Admin User</td>
                <td>admin@skillock.com</td>
                <td><span style="background: #f5a623; color: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Admin</span></td>
                <td>2024-01-15 10:30</td>
            </tr>
            <tr>
                <td>Juan Pérez</td>
                <td>juan.perez@example.com</td>
                <td><span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">User</span></td>
                <td>2024-02-20 14:45</td>
            </tr>
            <tr>
                <td>María García</td>
                <td>maria.garcia@example.com</td>
                <td><span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">User</span></td>
                <td>2024-03-10 09:15</td>
            </tr>
        `;
        return;
    }

    usersMessageDiv.style.display = 'none';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay usuarios registrados</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        const roleDisplay = user.role === 'Admin' 
            ? '<span style="background: #f5a623; color: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Admin</span>'
            : '<span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">User</span>';
        
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${roleDisplay}</td>
            <td>${formatDate(user.createdAt)}</td>
        `;
        tbody.appendChild(row);
    });
}

