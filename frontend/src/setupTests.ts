import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock PointerEvent
if (!global.PointerEvent) {
    (global as any).PointerEvent = class PointerEvent extends Event {
        constructor(type: string, params: any = {}) {
            super(type, params);
            (this as any).pointerId = params.pointerId || 0;
            (this as any).width = params.width || 0;
            (this as any).height = params.height || 0;
            (this as any).pressure = params.pressure || 0;
            (this as any).tangentialPressure = params.tangentialPressure || 0;
            (this as any).tiltX = params.tiltX || 0;
            (this as any).tiltY = params.tiltY || 0;
            (this as any).twist = params.twist || 0;
            (this as any).pointerType = params.pointerType || '';
            (this as any).isPrimary = params.isPrimary || false;
        }
    };
}

if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => { };
}
if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => { };
}

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => { };
}
