# 👨‍🍳 ChefOS - Sistema de Gestión de Cocinas

ChefOS es una plataforma integral para la gestión eficiente de cocinas profesionales, optimizando desde la planificación de menús hasta las compras y el control de inventario.

## 🚀 Características Principales

*   **Gestión de Inventario Inteligente**: Control de stock en tiempo real, alertas de caducidad y escaneo de códigos de barras.
*   **Planificación de Producción**: Generación automática de listas de preparación basadas en eventos y reservas.
*   **Compras Automatizadas**: Cálculo de necesidades de compra con márgenes de seguridad (`safety buffers`) configurables por familia de productos.
*   **Gestión de Recetas**: Costeo dinámico, escalado de porciones y control de alérgenos.
*   **Gestión de Personal**: Horarios, control de asistencia y asignación de tareas.

## 🛠️ Stack Tecnológico

### Backend
*   **Node.js & Express**: API RESTful robusta.
*   **Supabase (PostgreSQL)**: Base de datos relacional y autenticación.
*   **TypeScript**: Tipado estático para mayor seguridad y mantenibilidad.
*   **Jest/Vitest**: Suites de pruebas unitarias y de integración.

### Frontend
*   **React**: Biblioteca de UI construida con componentes.
*   **TypeScript**: Lógica de cliente tipada.
*   **TailwindCSS**: Estilizado moderno y responsivo.

## 📦 Instalación y Uso

### Prerrequisitos
*   Node.js (v18+)
*   Cuenta de Supabase configurada

### Configuración Backend

1.  Navegar a la carpeta backend:
    ```bash
    cd backend
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Configurar variables de entorno (`.env`):
    ```env
    PORT=3000
    SUPABASE_URL=your_supabase_url
    SUPABASE_KEY=your_supabase_key
    JWT_SECRET=your_secure_secret
    ```
4.  Iniciar servidor de desarrollo:
    ```bash
    npm run dev
    ```

### Configuración Frontend

1.  Navegar a la carpeta frontend:
    ```bash
    cd frontend
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Iniciar aplicación:
    ```bash
    npm run dev
    ```

## 🏗️ Arquitectura del Proyecto

```
/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Lógica de entrada/salida de la API
│   │   ├── services/      # Lógica de negocio compleja
│   │   ├── models/        # Definiciones de tipos y esquemas
│   │   ├── routes/        # Definición de endpoints
│   │   └── middleware/    # Auth, validación, logging
│   └── tests/             # Pruebas integradas
│
└── frontend/
    ├── src/
    │   ├── components/    # Componentes reutilizables UI
    │   ├── pages/         # Vistas principales
    │   ├── hooks/         # Lógica de estado reutilizable
    │   └── services/      # Comunicación con API backend
```

## 🔐 Seguridad

Este proyecto sigue las mejores prácticas de seguridad auditadas:
*   Autenticación vía **JWT** con validación estricta y expiración.
*   **Rate Limiting** en endpoints sensibles para prevenir fuerza bruta.
*   Validación de esquemas de entrada (Zod/Joi) para evitar inyecciones.
*   **Row Level Security (RLS)** en base de datos.

## 🤝 Contribución

Consulta la guía de desarrollo `DEVELOPMENT.md` para estándares de código y flujos de trabajo.
