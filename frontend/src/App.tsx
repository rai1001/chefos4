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
import PurchaseOrders from './pages/PurchaseOrders';
import OCRReconciliation from './pages/OCRReconciliation';
import Production from './pages/Production';
import Kitchen from './pages/Kitchen';
import Waste from './pages/Waste';
import HR from './pages/HR';
import Organizations from './pages/Organizations';
import Settings from './pages/Settings';

function App() {
    const { user, isAuthenticated } = useAuthStore();

    console.log('App Rendering - Testing Auth & Routing', { isAuthenticated, user });

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
                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/albaranes" element={<OCRReconciliation />} />
                    <Route path="/production" element={<Production />} />
                    <Route path="/kitchen" element={<Kitchen />} />
                    <Route path="/waste" element={<Waste />} />
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
