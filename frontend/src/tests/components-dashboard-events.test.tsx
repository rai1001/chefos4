import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';
import { DeadlineAlerts } from '@/components/dashboard/DeadlineAlerts';
import { EventCalendar } from '@/components/events/EventCalendar';

const eventsServiceMock = vi.hoisted(() => ({
    getAll: vi.fn(),
}));

const eventsHookMock = vi.hoisted(() => ({
    useEvents: vi.fn(),
}));

vi.mock('@/services/events.service', () => ({ eventsService: eventsServiceMock }));
vi.mock('@/hooks/useEvents', () => ({ useEvents: eventsHookMock.useEvents }));

beforeEach(() => {
    eventsServiceMock.getAll.mockReset();
    eventsHookMock.useEvents.mockReset();
});

describe('dashboard components', () => {
    it('shows urgent events in DeadlineAlerts', async () => {
        const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        eventsServiceMock.getAll.mockResolvedValueOnce({
            data: [{ id: 'e1', name: 'Banquete', date_start: soon, status: 'DRAFT' }],
        });

        renderWithProviders(<DeadlineAlerts />);
        expect(await screen.findByText('Banquete')).toBeInTheDocument();
        expect(screen.getByText('Alertas de Pedido')).toBeInTheDocument();
        expect(eventsServiceMock.getAll).toHaveBeenCalledWith(expect.objectContaining({
            status: 'DRAFT',
        }));
    });

    it('shows empty state when no urgent events', async () => {
        eventsServiceMock.getAll.mockResolvedValueOnce({ data: [] });
        renderWithProviders(<DeadlineAlerts />);
        expect(await screen.findByText(/No hay eventos próximos/i)).toBeInTheDocument();
        expect(eventsServiceMock.getAll).toHaveBeenCalledWith(expect.objectContaining({
            status: 'DRAFT',
        }));
    });
});

describe('event calendar', () => {
    it('renders event badges for the current month', () => {
        const today = new Date().toISOString();
        eventsHookMock.useEvents.mockReturnValue({
            data: [{ id: 'ev-1', name: 'Cena VIP', date_start: today, event_type: 'BANQUET', pax: 120 }],
            isLoading: false,
        });

        renderWithProviders(<EventCalendar />);
        expect(screen.getByText('Cena VIP')).toBeInTheDocument();
    });
});
