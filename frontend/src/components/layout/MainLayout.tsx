import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
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
