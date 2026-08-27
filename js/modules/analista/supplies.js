import { ordersService } from '../../services/orders.service.js';
import { suppliersService } from '../../services/suppliers.service.js';
import { formatCurrency, getStatusLabel } from '../../utils/formatters.js';
import { sanitizeText, isValidPositiveNumber } from '../../utils/validators.js';

let supplyItems = [];

export async function initAnalistaView() {
  const container = document.getElementById('view-analista');
  supplyItems = [];

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h2>Suministros Eléctricos (S-PR-1)</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Gestión de Rotación, Logística y Pedidos Especiales</p>
      </div>
      <button id="btn-show-supply-form" class="btn btn-primary">+ Nueva Compra de Suministros</button>
    </div>

    <!-- FORMULARIO MODULAR S-PR-1 -->
    <div id="supply-form-container" class="hidden" style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem;">Generar Solicitud de Suministros Eléctricos</h3>
      <form id="supplies-req-form">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label>Origen de la Necesidad (Flujo S-PR-1)</label>
            <select id="sup-origin-type" required>
              <option value="rotacion">1. Reposición por Rotación</option>
              <option value="logistica">2. Solicitud Logística (Sin Stock S-IN-3)</option>
              <option value="especial_ventas">3. Pedido Especial Comercial</option>
            </select>
          </div>

          <div class="form-group">
            <label>N° Pedido / Código ERP / Ref.</label>
            <input type="text" id="sup-doc-ref" required placeholder="Ej: PED-ELEC-409">
          </div>
        </div>

        <!-- VALIDACIÓN DE CARTERA (Solo Pedidos Especiales) -->
        <div id="cartera-box" class="hidden" style="background: #fff8e1; border: 1px solid #ffe082; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
          <h5 style="color: #b78103; margin-bottom: 0.5rem;">Validación con Cartera (Visto Bueno)</h5>
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" id="sup-cartera-ok" style="width: auto;">
            ¿El pedido fue validado y NO se encuentra retenido por Cartera?
          </label>
        </div>

        <div class="form-group">
          <label>Proveedor</label>
          <select id="sup-supplier" required>
            <option value="">Seleccione o registre...</option>
            <option value="NEW">+ Registrar Proveedor Nuevo (S-PR-10)</option>
          </select>
        </div>

        <!-- Campos de Proveedor Nuevo (S-PR-10) -->
        <div id="sup-new-supplier-fields" class="hidden" style="background: #fafbfc; padding: 1rem; border: 1px dashed var(--border-color); border-radius: 6px; margin-bottom: 1rem;">
          <h5 style="margin-bottom: 0.5rem; color: var(--primary);">Registro de Proveedor Nuevo (S-PR-10)</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label>NIT</label>
              <input type="text" id="sup-nit" placeholder="NIT del proveedor">
            </div>
            <div class="form-group">
              <label>Razón Social</label>
              <input type="text" id="sup-company" placeholder="Nombre de la empresa">
            </div>
          </div>
        </div>

        <!-- CONDICIONES DE PAGO Y DESPACHO -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div class="form-group">
            <label>¿Requiere Pago de Anticipo? (T-PR-6)</label>
            <select id="sup-advance-payment">
              <option value="NO">No (Crédito o Contado contra entrega)</option>
              <option value="SI">Sí (Tramitar con Contabilidad)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Modalidad de Envío</label>
            <select id="sup-shipping">
              <option value="SI">Proveedor envía la mercancía</option>
              <option value="NO">Electroingeniería tramita recogida</option>
            </select>
          </div>
        </div>

        <!-- SECCIÓN DE ÍTEMS -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.8rem;">Detalle de Suministros / Material Eléctrico</h4>
          <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 1fr auto; gap: 0.5rem; align-items: end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Código ERP / Ref</label>
              <input type="text" id="sup-item-code" placeholder="CAB-THHN-12">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Descripción</label>
              <input type="text" id="sup-item-desc" placeholder="Cable de cobre THHN...">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Cantidad</label>
              <input type="number" step="1" min="1" id="sup-item-qty" placeholder="100">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.8rem;">Precio Unit. ($)</label>
              <input type="number" step="0.01" id="sup-item-price" placeholder="0.00">
            </div>
            <button type="button" id="btn-add-supply-item" class="btn btn-secondary" style="height: 38px;">+ Agregar</button>
          </div>

          <table class="data-table" style="margin-top: 0.8rem; font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="supply-items-table-body">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No se han agregado ítems.</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <th colspan="4" style="text-align: right;">Total Cotizado:</th>
                <th id="total-supply-amount">$0</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button type="button" id="btn-cancel-supply" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Generar Trámite S-PR-1</button>
        </div>
      </form>
    </div>

    <!-- BANDEJA OPERATIVA ANALISTA -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Origen</th>
            <th>Referencia</th>
            <th>Monto</th>
            <th>Anticipo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="analista-table-body"></tbody>
      </table>
    </div>
  `;

  await populateSuppliersSelect();

  const originSelect = document.getElementById('sup-origin-type');
  const carteraBox = document.getElementById('cartera-box');
  const carteraCheck = document.getElementById('sup-cartera-ok');
  const supplierSelect = document.getElementById('sup-supplier');
  const newSupplierBox = document.getElementById('sup-new-supplier-fields');
  const formContainer = document.getElementById('supply-form-container');

  originSelect.addEventListener('change', (e) => {
    if (e.target.value === 'especial_ventas') {
      carteraBox.classList.remove('hidden');
    } else {
      carteraBox.classList.add('hidden');
      carteraCheck.checked = false;
    }
  });

  supplierSelect.addEventListener('change', (e) => {
    if (e.target.value === 'NEW') {
      newSupplierBox.classList.remove('hidden');
      document.getElementById('sup-nit').required = true;
      document.getElementById('sup-company').required = true;
    } else {
      newSupplierBox.classList.add('hidden');
      document.getElementById('sup-nit').required = false;
      document.getElementById('sup-company').required = false;
    }
  });

  document.getElementById('btn-show-supply-form').addEventListener('click', () => {
    formContainer.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-supply').addEventListener('click', () => {
    formContainer.classList.add('hidden');
    supplyItems = [];
    renderSupplyItemsTable();
  });

  document.getElementById('btn-add-supply-item').addEventListener('click', () => {
    const code = sanitizeText(document.getElementById('sup-item-code').value);
    const desc = sanitizeText(document.getElementById('sup-item-desc').value);
    const qty = parseFloat(document.getElementById('sup-item-qty').value);
    const price = parseFloat(document.getElementById('sup-item-price').value);

    if (!desc || !isValidPositiveNumber(qty) || isNaN(price) || price < 0) {
      alert('Por favor ingrese descripción, cantidad válida y precio unitario.');
      return;
    }

    supplyItems.push({
      item_code: code,
      description: desc,
      quantity: qty,
      unit_price: price
    });

    document.getElementById('sup-item-code').value = '';
    document.getElementById('sup-item-desc').value = '';
    document.getElementById('sup-item-qty').value = '';
    document.getElementById('sup-item-price').value = '';

    renderSupplyItemsTable();
  });

  document.getElementById('supplies-req-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (supplyItems.length === 0) {
      alert('Debe agregar al menos un ítem al pedido de suministros.');
      return;
    }

    const originType = originSelect.value;
    if (originType === 'especial_ventas' && !carteraCheck.checked) {
      alert('Según el procedimiento S-PR-1, no se puede continuar con la orden si el pedido está retenido por Cartera.');
      return;
    }

    let supplierId = supplierSelect.value;

    try {
      if (supplierId === 'NEW') {
        const nit = sanitizeText(document.getElementById('sup-nit').value);
        const company_name = sanitizeText(document.getElementById('sup-company').value);
        const newSup = await suppliersService.createSupplier({
          nit,
          company_name,
          payment_terms: document.getElementById('sup-advance-payment').value === 'SI' ? 'anticipo' : 'credito',
          is_approved: false
        });
        supplierId = newSup.id;
      }

      const reqAdvance = document.getElementById('sup-advance-payment').value === 'SI';
      const supplierDelivers = document.getElementById('sup-shipping').value === 'SI';
      const originDoc = sanitizeText(document.getElementById('sup-doc-ref').value);
      const totalAmount = supplyItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
      const initialStatus = reqAdvance ? 'anticipo_en_tramite' : 'aprobacion_pendiente';

      await ordersService.createOrder({
        request_type: originType,
        origin_doc_ref: originDoc,
        total_amount: totalAmount,
        supplier_id: supplierId,
        requires_advance_payment: reqAdvance,
        supplier_delivers: supplierDelivers,
        cartera_approved: originType === 'especial_ventas' ? true : null,
        status: initialStatus
      }, supplyItems);

      document.getElementById('supplies-req-form').reset();
      formContainer.classList.add('hidden');
      newSupplierBox.classList.add('hidden');
      carteraBox.classList.add('hidden');
      supplyItems = [];
      renderSupplyItemsTable();

      await populateSuppliersSelect();
      await loadAnalistaTable();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  await loadAnalistaTable();
}

function renderSupplyItemsTable() {
  const tbody = document.getElementById('supply-items-table-body');
  const totalEl = document.getElementById('total-supply-amount');

  if (supplyItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No se han agregado ítems.</td></tr>`;
    totalEl.innerText = formatCurrency(0);
    return;
  }

  let grandTotal = 0;
  tbody.innerHTML = supplyItems.map((item, idx) => {
    const subtotal = item.quantity * item.unit_price;
    grandTotal += subtotal;
    return `
      <tr>
        <td>${item.item_code || 'N/A'}</td>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unit_price)}</td>
        <td>${formatCurrency(subtotal)}</td>
        <td><button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; color:var(--danger);" onclick="removeSupplyItem(${idx})">&times;</button></td>
      </tr>
    `;
  }).join('');

  totalEl.innerText = formatCurrency(grandTotal);
}

