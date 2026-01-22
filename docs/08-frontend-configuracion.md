🎨 FRONTEND CONFIGURATION
frontend/package.json
json{
  "name": "culinaryos-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@supabase/supabase-js": "^2.39.3",
    "@tanstack/react-query": "^5.17.19",
    "axios": "^1.6.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "html5-qrcode": "^2.3.8",
    "lucide-react": "^0.312.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.3",
    "react-router-dom": "^6.21.3",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.1",
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.33",
    "prettier": "^3.2.4",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^1.2.1"
  }
}


Continuaré en el siguiente mensaje con:


Frontend configuración (vite.config, tailwind, etc.)
Componentes base
GitHub Actions
Sprint 01 detallado


¿Continúo?Si0:242 / 2🏗️ ARQUITECTURA COMPLETA - PARTE 3


🎨 FRONTEND CONFIGURATION (Continuación)
frontend/vite.config.ts
typescriptimport { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
});


frontend/tsconfig.json
json{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"],
      "@/config/*": ["./src/config/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}


frontend/tsconfig.node.json
json{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}


frontend/tailwind.config.js
javascript/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};


frontend/postcss.config.js
javascriptexport default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};


frontend/.env.example
env# =====================================================
# CULINARYOS FRONTEND - ENVIRONMENT VARIABLES
# =====================================================


# API
VITE_API_URL=http://localhost:3001/api/v1


# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key


# App Config
VITE_APP_NAME=CulinaryOS
VITE_APP_VERSION=1.0.0


# Features (toggle on/off)
VITE_FEATURE_QR_SCANNER=true
VITE_FEATURE_CSV_IMPORT=true


frontend/index.html
html<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="CulinaryOS - Sistema de gestión de cocinas profesionales" />
    <title>CulinaryOS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>


frontend/src/main.tsx
tsximport React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);


frontend/src/App.tsx
tsximport { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';


// Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Dashboard from '@/pages/Dashboard';
import Ingredients from '@/pages/Ingredients';
import Suppliers from '@/pages/Suppliers';
import Events from '@/pages/Events';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Kitchen from '@/pages/Kitchen';
import Settings from '@/pages/Settings';


function App() {
  const { isAuthenticated } = useAuthStore();


  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />


        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/events" element={<Events />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/settings" element={<Settings />} />
        </Route>


        {/* Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>


      <Toaster />
    </>
  );
}


export default App;


frontend/src/styles/globals.css
css@tailwind base;
@tailwind components;
@tailwind utilities;


@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }


  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}


@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}


/* Mobile-First Utilities */
@layer utilities {
  .touch-action-none {
    touch-action: none;
  }
  
  .btn-large {
    @apply min-h-[56px] text-lg px-6;
  }
  
  .input-large {
    @apply min-h-[56px] text-lg;
  }
}


/* Countdown Widget Animations */
@keyframes pulse-red {
  0%, 100% {
    background-color: rgb(239 68 68);
    transform: scale(1);
  }
  50% {
    background-color: rgb(220 38 38);
    transform: scale(1.05);
  }
}


.countdown-urgent {
  animation: pulse-red 1.5s ease-in-out infinite;
}


/* Scanner Overlay */
.scanner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
}


frontend/src/config/supabase.ts
typescriptimport { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);


frontend/src/config/constants.ts
typescriptexport const APP_CONFIG = {
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


frontend/src/lib/utils.ts
typescriptimport { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}


export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}


export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}


export function calculateTimeUntil(targetTime: string): {
  hours: number;
  minutes: number;
  isPast: boolean;
} {
  const now = new Date();
  const [hours, minutes] = targetTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);


  const diff = target.getTime() - now.getTime();
  const isPast = diff < 0;


  const totalMinutes = Math.abs(Math.floor(diff / 1000 / 60));


  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    isPast,
  };
}


export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Not Sunday or Saturday
}


export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;


  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      addedDays++;
    }
  }


  return result;
}


frontend/src/stores/authStore.ts
typescriptimport { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/config/constants';


interface User {
  id: string;
  email: string;
  name: string;
}


interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}


export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,


      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),


      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);


frontend/src/services/api.ts
typescriptimport axios, { AxiosInstance } from 'axios';
import { APP_CONFIG } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';


class ApiService {
  private axiosInstance: AxiosInstance;


  constructor() {
    this.axiosInstance = axios.create({
      baseURL: APP_CONFIG.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });


    // Request interceptor: add token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );


    // Response interceptor: handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }


  get instance() {
    return this.axiosInstance;
  }
}


export const api = new ApiService().instance;


frontend/src/services/auth.service.ts
typescriptimport { api } from './api';


export interface RegisterData {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}


export interface LoginData {
  email: string;
  password: string;
}


export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  organization?: {
    id: string;
    name: string;
    plan: string;
  };
}


export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },


  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },


  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};


frontend/src/routes/ProtectedRoute.tsx
tsximport { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';


export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }


  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}


frontend/src/components/layout/MainLayout.tsx
tsximport { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';


interface MainLayoutProps {
  children: ReactNode;
}


export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <Sidebar />
      </aside>


      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="container mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}


frontend/src/components/layout/Header.tsx
tsximport { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


export function Header() {
  const { user, logout } = useAuthStore();


  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </Button>


        {/* Logo */}
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">🍳</span>
          <span className="hidden sm:inline">CulinaryOS</span>
        </div>


        {/* Spacer */}
        <div className="flex-1" />


        {/* Actions */}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>


        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


frontend/src/components/layout/Sidebar.tsx
tsximport { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Truck,
  Calendar,
  ShoppingCart,
  ChefHat,
  Settings,
} from 'lucide-react';


const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ingredientes', href: '/ingredients', icon: Package },
  { name: 'Proveedores', href: '/suppliers', icon: Truck },
  { name: 'Eventos', href: '/events', icon: Calendar },
  { name: 'Órdenes de Compra', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Cocina', href: '/kitchen', icon: ChefHat },
  { name: 'Configuración', href: '/settings', icon: Settings },
];


export function Sidebar() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
