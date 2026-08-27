# Sistema de Gestión Logística y Compras — Electroingeniería S.A.S.

Sistema web integral de compras, inventario y aprovisionamiento basado en la parametrización de procedimientos internos (`S-PR-1`, `S-PR-16`, `S-IN-17`, `S-PR-10`, `T-PR-6`). Diseñado bajo una arquitectura modular en JavaScript vainilla con backend desacoplado en Supabase, seguridad RLS por roles y una interfaz moderna *Split Screen* con transiciones de desbloqueo de alta seguridad.

---

## 🚀 Características Principales

### 1. Procedimientos y Flujos Operativos Implementados
* **S-PR-1 (Suministros Eléctricos):** Gestión de reposición por rotación, quiebres de stock en logística (`S-IN-3`) y pedidos especiales con validación de retención en Cartera.
* **S-PR-16 (Compras Administrativas):** Diligenciamiento y radicación de compras de oficina con selección de modalidad (crédito vs. pago en línea con tarjeta de crédito).
* **S-PR-10 (Onboarding de Proveedores):** Registro dinámico de proveedores nuevos durante el proceso de radicación si no se encuentran en el catálogo homologado.
* **T-PR-6 (Gestión de Anticipos):** Detección y enrutamiento de órdenes que requieren desembolso previo antes de la emisión de la Orden de Compra.
* **S-IN-17 (Generador Oficial de OC):** Emisión y renderizado imprimible de órdenes de compra con cálculo automático de ítems, totales e interfaces de firma.
* **Monitoreo & Novedades (S-PR-1 Pág. 3):** Registro de incidencias en tránsito, impacto al cliente, entrada ERP (`S-IN-2`) y control de sobrecostos logísticos (`S-IN-18`).

### 2. Seguridad y Arquitectura de Datos
* **Aislamiento por RLS (Row Level Security):** Políticas a nivel de fila en PostgreSQL para garantizar que Auxiliares y Analistas solo visualicen y gestionen sus propios registros, mientras Jefatura mantiene acceso de auditoría total.
* **Capacidad de Eliminación Condicional:** Los creadores pueden suprimir requisiciones únicamente en estados iniciales (`radicado`, `aprobacion_pendiente`, `anticipo_en_tramite`), mientras Jefatura tiene facultades de eliminación global.
* **Supabase Realtime:** Sincronización bidireccional vía WebSockets; las radicaciones, aprobaciones o cancelaciones se reflejan al instante en todos los tableros activos sin recargar.
* **Sanitización & Validación:** Limpieza de entradas contra inyecciones y formateo estandarizado de moneda colombiana (COP) y fechas.

### 3. Experiencia Visual (UI/UX)
* **Split Screen Login:** División balanceada con panel institucional azul eléctrico y formulario de acceso.
* **Transición "Access Granted" / Vault Unlock:** Intersticial cinematográfico de autenticación con escaneo biométrico simulado, feedback de rol y barra de progreso.
* **Modern Dashboard:** Tipografía *Plus Jakarta Sans*, tarjetas de KPI elevadas, tablas de alto contraste con etiquetas de estado y modal de detalle (*glassmorphism*).

---

## 🛠️ Stack Tecnológico

* **Frontend:** HTML5 semántico, CSS3 modular (Variables CSS, Flexbox, Grid, Glassmorphism), JavaScript ES6 Modules.
* **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, GoTrue Auth, Realtime Engine, Row Level Security).
* **Tipografías:** Plus Jakarta Sans & JetBrains Mono.

---

## 📂 Estructura del Proyecto

```text
├── index.html                     # Punto de entrada y layout de vistas
├── css/
│   ├── base.css                   # Variables de diseño, reset y tipografía
│   ├── components.css             # Botones, tablas, inputs y badges
│   └── views.css                  # Layouts, Split Screen login y overlay de acceso
└── js/
    ├── app.js                     # Orquestador principal, autenticación y Realtime
    ├── config/
    │   └── supabase.js            # Inicialización del cliente Supabase
    ├── services/
    │   ├── auth.service.js        # Manejo de sesiones y perfiles
    │   ├── orders.service.js      # CRUD de órdenes e ítems
    │   └── suppliers.service.js   # Catálogo y registro de proveedores
    ├── utils/
    │   ├── formatters.js          # Moneda (COP), fechas y etiquetas
    │   └── validators.js          # Sanitización y validación de entradas
    └── modules/
        ├── auxiliar/
        │   ├── req-admin.js       # Compras Administrativas (S-PR-16)
        │   └── monitoring.js      # Monitoreo de envíos y novedades
        ├── analista/
        │   ├── supplies.js        # Compras de Suministros (S-PR-1)
        │   ├── special-req.js     # Modal visor de órdenes y desglose
        │   └── oc-generator.js    # Formato imprimible oficial (S-IN-17)
        └── jefe/
            └── dashboard.js       # Mesa de control, KPIs y aprobaciones


-- 1. Tablas Principales
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('auxiliar', 'analista', 'jefe')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nit TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  payment_terms TEXT DEFAULT 'credito',
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  supplier_id UUID REFERENCES suppliers(id),
  request_type TEXT NOT NULL,
  origin_doc_ref TEXT,
  total_amount NUMERIC(14, 2) DEFAULT 0,
  requires_advance_payment BOOLEAN DEFAULT false,
  supplier_delivers BOOLEAN DEFAULT true,
  cartera_approved BOOLEAN DEFAULT NULL,
  status TEXT DEFAULT 'aprobacion_pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL
);

-- 2. Habilitar Seguridad RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso (RLS)
CREATE POLICY "RLS_PO_Select" ON purchase_orders FOR SELECT
USING (
  created_by = auth.uid() OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'jefe'
);

CREATE POLICY "RLS_PO_Insert" ON purchase_orders FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "RLS_PO_Update" ON purchase_orders FOR UPDATE
USING (
  created_by = auth.uid() OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'jefe'
);

CREATE POLICY "RLS_PO_Delete" ON purchase_orders FOR DELETE
USING (
  (created_by = auth.uid() AND status IN ('radicado', 'aprobacion_pendiente', 'anticipo_en_tramite')) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'jefe'
);

-- 4. Activar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;


export const SUPABASE_URL = '[https://TU-PROYECTO.supabase.co](https://TU-PROYECTO.supabase.co)';
export const SUPABASE_ANON_KEY = 'TU-ANON-KEY-PUBLICA';