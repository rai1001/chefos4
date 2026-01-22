import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/renderWithProviders';
import { WebhooksManager } from '@/components/webhooks/WebhooksManager';

const webhookServiceMock = vi.hoisted(() => ({
    getAll: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getHistory: vi.fn(),
    testDispatch: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/webhook.service', () => ({
    WebhookService: vi.fn().mockImplementation(() => webhookServiceMock),
}));

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

beforeEach(() => {
    webhookServiceMock.getAll.mockReset();
    webhookServiceMock.delete.mockReset();
    webhookServiceMock.create.mockReset();
    webhookServiceMock.update.mockReset();
    webhookServiceMock.getHistory.mockReset();
    webhookServiceMock.testDispatch.mockReset();
    toastMock.mockReset();
});

describe('WebhooksManager', () => {
    it('renders list and handles create/history/test', async () => {
        webhookServiceMock.getAll.mockResolvedValue({
            data: [
                {
                    id: 'wh-1',
                    url: 'https://example.com/webhook',
                    events: ['inventory.low'],
                    is_active: true,
                    secret: 'secret1234',
                },
            ],
        });
        webhookServiceMock.create.mockResolvedValueOnce({});
        webhookServiceMock.getHistory.mockResolvedValueOnce({
            data: [
                {
                    id: 'del-1',
                    created_at: new Date().toISOString(),
                    event_type: 'inventory.low',
                    status: 'success',
                    response_code: 200,
                    attempt_count: 1,
                },
            ],
        });
        webhookServiceMock.testDispatch.mockResolvedValueOnce({});

        renderWithProviders(<WebhooksManager />);

        expect(await screen.findByText('https://example.com/webhook')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Nuevo Webhook'));
        await userEvent.type(screen.getByLabelText('URL del Endpoint'), 'https://api.test.com/hook');
        await userEvent.click(screen.getByText('Inventario Bajo'));
        await userEvent.click(screen.getByText('Guardar Webhook'));

        await waitFor(() => expect(webhookServiceMock.create).toHaveBeenCalled());

        await userEvent.click(screen.getByTitle('Ver Historial'));
        expect(await screen.findByText('Historial de Entregas')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await userEvent.click(screen.getByTitle('Probar Dispatch'));
        await waitFor(() => expect(webhookServiceMock.testDispatch).toHaveBeenCalled());
    });
});
