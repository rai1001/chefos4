import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
    kpis: {
        total_valuation: 12500,
        low_stock_count: 2,
        pending_pos: 3,
    },
    valuation: [],
    trends: [],
    foodCost: [],
};

const mockEventsResponse = {
    data: [],
};

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.route('**/api/v1/analytics/dashboard**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockDashboardResponse),
            });
        });

        await page.route('**/api/v1/events**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockEventsResponse),
            });
        });

        await page.route('**/api/v1/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
        });

        await page.route('**/api/v1/auth/register', async (route) => {
            const payload = route.request().postDataJSON?.() || {};
            const name = payload.name || 'E2E Test User';
            const email = payload.email || 'e2e@example.com';

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'mock-token',
                    user: {
                        id: 'user-e2e',
                        email,
                        name,
                    },
                }),
            });
        });

        await page.route('**/api/v1/auth/login', async (route) => {
            const payload = route.request().postDataJSON?.() || {};

            if (payload.email === 'invalid@example.com') {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Credenciales inválidas' }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'mock-token',
                    user: {
                        id: 'user-e2e',
                        email: payload.email || 'e2e@example.com',
                        name: 'E2E Test User',
                    },
                }),
            });
        });
    });

    test('complete registration and login flow', async ({ page }) => {
        // 1. Go to registration
        await page.goto('/register');

        // 2. Fill form
        await page.fill('#name', 'E2E Test User');
        await page.fill('#email', `test-${Date.now()}@example.com`);
        await page.fill('#password', 'SecurePass123!');
        await page.fill('#organizationName', 'E2E Test Restaurant');

        // 3. Submit
        await page.click('button[type="submit"]');

        // 4. Should redirect to dashboard
        await expect(page).toHaveURL('/dashboard');

        // 5. Should show user name in menu
        await page.click('[aria-label="User menu"]');
        await expect(page.locator('text=E2E Test User')).toBeVisible();

        // 6. Logout
        await page.click('text=Cerrar sesión');

        // 7. Should redirect to login
        await expect(page).toHaveURL('/login');
    });

    test('login with invalid credentials shows error', async ({ page }) => {
        await page.goto('/login');

        await page.fill('#email', 'invalid@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=Error de autenticación')).toBeVisible();
    });

    test('protected routes redirect to login', async ({ page }) => {
        await page.goto('/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL('/login');
    });
});
