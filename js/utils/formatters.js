export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusLabel = (status) => {
  const map = {
    radicado: 'Radicado',
    en_revision_cartera: 'En Revisión Cartera',
    en_cotizacion: 'En Cotización',
    aprobacion_pendiente: 'Pendiente Aprobación',
    oc_generada: 'OC Generada',
    anticipo_en_tramite: 'Anticipo en Trámite',
    en_transito: 'En Tránsito',
    novedad_reportada: 'Novedad Reportada',
    recibido_almacen: 'Recibido en Almacén',
    entregado_cliente: 'Entregado al Cliente',
    facturado: 'Facturado',
    cancelado: 'Cancelado'
  };
  return map[status] || status;
};