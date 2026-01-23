import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Core Pages
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import Suppliers from './pages/Suppliers';
import Events from './pages/Events';
import OccupancyPage from './pages/Occupancy';
import PurchaseOrders from './pages/PurchaseOrders';
import OCRReconciliation from './pages/OCRReconciliation';
import Production from './pages/Production';
import Kitchen from './pages/Kitchen';
import Waste from './pages/Waste';
import HR from './pages/HR';
import Organizations from './pages/Organizations';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import InventoryReception from './pages/inventory/Reception';
import InventoryExpiry from './pages/inventory/Expiry';
import InventoryStockOut from './pages/inventory/StockOut';
import InventoryLocations from './pages/inventory/Locations';
import InventoryCycleCounts from './pages/inventory/CycleCounts';
import InventoryStock from './pages/inventory/Stock';
import Alerts from './pages/Alerts';
import StaffPage from './pages/schedule/Staff';
import TimeOffPage from './pages/schedule/TimeOff';
import SchedulePage from './pages/schedule/Schedule';
import PreparationsCatalogPage from './pages/preparations/Catalog';
import PreparationBatchesPage from './pages/preparations/Batches';

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <>
            <Toaster />
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
                    <Route path="/preparations" element={<PreparationsCatalogPage />} />
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
        </>
    );
}

export default App;
