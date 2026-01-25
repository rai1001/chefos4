import { Navigate, Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Spinner } from '@/components/ui/spinner';

export function ProtectedRoute() {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <MainLayout>
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner size="lg" /></div>}>
                <Outlet />
            </Suspense>
        </MainLayout>
    );
}
