import { describe, it } from 'vitest';
import App from './App';

describe('App Diagnosis', () => {
    it('should import App without crashing', () => {
        console.log('App imported:', App);
    });
});
