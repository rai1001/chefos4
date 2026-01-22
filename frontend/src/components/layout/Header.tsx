import { Menu, User } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
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
                <NotificationBell />

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="User menu" data-testid="user-menu-button">
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
