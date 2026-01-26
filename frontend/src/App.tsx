import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Core Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ingredients = lazy(() => import('./pages/Ingredients'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Events = lazy(() => import('./pages/Events'));
const OccupancyPage = lazy(() => import('./pages/Occupancy'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const OCRReconciliation = lazy(() => import('./pages/OCRReconciliation'));
const Production = lazy(() => import('./pages/Production'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Waste = lazy(() => import('./pages/Waste'));
const HR = lazy(() => import('./pages/HR'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Settings = lazy(() => import('./pages/Settings'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryReception = lazy(() => import('./pages/inventory/Reception'));
const InventoryExpiry = lazy(() => import('./pages/inventory/Expiry'));
const InventoryStockOut = lazy(() => import('./pages/inventory/StockOut'));
const InventoryLocations = lazy(() => import('./pages/inventory/Locations'));
const InventoryCycleCounts = lazy(() => import('./pages/inventory/CycleCounts'));
const InventoryStock = lazy(() => import('./pages/inventory/Stock'));
const Alerts = lazy(() => import('./pages/Alerts'));
const StaffPage = lazy(() => import('./pages/schedule/Staff'));
const TimeOffPage = lazy(() => import('./pages/schedule/TimeOff'));
const SchedulePage = lazy(() => import('./pages/schedule/Schedule'));
const PreparationBatchesPage = lazy(() => import('./pages/preparations/Batches'));

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <>
            <Toaster />
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route
                        path="/login"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
                    />
                    <Route
                        path="/register"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
                    />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/ingredients" element={<Ingredients />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/events/occupancy" element={<OccupancyPage />} />
                        <Route path="/purchase-orders" element={<PurchaseOrders />} />
                        <Route path="/albaranes" element={<OCRReconciliation />} />
                        <Route path="/production" element={<Production />} />
                        <Route path="/kitchen" element={<Kitchen />} />
                        <Route path="/waste" element={<Waste />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/inventory/reception" element={<InventoryReception />} />
                        <Route path="/inventory/stock" element={<InventoryStock />} />
                        <Route path="/inventory/expiry" element={<InventoryExpiry />} />
                        <Route path="/inventory/stock-out" element={<InventoryStockOut />} />
                        <Route path="/inventory/locations" element={<InventoryLocations />} />
                        <Route path="/inventory/cycle-counts" element={<InventoryCycleCounts />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/staff" element={<StaffPage />} />
                        <Route path="/time-off" element={<TimeOffPage />} />
                        <Route path="/schedule" element={<SchedulePage />} />
                        <Route path="/preparations" element={<PreparationBatchesPage />} />
                        <Route path="/preparations/batches" element={<PreparationBatchesPage />} />
                        <Route path="/hr" element={<HR />} />
                        <Route path="/organizations" element={<Organizations />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                    <Route
                        path="/"
                        element={
                            <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
                        }
                    />
                </Routes>
            </Suspense>
        </>
    );
}

export default App;
