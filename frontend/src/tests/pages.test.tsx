import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import Ingredients from '@/pages/Ingredients';
import Suppliers from '@/pages/Suppliers';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Kitchen from '@/pages/Kitchen';
import WastePage from '@/pages/Waste';
import Production from '@/pages/Production';
import Organizations from '@/pages/Organizations';
import HRManagement from '@/pages/HR';
import OCRReconciliation from '@/pages/OCRReconciliation';
import Settings from '@/pages/Settings';

const apiMock = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

const eventsHookMock = vi.hoisted(() => ({
    useEvents: vi.fn(),
}));

const suppliersHookMock = vi.hoisted(() => ({
    useSuppliers: vi.fn(),
}));

const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
    useLowStockIngredients: vi.fn(),
}));

const wasteServiceMock = vi.hoisted(() => ({
    getStats: vi.fn(),
}));

vi.mock('@/services/api', () => ({ api: apiMock }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/hooks/useEvents', () => ({ useEvents: eventsHookMock.useEvents }));
vi.mock('@/hooks/useSuppliers', () => ({ useSuppliers: suppliersHookMock.useSuppliers }));
vi.mock('@/hooks/useIngredients', () => ({
    useIngredients: ingredientsHookMock.useIngredients,
    useLowStockIngredients: ingredientsHookMock.useLowStockIngredients,
}));
vi.mock('@/services/waste.service', () => ({ wasteService: wasteServiceMock }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'user-1', name: 'Test User' } }) }));

vi.mock('@/components/events/EventCalendar', () => ({
    EventCalendar: () => <div>EventCalendar</div>,
}));
vi.mock('@/components/events/EventForm', () => ({
    EventForm: () => <div>EventForm</div>,
}));
vi.mock('@/components/events/EventImportDialog', () => ({
    EventImportDialog: ({ open }: { open?: boolean }) => <div>EventImportDialog {String(open)}</div>,
}));
vi.mock('@/components/ingredients/IngredientsList', () => ({
    IngredientsList: () => <div>IngredientsList</div>,
}));
vi.mock('@/components/ingredients/IngredientForm', () => ({
    IngredientForm: () => <div>IngredientForm</div>,
}));
vi.mock('@/components/ingredients/CSVImportWizard', () => ({
    CSVImportWizard: () => <div>CSVImportWizard</div>,
}));
vi.mock('@/components/suppliers/SupplierForm', () => ({
    SupplierForm: () => <div>SupplierForm</div>,
}));
vi.mock('@/components/suppliers/SupplierCountdown', () => ({
    SupplierCountdown: () => <div>SupplierCountdown</div>,
}));
vi.mock('@/components/kitchen/QuickScanner', () => ({
    QuickScanner: () => <div>QuickScanner</div>,
}));
vi.mock('@/components/kitchen/StockOutForm', () => ({
    StockOutForm: () => <div>StockOutForm</div>,
}));
vi.mock('@/components/waste/WasteStats', () => ({
    WasteStats: () => <div>WasteStats</div>,
}));
vi.mock('@/components/waste/CreateWasteModal', () => ({
    CreateWasteModal: () => <div>CreateWasteModal</div>,
}));
vi.mock('@/components/production/ProductionGantt', () => ({
    ProductionGantt: ({ eventId }: { eventId?: string }) => <div>ProductionGantt {eventId || 'all'}</div>,
}));
vi.mock('@/components/webhooks/WebhooksManager', () => ({
    WebhooksManager: () => <div>WebhooksManager</div>,
}));

vi.mock('recharts', () => {
    const Mock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
    return {
        BarChart: Mock,
        Bar: Mock,
        XAxis: Mock,
        YAxis: Mock,
        CartesianGrid: Mock,
        Tooltip: Mock,
        ResponsiveContainer: Mock,
        PieChart: Mock,
        Pie: Mock,
        Cell: Mock,
        LineChart: Mock,
        Line: Mock,
        Legend: Mock,
    };
});

beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    eventsHookMock.useEvents.mockReset();
    suppliersHookMock.useSuppliers.mockReset();
    ingredientsHookMock.useIngredients.mockReset();
    ingredientsHookMock.useLowStockIngredients.mockReset();
    wasteServiceMock.getStats.mockReset();
    toastMock.mockReset();
});

