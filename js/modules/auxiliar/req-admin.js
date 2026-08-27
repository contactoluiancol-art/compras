import { ordersService } from '../../services/orders.service.js';
import { suppliersService } from '../../services/suppliers.service.js';
import { initMonitoringSection } from './monitoring.js';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/formatters.js';
import { sanitizeText, isValidPositiveNumber } from '../../utils/validators.js';

let reqItems = [];

export async function initAuxiliarView() {
  const container = document.getElementById('view-auxiliar');
  reqItems = [];
  
  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h2>Compras Administrativas</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Procedimiento S-PR-16 / Monitoreo</p>
      </div>
      <button id="btn-show-form" class="btn btn-primary">+ Nueva Requisición</button>
    </div>

    <!-- MODAL / FORMULARIO S-PR-16 -->
    <div id="form-container" class="hidden" style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem;">Diligenciar Requisición de Compras (S-PR-16)</h3>
      <form id="admin-req-form">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label>N° Requisición / Doc. Referencia</label>
            <input type="text" id="req-doc-ref" required placeholder="REQ-ADM-2026-001">
          </div>
          
          <div class="form-group">
            <label>Modalidad de Pago Propuesta</label>
            <select id="req-payment-method" required>
              <option value="credito">Crédito (Genera Orden S-IN-17)</option>
              <option value="tarjeta">En línea (Tarjeta de Crédito)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Proveedor</label>
          <select id="req-supplier" required>
            <option value="">Seleccione o registre uno...</option>
            <option value="NEW">+ Registrar Proveedor Nuevo (S-PR-10)</option>
          </select>
        </div>

        <!-- Campos dinámicos si es proveedor nuevo -->
        <div id="new-supplier-fields" class="hidden" style="background: #fafbfc; padding: 1rem; border: 1px dashed var(--border-color); border-radius: 6px; margin-bottom: 1rem;">
          <h5 style="margin-bottom: 0.5rem; color: var(--primary);">Datos del Nuevo Proveedor (S-PR-10)</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label>NIT / Identificación</label>
              <input type="text" id="new-sup-nit" placeholder="900.000.000-1">
            </div>
            <div class="form-group">
              <label>Razón Social / Nombre</label>
              <input type="text" id="new-sup-name" placeholder="Distribuciones Eléctricas S.A.S.">
            </div>
          </div>
        </div>

        <!-- SECCIÓN DE PRODUCTOS / ÍTEMS -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.8rem;">Detalle de Materiales o Servicios</h4>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; align-items: end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Descripción del ítem</label>
              <input type="text" id="item-desc" placeholder="Ej. Resma de papel, Toner...">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Cantidad</label>
              <input type="number" step="1" min="1" id="item-qty" placeholder="1">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Precio Unit. ($)</label>
              <input type="number" step="0.01" id="item-price" placeholder="0.00">
            </div>
            <button type="button" id="btn-add-item" class="btn btn-secondary" style="height: 38px;">+ Agregar</button>
          </div>

          <table class="data-table" style="margin-top: 0.8rem; font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="items-table-body">
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No se han agregado ítems.</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3" style="text-align: right;">Total Cotizado:</th>
                <th id="total-req-amount">$0</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button type="button" id="btn-cancel-form" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Radicar para Aprobación</button>
        </div>
      </form>
    </div>

    <!-- TABLA DE MIS TRÁMITES -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Referencia</th>
            <th>Monto</th>
            <th>Modalidad</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="auxiliar-table-body"></tbody>
      </table>
    </div>
  `;

  await populateSuppliers();

  const formContainer = document.getElementById('form-container');
  const selectSupplier = document.getElementById('req-supplier');
  const newSupplierFields = document.getElementById('new-supplier-fields');

  document.getElementById('btn-show-form').addEventListener('click', () => {
    formContainer.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-form').addEventListener('click', () => {
    formContainer.classList.add('hidden');
    reqItems = [];
    renderItemsTable();
  });

  selectSupplier.addEventListener('change', (e) => {
    if (e.target.value === 'NEW') {
      newSupplierFields.classList.remove('hidden');
      document.getElementById('new-sup-nit').required = true;
      document.getElementById('new-sup-name').required = true;
    } else {
      newSupplierFields.classList.add('hidden');
      document.getElementById('new-sup-nit').required = false;
      document.getElementById('new-sup-name').required = false;
    }
  });

  // Manejo de ítems en memoria
  document.getElementById('btn-add-item').addEventListener('click', () => {
    const desc = sanitizeText(document.getElementById('item-desc').value);
    const qty = parseFloat(document.getElementById('item-qty').value);
    const price = parseFloat(document.getElementById('item-price').value);

    if (!desc || !isValidPositiveNumber(qty) || isNaN(price) || price < 0) {
      alert('Por favor ingrese una descripción, cantidad válida y precio unitario.');
      return;
    }

    reqItems.push({
      description: desc,
      quantity: qty,
      unit_price: price
    });

    document.getElementById('item-desc').value = '';
    document.getElementById('item-qty').value = '';
    document.getElementById('item-price').value = '';

    renderItemsTable();
  });

  // Envío del formulario
  document.getElementById('admin-req-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (reqItems.length === 0) {
      alert('Debe agregar al menos un ítem a la requisición.');
      return;
    }

    let supplierId = selectSupplier.value;

    try {
      if (supplierId === 'NEW') {
        const nit = sanitizeText(document.getElementById('new-sup-nit').value);
        const company_name = sanitizeText(document.getElementById('new-sup-name').value);
        const selectedMethod = document.getElementById('req-payment-method').value;
        const payment_terms = selectedMethod === 'tarjeta' ? 'contado' : 'credito';

        const newSupplier = await suppliersService.createSupplier({
          nit,
          company_name,
          payment_terms,
          is_approved: false
        });
        supplierId = newSupplier.id;
      }

      const docRef = sanitizeText(document.getElementById('req-doc-ref').value);
      const totalAmount = reqItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

      await ordersService.createOrder({
        request_type: 'administrativa',
        origin_doc_ref: docRef,
        total_amount: totalAmount,
        supplier_id: supplierId,
        status: 'aprobacion_pendiente'
      }, reqItems);

      document.getElementById('admin-req-form').reset();
      newSupplierFields.classList.add('hidden');
      formContainer.classList.add('hidden');
      reqItems = [];
      renderItemsTable();
      
      await populateSuppliers();
      await loadAuxiliarTable();
    } catch (err) {
      alert('Error al radicar: ' + err.message);
    }
  });

  await loadAuxiliarTable();
  await initMonitoringSection('view-auxiliar');
}

function renderItemsTable() {
  const tbody = document.getElementById('items-table-body');
  const totalEl = document.getElementById('total-req-amount');

  if (reqItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No se han agregado ítems.</td></tr>`;
    totalEl.innerText = formatCurrency(0);
    return;
  }

  let grandTotal = 0;
  tbody.innerHTML = reqItems.map((item, idx) => {
    const subtotal = item.quantity * item.unit_price;
    grandTotal += subtotal;
    return `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unit_price)}</td>
        <td>${formatCurrency(subtotal)}</td>
        <td><button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; color:var(--danger);" onclick="removeReqItem(${idx})">&times;</button></td>
      </tr>
    `;
  }).join('');

  totalEl.innerText = formatCurrency(grandTotal);
}

