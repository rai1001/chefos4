import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Frontend Smoke Test', () => {
    it('verifies the test environment is working', () => {
        expect(true).toBe(true);
    });

    it('can render a simple element', () => {
        render(<div data-testid="smoke">Hello</div>);
        expect(screen.getByTestId('smoke')).toHaveTextContent('Hello');
    });
});