describe('pages', () => {
    it('renders dashboard stats', async () => {
        apiMock.get.mockResolvedValueOnce({
            data: {
                kpis: { total_valuation: 1234, low_stock_count: 2, pending_pos: 3 },
                valuation: [],
                trends: [],
                foodCost: [],
            },
        });

        renderWithProviders(<Dashboard />);

        expect(screen.getByText('Cargando analíticas...')).toBeInTheDocument();
        expect(await screen.findByText('Panel de Control')).toBeInTheDocument();
        expect(screen.getByText('Valor Inventario')).toBeInTheDocument();
    });

    it('renders events page header and calendar', () => {
        renderWithProviders(<Events />);
        expect(screen.getByText('Eventos')).toBeInTheDocument();
        expect(screen.getByText('EventCalendar')).toBeInTheDocument();
        expect(screen.getByText(/EventImportDialog/)).toBeInTheDocument();
    });

    it('shows ingredients alert when low stock exists', () => {
        ingredientsHookMock.useIngredients.mockReturnValue({
            data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
            isLoading: false,
        });
        ingredientsHookMock.useLowStockIngredients.mockReturnValue({
            data: [{ id: 'low-1' }],
        });

        renderWithProviders(<Ingredients />);
        expect(screen.getByText('Ingredientes')).toBeInTheDocument();
        expect(screen.getByText(/tienen stock bajo el mínimo/i)).toBeInTheDocument();
        expect(screen.getByText('IngredientsList')).toBeInTheDocument();
    });

    it('renders suppliers list', () => {
        suppliersHookMock.useSuppliers.mockReturnValue({
            data: {
                data: [
                    {
                        id: 'sup-1',
                        name: 'Proveedor Uno',
                        contact_email: 'a@b.com',
                        contact_phone: '123',
                        lead_time_days: 2,
                        cut_off_time: '12:00',
                        delivery_days: [1, 2],
                    },
                ],
            },
            isLoading: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<Suppliers />);
        expect(screen.getByText('Proveedores')).toBeInTheDocument();
        expect(screen.getByText('Proveedor Uno')).toBeInTheDocument();
    });

    it('renders purchase orders page', () => {
        renderWithProviders(<PurchaseOrders />);
        expect(screen.getByText('Órdenes de Compra')).toBeInTheDocument();
        expect(screen.getByText('Borradores')).toBeInTheDocument();
    });

    it('opens kitchen dialogs', async () => {
        renderWithProviders(<Kitchen />);
        await userEvent.click(screen.getByText('Escáner Rápido'));
        expect(await screen.findByText('QuickScanner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await userEvent.click(screen.getByText('Salida Manual'));
        expect(await screen.findByText('StockOutForm')).toBeInTheDocument();
    });

    it('renders waste page and modal', async () => {
        wasteServiceMock.getStats.mockResolvedValueOnce([
            {
                created_at: new Date().toISOString(),
                ingredient_id: 'ing-1',
                ingredients: { name: 'Tomate', units: { abbreviation: 'kg' } },
                quantity_change: -1,
                waste_causes: { name: 'Rotura' },
                cost_amount: 10,
            },
        ]);

        renderWithProviders(<WastePage />);
        expect(await screen.findByText('Gestión de Mermas')).toBeInTheDocument();
        expect(screen.getByText('WasteStats')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Registrar Merma'));
        expect(await screen.findByText('CreateWasteModal')).toBeInTheDocument();
    });

    it('renders production page', () => {
        eventsHookMock.useEvents.mockReturnValue({ data: [] });
        renderWithProviders(<Production />);
        expect(screen.getByText('Planificación de Producción')).toBeInTheDocument();
        expect(screen.getByText(/ProductionGantt/)).toBeInTheDocument();
    });

    it('renders organizations and creates new', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'org-1', name: 'Hotel Uno', plan: 'Pro', is_active: true }] } });
        apiMock.post.mockResolvedValueOnce({ data: {} });

        renderWithProviders(<Organizations />);
        expect(await screen.findByText('Mis Hoteles')).toBeInTheDocument();
        expect(screen.getByText('Hotel Uno')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Nuevo Hotel'));
        await userEvent.type(screen.getByLabelText('Nombre del Hotel / Sede'), 'Hotel Dos');
        await userEvent.click(screen.getByText('Crear'));

        await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    });

    it('renders HR page and sends invite', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ user: { name: 'Ana', email: 'ana@test.com' }, role: 'CHEF' }] } });
        apiMock.post.mockResolvedValueOnce({ data: {} });

        renderWithProviders(<HRManagement />);
        expect(await screen.findByText('Gestión de Personal')).toBeInTheDocument();
        expect(screen.getByText('Ana')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Invitar Usuario'));
        await userEvent.type(screen.getByLabelText('Correo Electrónico'), 'nuevo@chef.com');
        await userEvent.click(screen.getByText('Enviar Invitación'));

        await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    });

    it('renders OCR reconciliation and selects note', async () => {
        renderWithProviders(<OCRReconciliation />);
        expect(screen.getByText('Reconciliación de Albaranes')).toBeInTheDocument();
        await userEvent.click(screen.getByText('PESCADOS GARCIA'));
        expect(await screen.findByText(/Detalle del Albarán/i)).toBeInTheDocument();
    });

    it('renders settings page', async () => {
        renderWithProviders(<Settings />);
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Webhooks'));
        expect(await screen.findByText('WebhooksManager')).toBeInTheDocument();
    });
});
