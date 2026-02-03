import { describe, it, vi } from 'vitest';

vi.mock('@/config/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        }
    }
}));

import App from './App';

describe('App Diagnosis', () => {
    it('should import App without crashing', () => {
        // App is imported above, so if it didn't crash, we are good.
        // We can check if it's a function or object (React component)
        if (typeof App === 'function' || typeof App === 'object') {
            console.log('App imported successfully');
        }
    });
});