window.removeSupplyItem = function(index) {
  supplyItems.splice(index, 1);
  renderSupplyItemsTable();
};

async function populateSuppliersSelect() {
  const select = document.getElementById('sup-supplier');
  try {
    const suppliers = await suppliersService.getSuppliers();
    select.innerHTML = `
      <option value="">Seleccione o registre...</option>
      <option value="NEW">+ Registrar Proveedor Nuevo (S-PR-10)</option>
      ${suppliers.map(s => `<option value="${s.id}">${s.company_name} (NIT: ${s.nit})</option>`).join('')}
    `;
  } catch (err) {
    console.error(err);
  }
}

async function loadAnalistaTable() {
  const tbody = document.getElementById('analista-table-body');
  try {
    const orders = await ordersService.fetchOrders();
    const supplyOrders = orders.filter(o => o.request_type !== 'administrativa');

    if (supplyOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No hay compras de suministros registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = supplyOrders.map(o => `
      <tr>
        <td><strong>${o.id.slice(0, 8)}</strong></td>
        <td><span class="badge badge-info">${o.request_type.replace('_', ' ')}</span></td>
        <td>${o.origin_doc_ref || 'N/A'}</td>
        <td>${formatCurrency(o.total_amount)}</td>
        <td>${o.requires_advance_payment ? '⚠️ Requiere Anticipo' : 'No'}</td>
        <td><span class="badge ${o.status === 'aprobacion_pendiente' ? 'badge-pending' : 'badge-success'}">${getStatusLabel(o.status)}</span></td>
        <td>
          <div style="display: flex; gap: 0.3rem;">
            <button class="btn btn-secondary" style="font-size:0.75rem;" onclick="showOrderModal('${o.id}')">Ver Detalle</button>
            ${o.status === 'anticipo_en_tramite'
              ? `<button class="btn btn-primary" style="font-size:0.75rem;" onclick="confirmAdvancePayment('${o.id}')">Confirmar Pago</button>`
              : ''}
            ${['radicado', 'aprobacion_pendiente', 'anticipo_en_tramite'].includes(o.status)
              ? `<button class="btn btn-secondary" style="font-size:0.75rem; color:var(--danger); border-color:var(--danger);" onclick="handleDeleteOrder('${o.id}')">Eliminar</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.confirmAdvancePayment = async function(orderId) {
  try {
    await ordersService.updateStatus(orderId, 'aprobacion_pendiente');
    initAnalistaView();
  } catch (err) {
    alert('Error al confirmar anticipo: ' + err.message);
  }
};