import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProtectedRoute() {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <MainLayout>
            <Suspense fallback={<LoadingSpinner />}>
                <Outlet />
            </Suspense>
        </MainLayout>
    );
}
