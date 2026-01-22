import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import { WasteStats } from '@/components/waste/WasteStats';
import { CreateWasteModal } from '@/components/waste/CreateWasteModal';
import { ProductionGantt } from '@/components/production/ProductionGantt';

const wasteServiceMock = vi.hoisted(() => ({
    getStats: vi.fn(),
    getCauses: vi.fn(),
    logWaste: vi.fn(),
}));

const ingredientsHookMock = vi.hoisted(() => ({
    useIngredients: vi.fn(),
}));

const productionHookMock = vi.hoisted(() => ({
    useProductionTasks: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/waste.service', () => ({ wasteService: wasteServiceMock }));
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: ingredientsHookMock.useIngredients }));
vi.mock('@/hooks/useProductionTasks', () => ({ useProductionTasks: productionHookMock.useProductionTasks }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

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
    };
});

vi.mock('gantt-task-react', () => ({
    Gantt: ({ tasks }: { tasks: Array<unknown> }) => <div>Gantt {tasks.length}</div>,
    ViewMode: { Hour: 'Hour', QuarterDay: 'QuarterDay', Day: 'Day' },
}));

beforeEach(() => {
    wasteServiceMock.getStats.mockReset();
    wasteServiceMock.getCauses.mockReset();
    wasteServiceMock.logWaste.mockReset();
    ingredientsHookMock.useIngredients.mockReset();
    productionHookMock.useProductionTasks.mockReset();
    toastMock.mockReset();
});

describe('WasteStats', () => {
    it('shows totals based on logs', async () => {
        wasteServiceMock.getStats.mockResolvedValueOnce([
            { cost_amount: 5, waste_causes: { name: 'Rotura' }, ingredients: { name: 'Tomate' } },
            { cost_amount: 3, waste_causes: { name: 'Rotura' }, ingredients: { name: 'Tomate' } },
        ]);

        renderWithProviders(<WasteStats />);
        expect(await screen.findByText('Costo Total Mermas')).toBeInTheDocument();
        expect(screen.getByText('$8.00')).toBeInTheDocument();
    });
});

describe('CreateWasteModal', () => {
    it('submits waste log', async () => {
        wasteServiceMock.getCauses.mockResolvedValueOnce([
            { id: 'cause-1', name: 'Rotura' },
        ]);
        wasteServiceMock.logWaste.mockResolvedValueOnce({});
        ingredientsHookMock.useIngredients.mockReturnValue({
            data: { data: [{ id: 'ing-1', name: 'Tomate', units: { abbreviation: 'kg' }, stock_current: 5, cost_price: 2 }] },
        });

        renderWithProviders(<CreateWasteModal />);

        const comboBoxes = screen.getAllByRole('combobox');
        await userEvent.click(comboBoxes[0]);
        await userEvent.click(screen.getByRole('option', { name: 'Tomate (kg)' }));

        const qtyInput = screen.getByRole('spinbutton');
        await userEvent.type(qtyInput, '2');

        await userEvent.click(comboBoxes[1]);
        await userEvent.click(screen.getByRole('option', { name: 'Rotura' }));

        await userEvent.click(screen.getByText('Registrar Merma'));
        await waitFor(() => expect(wasteServiceMock.logWaste).toHaveBeenCalled());
    });
});

describe('ProductionGantt', () => {
    it('shows empty state when no tasks', () => {
        productionHookMock.useProductionTasks.mockReturnValue({ data: [], isLoading: false });
        renderWithProviders(<ProductionGantt />);
        expect(screen.getByText('No hay tareas planificadas')).toBeInTheDocument();
    });

    it('renders gantt when tasks exist', () => {
        productionHookMock.useProductionTasks.mockReturnValue({
            data: [
                {
                    id: 'task-1',
                    title: 'Preparar',
                    scheduled_start: new Date().toISOString(),
                    scheduled_end: new Date().toISOString(),
                    progress_pct: 50,
                    status: 'IN_PROGRESS',
                },
            ],
            isLoading: false,
        });

        renderWithProviders(<ProductionGantt />);
        expect(screen.getByText('Gantt 1')).toBeInTheDocument();
    });
});
