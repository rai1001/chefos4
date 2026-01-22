import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({
    api: apiMock,
}));

import { authService } from '@/services/auth.service';
import { ingredientsService } from '@/services/ingredients.service';
import { suppliersService } from '@/services/suppliers.service';
import { eventsService } from '@/services/events.service';
import { purchaseOrdersService } from '@/services/purchase-orders.service';
import { recipesService } from '@/services/recipes.service';
import { reportsService } from '@/services/reports.service';
import { wasteService } from '@/services/waste.service';
import { webhookService } from '@/services/webhook.service';

vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
}));

describe('services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('authService register/login/logout', async () => {
        const registerData = { email: 'a@b.com', password: 'x', name: 'A', organizationName: 'Org' };
        const loginData = { email: 'a@b.com', password: 'x' };
        const authResponse = { token: 't', user: { id: 'u1', email: 'a@b.com', name: 'A' } };

        apiMock.post.mockResolvedValueOnce({ data: authResponse });
        const reg = await authService.register(registerData);
        expect(apiMock.post).toHaveBeenCalledWith('/auth/register', registerData);
        expect(reg).toEqual(authResponse);

        apiMock.post.mockResolvedValueOnce({ data: authResponse });
        const log = await authService.login(loginData);
        expect(apiMock.post).toHaveBeenCalledWith('/auth/login', loginData);
        expect(log).toEqual(authResponse);

        apiMock.post.mockResolvedValueOnce({ data: {} });
        await authService.logout();
        expect(apiMock.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('ingredientsService CRUD + low stock', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'i1' }], total: 1 } });
        const list = await ingredientsService.getAll({ search: 'tom' });
        expect(apiMock.get).toHaveBeenCalledWith('/ingredients', { params: { search: 'tom' } });
        expect(list.total).toBe(1);

        apiMock.get.mockResolvedValueOnce({ data: { data: { id: 'i1' } } });
        const item = await ingredientsService.getById('i1');
        expect(apiMock.get).toHaveBeenCalledWith('/ingredients/i1');
        expect(item.id).toBe('i1');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 'i2' } } });
        const created = await ingredientsService.create({ name: 'x', cost_price: 1, unit_id: 'u1' });
        expect(apiMock.post).toHaveBeenCalledWith('/ingredients', { name: 'x', cost_price: 1, unit_id: 'u1' });
        expect(created.id).toBe('i2');

        apiMock.patch.mockResolvedValueOnce({ data: { data: { id: 'i1', name: 'y' } } });
        const updated = await ingredientsService.update('i1', { name: 'y' });
        expect(apiMock.patch).toHaveBeenCalledWith('/ingredients/i1', { name: 'y' });
        expect(updated.name).toBe('y');

        apiMock.delete.mockResolvedValueOnce({ data: {} });
        await ingredientsService.delete('i1');
        expect(apiMock.delete).toHaveBeenCalledWith('/ingredients/i1');

        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'i-low' }] } });
        const low = await ingredientsService.getLowStock();
        expect(apiMock.get).toHaveBeenCalledWith('/ingredients/low-stock');
        expect(low[0].id).toBe('i-low');
    });

    it('suppliersService CRUD + cutoff + estimate', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 's1' }], total: 1 } });
        const list = await suppliersService.getAll('sup');
        expect(apiMock.get).toHaveBeenCalledWith('/suppliers', { params: { search: 'sup' } });
        expect(list.total).toBe(1);

        apiMock.get.mockResolvedValueOnce({ data: { data: { id: 's1' } } });
        const one = await suppliersService.getById('s1');
        expect(apiMock.get).toHaveBeenCalledWith('/suppliers/s1');
        expect(one.id).toBe('s1');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 's2' } } });
        const created = await suppliersService.create({ name: 'S' });
        expect(apiMock.post).toHaveBeenCalledWith('/suppliers', { name: 'S' });
        expect(created.id).toBe('s2');

        apiMock.patch.mockResolvedValueOnce({ data: { data: { id: 's1', name: 'S2' } } });
        const updated = await suppliersService.update('s1', { name: 'S2' });
        expect(apiMock.patch).toHaveBeenCalledWith('/suppliers/s1', { name: 'S2' });
        expect(updated.name).toBe('S2');

        apiMock.delete.mockResolvedValueOnce({ data: {} });
        await suppliersService.delete('s1');
        expect(apiMock.delete).toHaveBeenCalledWith('/suppliers/s1');

        apiMock.get.mockResolvedValueOnce({ data: { supplier_id: 's1', order_date: '2024-01-01', estimated_delivery: '2024-01-02' } });
        const est = await suppliersService.estimateDelivery('s1', '2024-01-01');
        expect(apiMock.get).toHaveBeenCalledWith('/suppliers/s1/estimate-delivery', { params: { order_date: '2024-01-01' } });
        expect(est.supplier_id).toBe('s1');

        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 's1' }] } });
        const cutoff = await suppliersService.getWithCutoffStatus();
        expect(apiMock.get).toHaveBeenCalledWith('/suppliers/cutoff-status/all');
        expect(cutoff[0].id).toBe('s1');
    });

    it('eventsService CRUD', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'e1' }], total: 1 } });
        const list = await eventsService.getAll({ start_date: '2024-01-01' });
        expect(apiMock.get).toHaveBeenCalledWith('/events', { params: { start_date: '2024-01-01' } });
        expect(list.total).toBe(1);

        apiMock.get.mockResolvedValueOnce({ data: { data: { id: 'e1' } } });
        const one = await eventsService.getById('e1');
        expect(apiMock.get).toHaveBeenCalledWith('/events/e1');
        expect(one.id).toBe('e1');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 'e2' } } });
        const created = await eventsService.create({
            name: 'E',
            event_type: 'BANQUET',
            date_start: '2024-01-01',
            date_end: '2024-01-02',
            pax: 10,
        });
        expect(apiMock.post).toHaveBeenCalledWith('/events', {
            name: 'E',
            event_type: 'BANQUET',
            date_start: '2024-01-01',
            date_end: '2024-01-02',
            pax: 10,
        });
        expect(created.id).toBe('e2');

        apiMock.patch.mockResolvedValueOnce({ data: { data: { id: 'e1', name: 'E2' } } });
        const updated = await eventsService.update('e1', { name: 'E2' });
        expect(apiMock.patch).toHaveBeenCalledWith('/events/e1', { name: 'E2' });
        expect(updated.name).toBe('E2');

        apiMock.delete.mockResolvedValueOnce({ data: {} });
        await eventsService.delete('e1');
        expect(apiMock.delete).toHaveBeenCalledWith('/events/e1');
    });

    it('purchaseOrdersService flows', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'po1' }], total: 1 } });
        const list = await purchaseOrdersService.getAll({ status: 'DRAFT' });
        expect(apiMock.get).toHaveBeenCalledWith('/purchase-orders', { params: { status: 'DRAFT' } });
        expect(list.total).toBe(1);

        apiMock.get.mockResolvedValueOnce({ data: { data: { id: 'po1' } } });
        const one = await purchaseOrdersService.getById('po1');
        expect(apiMock.get).toHaveBeenCalledWith('/purchase-orders/po1');
        expect(one.id).toBe('po1');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 'po2' } } });
        const created = await purchaseOrdersService.create({ supplier_id: 's1', items: [] });
        expect(apiMock.post).toHaveBeenCalledWith('/purchase-orders', { supplier_id: 's1', items: [] });
        expect(created.id).toBe('po2');

        apiMock.patch.mockResolvedValueOnce({ data: { data: { id: 'po1', status: 'SENT' } } });
        const updated = await purchaseOrdersService.updateStatus('po1', 'SENT');
        expect(apiMock.patch).toHaveBeenCalledWith('/purchase-orders/po1/status', { status: 'SENT' });
        expect(updated.status).toBe('SENT');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 'po1', status: 'RECEIVED' } } });
        const received = await purchaseOrdersService.receiveItems('po1', { items: [{ id: 'i1', quantity_received: 1 }] });
        expect(apiMock.post).toHaveBeenCalledWith('/purchase-orders/po1/receive', { items: [{ id: 'i1', quantity_received: 1 }] });
        expect(received.status).toBe('RECEIVED');

        apiMock.delete.mockResolvedValueOnce({ data: {} });
        await purchaseOrdersService.delete('po1');
        expect(apiMock.delete).toHaveBeenCalledWith('/purchase-orders/po1');
    });

    it('recipesService + reportsService + wasteService + webhookService', async () => {
        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'r1' }], total: 1 } });
        const recipes = await recipesService.getAll();
        expect(apiMock.get).toHaveBeenCalledWith('/recipes', { params: { search: undefined, limit: 100 } });
        expect(recipes.total).toBe(1);

        apiMock.get.mockResolvedValueOnce({ data: { data: { id: 'r1' } } });
        const recipe = await recipesService.getById('r1');
        expect(apiMock.get).toHaveBeenCalledWith('/recipes/r1');
        expect(recipe.id).toBe('r1');

        apiMock.get.mockResolvedValueOnce({ data: new Blob(['pdf']) });
        await reportsService.downloadInventoryPDF();
        expect(apiMock.get).toHaveBeenCalledWith('/reports/inventory/pdf', { responseType: 'blob' });

        apiMock.get.mockResolvedValueOnce({ data: new Blob(['xlsx']) });
        await reportsService.downloadInventoryExcel();
        expect(apiMock.get).toHaveBeenCalledWith('/reports/inventory/excel', { responseType: 'blob' });

        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'w1' }] } });
        const waste = await wasteService.getStats();
        expect(apiMock.get).toHaveBeenCalledWith('/waste/stats?');
        expect(waste[0].id).toBe('w1');

        apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'c1' }] } });
        const causes = await wasteService.getCauses();
        expect(apiMock.get).toHaveBeenCalledWith('/waste/causes');
        expect(causes[0].id).toBe('c1');

        apiMock.post.mockResolvedValueOnce({ data: { data: { id: 'c2' } } });
        const createdCause = await wasteService.createCause({ name: 'Rotura' });
        expect(apiMock.post).toHaveBeenCalledWith('/waste/causes', { name: 'Rotura' });
        expect(createdCause.id).toBe('c2');

        apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
        const log = await wasteService.logWaste({ ingredient_id: 'i1', quantity: 1, waste_cause_id: 'c1' });
        expect(apiMock.post).toHaveBeenCalledWith('/waste/log', { ingredient_id: 'i1', quantity: 1, waste_cause_id: 'c1' });
        expect(log.ok).toBe(true);

        apiMock.get.mockResolvedValueOnce({ data: [{ id: 'wh1' }] });
        const hooks = await webhookService.getAll();
        expect(apiMock.get).toHaveBeenCalledWith('/webhooks');
        expect(hooks[0].id).toBe('wh1');
    });

    it('webhookService actions', async () => {
        apiMock.post.mockResolvedValueOnce({ data: { id: 'wh1' } });
        const created = await webhookService.create({ url: 'http://x', events: ['e'] });
        expect(apiMock.post).toHaveBeenCalledWith('/webhooks', { url: 'http://x', events: ['e'] });
        expect(created.id).toBe('wh1');

        apiMock.patch.mockResolvedValueOnce({ data: { id: 'wh1', is_active: true } });
        const updated = await webhookService.update('wh1', { is_active: true });
        expect(apiMock.patch).toHaveBeenCalledWith('/webhooks/wh1', { is_active: true });
        expect(updated.is_active).toBe(true);

        apiMock.delete.mockResolvedValueOnce({ data: {} });
        await webhookService.delete('wh1');
        expect(apiMock.delete).toHaveBeenCalledWith('/webhooks/wh1');

        apiMock.get.mockResolvedValueOnce({ data: [{ id: 'd1' }] });
        const history = await webhookService.getHistory('wh1');
        expect(apiMock.get).toHaveBeenCalledWith('/webhooks/wh1/history');
        expect(history[0].id).toBe('d1');

        apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
        const test = await webhookService.testDispatch('wh1');
        expect(apiMock.post).toHaveBeenCalledWith('/webhooks/test/dispatch', { webhookId: 'wh1' });
        expect(test.ok).toBe(true);
    });
});
