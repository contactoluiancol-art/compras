import { ordersService } from '../../services/orders.service.js';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/formatters.js';

export async function showOrderModal(orderId) {
  try {
    const order = await ordersService.getOrderDetails(orderId);
    
    // Remover modal previo si existe
    const existingModal = document.getElementById('active-order-modal');
    if (existingModal) existingModal.remove();

    const modalDiv = document.createElement('div');
    modalDiv.id = 'active-order-modal';
    modalDiv.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(9, 30, 66, 0.54); backdrop-filter: blur(6px);
      display: flex; justify-content: center; align-items: center; z-index: 1000;
      opacity: 0; transition: opacity 0.2s ease-in-out;
    `;

    modalDiv.innerHTML = `
      <div style="background: #ffffff; padding: 2.2rem; border-radius: 16px; max-width: 700px; width: 92%; max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(9, 30, 66, 0.25); transform: translateY(15px); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);" id="modal-card-content">
        
        <!-- Header del Modal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1.5px solid var(--border-color); padding-bottom: 1rem;">
          <div>
            <span class="badge badge-info" style="margin-bottom: 0.4rem;">${order.request_type.replace('_', ' ').toUpperCase()}</span>
            <h3 style="color: var(--text-title); font-size: 1.45rem; font-weight: 800; letter-spacing: -0.5px;">${order.origin_doc_ref || order.id.slice(0, 8)}</h3>
          </div>
          <button id="btn-close-modal" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 1.2rem; line-height: 1; border-radius: 8px;">&times;</button>
        </div>

        <!-- Grid de Información General -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1.2rem; border-radius: 12px; font-size: 0.88rem; border: 1px solid var(--border-color);">
          <p><strong style="color: var(--text-muted);">Estado:</strong> <span class="badge badge-pending" style="margin-left: 0.3rem;">${getStatusLabel(order.status)}</span></p>
          <p><strong style="color: var(--text-muted);">Proveedor:</strong> <span style="font-weight: 600; color: var(--text-title);">${order.suppliers ? order.suppliers.company_name : 'No asignado'}</span></p>
          <p><strong style="color: var(--text-muted);">NIT:</strong> <span style="font-family: var(--font-mono); font-weight: 600;">${order.suppliers ? order.suppliers.nit : 'N/A'}</span></p>
          <p><strong style="color: var(--text-muted);">Solicitante:</strong> <span style="font-weight: 600;">${order.profiles ? order.profiles.full_name : 'N/A'}</span></p>
          <p><strong style="color: var(--text-muted);">Fecha Registro:</strong> ${formatDate(order.created_at)}</p>
          <p><strong style="color: var(--text-muted);">Anticipo Requerido:</strong> <span style="font-weight: 700; color: ${order.requires_advance_payment ? 'var(--warning)' : 'var(--text-dark)'};">${order.requires_advance_payment ? 'SÍ (T-PR-6)' : 'NO'}</span></p>
          <div style="grid-column: span 2; border-top: 1px dashed var(--border-color); padding-top: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--text-title); font-size: 0.95rem;">Monto Total Consolidado:</strong>
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        <!-- Tabla de Ítems Desglosados -->
        <h4 style="margin-bottom: 0.8rem; font-size: 0.95rem; font-weight: 700; color: var(--text-title);">Ítems y Materiales Solicitados</h4>
        <div class="table-responsive" style="margin-top: 0;">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items && order.items.length > 0 
                ? order.items.map(it => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">${it.item_code || '-'}</td>
                    <td style="font-weight: 500;">${it.description}</td>
                    <td><strong>${it.quantity}</strong></td>
                    <td>${formatCurrency(it.unit_price)}</td>
                    <td style="font-weight: 700; color: var(--text-title);">${formatCurrency(it.quantity * it.unit_price)}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Sin desglose de ítems</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    // Animación suave de entrada
    requestAnimationFrame(() => {
      modalDiv.style.opacity = '1';
      const card = document.getElementById('modal-card-content');
      if (card) card.style.transform = 'translateY(0)';
    });

    // Cerrar al pulsar el botón "X"
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);

    // Cerrar al hacer clic en el backdrop oscuro
    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) closeModal();
    });

    function closeModal() {
      modalDiv.style.opacity = '0';
      const card = document.getElementById('modal-card-content');
      if (card) card.style.transform = 'translateY(15px)';
      setTimeout(() => modalDiv.remove(), 200);
    }

  } catch (err) {
    alert('Error cargando detalles: ' + err.message);
  }
}

window.showOrderModal = showOrderModal;