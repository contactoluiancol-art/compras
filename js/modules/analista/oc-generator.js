import { ordersService } from '../../services/orders.service.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export async function printPurchaseOrder(orderId) {
  try {
    const order = await ordersService.getOrderDetails(orderId);

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Orden de Compra - ${order.origin_doc_ref || order.id.slice(0, 8)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0052cc; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; color: #0052cc; margin: 0; }
          .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f5f7; }
          .total-row { font-weight: bold; text-align: right; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
          .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-weight: bold; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>ELECTROINGENIERÍA S.A.S.</h1>
            <p>NIT: 900.123.456-7 | Procedimiento S-IN-17</p>
          </div>
          <div style="text-align: right;">
            <h2>ORDEN DE COMPRA</h2>
            <p><strong>N°:</strong> ${order.origin_doc_ref || order.id.slice(0, 8)}</p>
            <p><strong>Fecha:</strong> ${formatDate(order.created_at)}</p>
          </div>
        </div>

        <div class="meta-box">
          <div class="box">
            <h4>DATOS DEL PROVEEDOR</h4>
            <p><strong>Razón Social:</strong> ${order.suppliers ? order.suppliers.company_name : 'N/A'}</p>
            <p><strong>NIT:</strong> ${order.suppliers ? order.suppliers.nit : 'N/A'}</p>
            <p><strong>Condiciones de Pago:</strong> ${order.requires_advance_payment ? 'Anticipo' : 'Crédito'}</p>
          </div>
          <div class="box">
            <h4>DETALLES DE DESPACHO</h4>
            <p><strong>Entrega:</strong> ${order.supplier_delivers ? 'Proveedor entrega en destino' : 'Recogida por Electroingeniería'}</p>
            <p><strong>Solicitante:</strong> ${order.profiles ? order.profiles.full_name : 'N/A'}</p>
            <p><strong>Tipo:</strong> ${order.request_type.toUpperCase()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción del Suministro / Servicio</th>
              <th>Cantidad</th>
              <th>Valor Unitario</th>
              <th>Valor Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items && order.items.length > 0 
              ? order.items.map(it => `
                <tr>
                  <td>${it.item_code || '-'}</td>
                  <td>${it.description}</td>
                  <td>${it.quantity}</td>
                  <td>${formatCurrency(it.unit_price)}</td>
                  <td>${formatCurrency(it.quantity * it.unit_price)}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="5" style="text-align:center;">Sin ítems desglosados</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="total-row">TOTAL ORDEN DE COMPRA:</td>
              <td style="font-weight: bold;">${formatCurrency(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line">Aprobado por: Jefatura de Compras</div>
          </div>
          <div>
            <div class="sig-line">Recibido / Aceptado por Proveedor</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #0052cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Imprimir / Guardar PDF</button>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
  } catch (err) {
    alert('Error al generar la orden imprimible: ' + err.message);
  }
}

window.printPurchaseOrder = printPurchaseOrder;