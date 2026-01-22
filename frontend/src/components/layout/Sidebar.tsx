import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Package,
    Truck,
    Calendar,
    ShoppingCart,
    FileText,
    ChefHat,
    Layers,
    Settings,
    Trash2,
    Users,
    Hotel,
    ClipboardList,
    CalendarClock,
    ScanBarcode,
    MapPin,
    CalendarDays,
    CalendarOff,
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Ingredientes', href: '/ingredients', icon: Package },
    { name: 'Proveedores', href: '/suppliers', icon: Truck },
    { name: 'Eventos', href: '/events', icon: Calendar },
    { name: 'Órdenes de Compra', href: '/purchase-orders', icon: ShoppingCart },
    { name: 'Albaranes (OCR)', href: '/albaranes', icon: FileText },
    { name: 'Inventario - Recepción', href: '/inventory/reception', icon: ClipboardList },
    { name: 'Inventario - Caducidades', href: '/inventory/expiry', icon: CalendarClock },
    { name: 'Inventario - Salidas', href: '/inventory/stock-out', icon: ScanBarcode },
    { name: 'Inventario - Ubicaciones', href: '/inventory/locations', icon: MapPin },
    { name: 'Producción', href: '/production', icon: Layers },
    { name: 'Cocina', href: '/kitchen', icon: ChefHat },
    { name: 'Mermas', href: '/waste', icon: Trash2 },
    { name: 'Equipo', href: '/staff', icon: Users },
    { name: 'Ausencias', href: '/time-off', icon: CalendarOff },
    { name: 'Horario', href: '/schedule', icon: CalendarDays },
    { name: 'Personal', href: '/hr', icon: Users },
    { name: 'Hoteles', href: '/organizations', icon: Hotel },
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