window.removeReqItem = function(index) {
  reqItems.splice(index, 1);
  renderItemsTable();
};

async function populateSuppliers() {
  const select = document.getElementById('req-supplier');
  try {
    const suppliers = await suppliersService.getSuppliers();
    select.innerHTML = `
      <option value="">Seleccione un proveedor...</option>
      <option value="NEW">+ Registrar Proveedor Nuevo (S-PR-10)</option>
      ${suppliers.map(s => `<option value="${s.id}">${s.company_name} (NIT: ${s.nit})</option>`).join('')}
    `;
  } catch (err) {
    console.error('Error cargando proveedores:', err);
  }
}

async function loadAuxiliarTable() {
  const tbody = document.getElementById('auxiliar-table-body');
  try {
    const orders = await ordersService.fetchOrders();
    
    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No tienes requisiciones radicadas.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(item => `
      <tr>
        <td><strong>${item.id.slice(0, 8)}</strong></td>
        <td>${item.origin_doc_ref || 'N/A'}</td>
        <td>${formatCurrency(item.total_amount)}</td>
        <td>${item.requires_advance_payment ? 'Anticipo' : 'Crédito / En Línea'}</td>
        <td>
          <span class="badge ${item.status === 'aprobacion_pendiente' ? 'badge-pending' : 'badge-success'}">
            ${getStatusLabel(item.status)}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.3rem;">
            <button class="btn btn-secondary" style="font-size:0.75rem;" onclick="showOrderModal('${item.id}')">Ver Detalle</button>
            ${['radicado', 'aprobacion_pendiente'].includes(item.status) 
              ? `<button class="btn btn-secondary" style="font-size:0.75rem; color:var(--danger); border-color:var(--danger);" onclick="handleDeleteOrder('${item.id}')">Eliminar</button>` 
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}