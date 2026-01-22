export const APP_CONFIG = {
    name: import.meta.env.VITE_APP_NAME || 'CulinaryOS',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
} as const;

export const FEATURES = {
    qrScanner: import.meta.env.VITE_FEATURE_QR_SCANNER === 'true',
    csvImport: import.meta.env.VITE_FEATURE_CSV_IMPORT === 'true',
} as const;

export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    INGREDIENTS: '/ingredients',
    SUPPLIERS: '/suppliers',
    EVENTS: '/events',
    PURCHASE_ORDERS: '/purchase-orders',
    KITCHEN: '/kitchen',
    SETTINGS: '/settings',
} as const;

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'culinaryos_token',
    USER_DATA: 'culinaryos_user',
} as const;

// Safety Buffer Presets (matching backend)
export const SAFETY_BUFFERS = {
    VEGETABLES: 1.15,
    MEATS: 1.05,
    DAIRY: 1.08,
    DRY_GOODS: 1.10,
    BEVERAGES: 1.02,
    DEFAULT: 1.10,
} as const;
