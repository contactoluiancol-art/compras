import { ordersService } from '../../services/orders.service.js';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/formatters.js';

let allOrders = [];

export async function initJefeView() {
  const container = document.getElementById('view-jefe');

  container.innerHTML = `
    <div class="view-header" style="margin-bottom: 1.5rem;">
      <h2>Mesa de Control y Aprobaciones Jefatura</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">Auditoría integral y toma de decisiones (S-PR-1 / S-PR-16)</p>
    </div>

    <!-- TARJETAS DE INDICADORES / KPIS -->
    <div class="kpi-container">
      <div class="kpi-box">
        <h4>Total Requisiciones</h4>
        <span id="kpi-total">0</span>
      </div>
      <div class="kpi-box">
        <h4>Pendientes Aprobación</h4>
        <span id="kpi-pending" style="color: var(--warning);">0</span>
      </div>
      <div class="kpi-box">
        <h4>En Tránsito / Novedad</h4>
        <span id="kpi-transit" style="color: var(--primary);">0</span>
      </div>
      <div class="kpi-box">
        <h4>Cerradas / Recibidas</h4>
        <span id="kpi-completed" style="color: var(--success);">0</span>
      </div>
    </div>

    <!-- BARRA DE FILTROS -->
    <div style="background: var(--bg-card); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: center;">
      <div>
        <label style="font-size: 0.8rem; font-weight: 600;">Filtrar por Procedimiento:</label>
        <select id="filter-type" style="margin-top: 0.3rem;">
          <option value="ALL">Todos los tipos</option>
          <option value="administrativa">Compras Administrativas (S-PR-16)</option>
          <option value="rotacion">Suministros: Rotación</option>
          <option value="logistica">Suministros: Logística</option>
          <option value="especial_ventas">Suministros: Pedido Especial</option>
        </select>
      </div>

      <div>
        <label style="font-size: 0.8rem; font-weight: 600;">Filtrar por Estado:</label>
        <select id="filter-status" style="margin-top: 0.3rem;">
          <option value="ALL">Todos los estados</option>
          <option value="aprobacion_pendiente">Pendientes de Aprobación</option>
          <option value="anticipo_en_tramite">Anticipo en Trámite</option>
          <option value="oc_generada">OC Generada / En Tránsito</option>
          <option value="recibido_almacen">Recibidos en Almacén</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      <div style="display: flex; gap: 0.5rem; align-self: flex-end;">
        <button id="btn-reset-filters" class="btn btn-secondary" style="width: 100%;">Restablecer Filtros</button>
      </div>
    </div>

    <!-- TABLA AUDITORÍA GLOBAL -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Solicitante</th>
            <th>Procedimiento</th>
            <th>Referencia</th>
            <th>Monto Total</th>
            <th>Proveedor</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="jefe-table-body"></tbody>
      </table>
    </div>
  `;

  // Eventos de filtros
  document.getElementById('filter-type').addEventListener('change', applyFilters);
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    document.getElementById('filter-type').value = 'ALL';
    document.getElementById('filter-status').value = 'ALL';
    applyFilters();
  });

  await loadJefeData();
}

async function loadJefeData() {
  try {
    allOrders = await ordersService.fetchOrders();
    updateKpis(allOrders);
    applyFilters();
  } catch (err) {
    console.error(err);
  }
}

function updateKpis(orders) {
  document.getElementById('kpi-total').innerText = orders.length;
  document.getElementById('kpi-pending').innerText = orders.filter(o => o.status === 'aprobacion_pendiente').length;
  document.getElementById('kpi-transit').innerText = orders.filter(o => ['oc_generada', 'en_transito', 'novedad_reportada'].includes(o.status)).length;
  document.getElementById('kpi-completed').innerText = orders.filter(o => ['recibido_almacen', 'facturado'].includes(o.status)).length;
}

function applyFilters() {
  const typeFilter = document.getElementById('filter-type').value;
  const statusFilter = document.getElementById('filter-status').value;

  const filtered = allOrders.filter(o => {
    const matchesType = (typeFilter === 'ALL') || (o.request_type === typeFilter);
    const matchesStatus = (statusFilter === 'ALL') || 
      (statusFilter === 'oc_generada' ? ['oc_generada', 'en_transito', 'novedad_reportada'].includes(o.status) : o.status === statusFilter);

    return matchesType && matchesStatus;
  });

  renderTable(filtered);
}

function renderTable(orders) {
  const tbody = document.getElementById('jefe-table-body');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No se encontraron órdenes con los filtros seleccionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.profiles ? o.profiles.full_name : 'N/A'}</strong></td>
      <td>
        <span class="badge ${o.request_type === 'administrativa' ? 'badge-info' : 'badge-pending'}">
          ${o.request_type.replace('_', ' ')}
        </span>
      </td>
      <td>${o.origin_doc_ref || 'N/A'}</td>
      <td>${formatCurrency(o.total_amount)}</td>
      <td>${o.suppliers ? o.suppliers.company_name : 'No asignado'}</td>
      <td><span class="badge ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span></td>
      <td>
        <div style="display: flex; gap: 0.3rem; align-items: center;">
          <button class="btn btn-secondary" style="font-size:0.75rem;" onclick="showOrderModal('${o.id}')">Ver Detalle</button>
          
          ${o.status === 'aprobacion_pendiente' 
            ? `
              <button class="btn btn-success" style="font-size:0.75rem;" onclick="handleJefeDecision('${o.id}', 'oc_generada')">Aprobar</button>
              <button class="btn btn-secondary" style="font-size:0.75rem; color:var(--danger);" onclick="handleJefeDecision('${o.id}', 'cancelado')">Rechazar</button>
            ` 
            : ''}

          ${o.status === 'oc_generada' || o.status === 'recibido_almacen'
            ? `<button class="btn btn-primary" style="font-size:0.75rem;" onclick="printPurchaseOrder('${o.id}')">Imprimir OC</button>`
            : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  if (status === 'aprobacion_pendiente') return 'badge-pending';
  if (['oc_generada', 'recibido_almacen', 'facturado'].includes(status)) return 'badge-success';
  if (status === 'cancelado') return 'badge-pending';
  return 'badge-info';
}

window.handleJefeDecision = async function(orderId, nextStatus) {
  const confirmMsg = nextStatus === 'oc_generada'
    ? '¿Confirmas la aprobación y generación de la Orden de Compra (S-IN-17)?'
    : '¿Confirmas el rechazo y cancelación definitiva de esta requisición?';

  if (!confirm(confirmMsg)) return;

  try {
    await ordersService.updateStatus(orderId, nextStatus);
    await loadJefeData();
  } catch (err) {
    alert('Error al actualizar estado: ' + err.message);
  }
};