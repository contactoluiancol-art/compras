// js/app.js
import { authService } from './services/auth.service.js';
import { supabase } from './config/supabase.js';
import { initAuxiliarView } from './modules/auxiliar/req-admin.js';
import { initAnalistaView } from './modules/analista/supplies.js';
import { initJefeView } from './modules/jefe/dashboard.js';
import './modules/analista/special-req.js';
import './modules/analista/oc-generator.js';

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const userNameDisplay = document.getElementById('user-name');
const userRoleDisplay = document.getElementById('user-role');
const btnLogout = document.getElementById('btn-logout');

let currentSubscription = null;

// 1. VERIFICAR SESIÓN ACTIVA
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await authService.getSession();
    if (session) {
      await loadApp(session.user.id);
    }
  } catch (err) {
    console.error('Error al verificar sesión:', err);
  }
});

// 2. INICIO DE SESIÓN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  authError.textContent = '';

  const submitBtn = document.getElementById('btn-submit-auth');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const overlay = document.getElementById('login-transition-overlay');
  const welcomeTitle = document.getElementById('welcome-user-title');
  const welcomeRole = document.getElementById('welcome-user-role');
  const progressBar = overlay.querySelector('.terminal-bar');

  try {
    // 1. Efecto inicial en el botón
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Autenticando...</span>`;

    // 2. Login con Supabase
    const { user } = await authService.login(email, password);
    const profile = await authService.getUserProfile(user.id);

    // 3. Lanzar Overlay Épico
    welcomeTitle.textContent = `¡Hola, ${profile.full_name}!`;
    welcomeRole.textContent = `Sesión iniciada: ${profile.role.toUpperCase()} (Electroingeniería S.A.S.)`;

    overlay.classList.remove('hidden');
    // Forzar renderizado para la transición
    setTimeout(() => {
      overlay.classList.add('active');
      progressBar.style.width = '100%';
    }, 20);

    // 4. Cargar vistas y desvanecer overlay
    setTimeout(async () => {
      await loadApp(user.id);
      
      overlay.classList.remove('active');
      setTimeout(() => overlay.classList.add('hidden'), 400);
    }, 1400);

  } catch (err) {
    authError.textContent = err.message || 'Credenciales no autorizadas';
    authError.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span class="btn-text">Entrar al Sistema</span>
      <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
    `;
  }
});

// 3. CIERRE DE SESIÓN
btnLogout.addEventListener('click', async () => {
  if (currentSubscription) {
    supabase.removeChannel(currentSubscription);
  }
  await authService.logout();
  window.location.reload();
});

// 4. CARGA DE VISTAS POR ROL Y CANAL EN TIEMPO REAL
async function loadApp(userId) {
  try {
    const profile = await authService.getUserProfile(userId);
    
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    userNameDisplay.textContent = profile.full_name;
    userRoleDisplay.textContent = profile.role.toUpperCase();

    // Limpiar vistas
    document.querySelectorAll('.role-view').forEach(v => v.classList.add('hidden'));

    // Renderizado según rol
    if (profile.role === 'auxiliar') {
      document.getElementById('view-auxiliar').classList.remove('hidden');
      await initAuxiliarView();
    } else if (profile.role === 'analista') {
      document.getElementById('view-analista').classList.remove('hidden');
      await initAnalistaView();
    } else if (profile.role === 'jefe') {
      document.getElementById('view-jefe').classList.remove('hidden');
      await initJefeView();
    }

    // Suscribirse a cambios en tiempo real
    setupRealtimeSubscription(profile.role);

  } catch (err) {
    authError.textContent = 'Error al cargar perfil de usuario.';
    console.error(err);
  }
}

function setupRealtimeSubscription(role) {
  if (currentSubscription) {
    supabase.removeChannel(currentSubscription);
  }

  currentSubscription = supabase
    .channel('orders-realtime-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'purchase_orders' },
      () => {
        // Recargar la vista activa cuando ocurra una modificación en BD
        if (role === 'jefe') {
          initJefeView();
        } else if (role === 'auxiliar') {
          initAuxiliarView();
        } else if (role === 'analista') {
          initAnalistaView();
        }
      }
    )
    .subscribe();
}

import { ordersService } from './services/orders.service.js';

// Exponer función de eliminación global
window.handleDeleteOrder = async function(orderId) {
  if (!confirm('¿Estás seguro de que deseas eliminar este trámite? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    await ordersService.deleteOrder(orderId);
    alert('Trámite eliminado correctamente.');
  } catch (err) {
    alert('Error al eliminar: ' + (err.message || 'No tienes permisos para eliminar esta orden.'));
  }
};