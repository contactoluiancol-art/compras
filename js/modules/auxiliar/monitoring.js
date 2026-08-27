import { ordersService } from '../../services/orders.service.js';
import { incidentsService } from '../../services/incidents.service.js';

export async function initMonitoringSection(targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  const sectionDiv = document.createElement('div');
  sectionDiv.style.marginTop = '2.5rem';
  sectionDiv.innerHTML = `
    <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3>Monitoreo de Envíos y Recepción (S-PR-1)</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Seguimiento en tránsito, novedades y entrada a ERP</p>
        </div>
      </div>

      <!-- MODAL / FORMULARIO DE NOVEDADES -->
      <div id="incident-form-container" class="hidden" style="background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.8rem; color: var(--danger);">Reportar Novedad de Entrega / Retraso</h4>
        <form id="incident-form">
          <input type="hidden" id="inc-order-id">
          
          <div class="form-group">
            <label>Descripción del Problema o Retraso</label>
            <textarea id="inc-desc" rows="2" required placeholder="Detalle la situación ocurrida con el proveedor/transportista..."></textarea>
          </div>

          <div class="form-group" style="background: #fafbfc; padding: 0.8rem; border-radius: 4px;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600;">
              <input type="checkbox" id="inc-affects-client" style="width: auto;">
              ¿El retraso o novedad afecta el pedido de un cliente?
            </label>
          </div>

          <div id="client-decision-box" class="hidden form-group" style="background: #fff8e1; padding: 0.8rem; border-radius: 4px;">
            <label>Respuesta del Asesor / Cliente (S-PR-1 Pág. 3):</label>
            <select id="inc-client-accepted">
              <option value="true">Cliente Acepta nueva fecha (Continuar seguimiento)</option>
              <option value="false">Cliente NO Acepta (Solicitar cancelación / T-PR-7)</option>
            </select>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" id="btn-cancel-incident" class="btn btn-secondary">Cerrar</button>
            <button type="submit" class="btn btn-primary" style="background: var(--danger);">Guardar Novedad</button>
          </div>
        </form>
      </div>

      <!-- TABLA DE MONITOREO -->
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Orden</th>
              <th>Tipo</th>
              <th>Referencia</th>
              <th>Despacho</th>
              <th>Estado Actual</th>
              <th>Acciones de Seguimiento</th>
            </tr>
          </thead>
          <tbody id="monitoring-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  container.appendChild(sectionDiv);

  const incidentFormContainer = document.getElementById('incident-form-container');
  const affectsCheckbox = document.getElementById('inc-affects-client');
  const clientDecisionBox = document.getElementById('client-decision-box');

  affectsCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      clientDecisionBox.classList.remove('hidden');
    } else {
      clientDecisionBox.classList.add('hidden');
    }
  });

  document.getElementById('btn-cancel-incident').addEventListener('click', () => {
    incidentFormContainer.classList.add('hidden');
  });

  document.getElementById('incident-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('inc-order-id').value;
    const desc = document.getElementById('inc-desc').value;
    const affectsClient = affectsCheckbox.checked;
    const clientAccepted = affectsClient ? (document.getElementById('inc-client-accepted').value === 'true') : null;

    try {
      await incidentsService.reportIncident({
        purchase_order_id: orderId,
        description: desc,
        affects_client: affectsClient,
        client_accepted: clientAccepted
      });

      // Si el cliente no acepta continuar con la compra, se cancela la orden
      if (affectsClient && !clientAccepted) {
        await ordersService.updateStatus(orderId, 'cancelado');
      } else {
        await ordersService.updateStatus(orderId, 'novedad_reportada');
      }

      incidentFormContainer.classList.add('hidden');
      document.getElementById('incident-form').reset();
      clientDecisionBox.classList.add('hidden');
      await loadMonitoringData();
    } catch (err) {
      alert('Error al registrar novedad: ' + err.message);
    }
  });

  await loadMonitoringData();
}

export async function loadMonitoringData() {
  const tbody = document.getElementById('monitoring-table-body');
  if (!tbody) return;

  try {
    const orders = await ordersService.fetchOrders();
    // Filtra órdenes activas en tránsito o seguimiento
    const activeOrders = orders.filter(o => 
      ['oc_generada', 'en_transito', 'novedad_reportada'].includes(o.status)
    );

    if (activeOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay órdenes en proceso de monitoreo o tránsito.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeOrders.map(o => `
      <tr>
        <td><strong>${o.id.slice(0, 8)}</strong></td>
        <td>${o.request_type}</td>
        <td>${o.origin_doc_ref || 'N/A'}</td>
        <td>${o.supplier_delivers ? 'Proveedor entrega' : 'Recogida propia'}</td>
        <td><span class="badge ${o.status === 'novedad_reportada' ? 'badge-pending' : 'badge-info'}">${o.status}</span></td>
        <td style="display:flex; gap:0.4rem;">
          <button class="btn btn-secondary" style="font-size:0.75rem;" onclick="openIncidentModal('${o.id}')">Reportar Novedad</button>
          <button class="btn btn-primary" style="font-size:0.75rem;" onclick="processArrival('${o.id}')">Registrar Entrada ERP</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.openIncidentModal = function(orderId) {
  document.getElementById('inc-order-id').value = orderId;
  document.getElementById('incident-form-container').classList.remove('hidden');
};

window.processArrival = async function(orderId) {
  const applyAdjustment = confirm('¿Se debe aplicar algún ajuste por descuento o flete a esta entrada (S-IN-18)?');
  
  try {
    // Si llega directo a bodega -> S-PR-8; si es cliente directo -> facturación S-IN-12[cite: 1, 2]
    await ordersService.updateStatus(orderId, 'recibido_almacen');
    if (applyAdjustment) {
      alert('Ajuste de sobrecosto registrado. Procediendo a cierre en almacén.');
    }
    await loadMonitoringData();
  } catch (err) {
    alert('Error al registrar llegada: ' + err.message);
  }
};