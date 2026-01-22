import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
    }).format(amount);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

export function calculateTimeUntil(targetTime: string): {
    hours: number;
    minutes: number;
    isPast: boolean;
} {
    const now = new Date();
    const [hours, minutes] = targetTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    const diff = target.getTime() - now.getTime();
    const isPast = diff < 0;

    const totalMinutes = Math.abs(Math.floor(diff / 1000 / 60));

    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        isPast,
    };
}

export function isBusinessDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Not Sunday or Saturday
}

export function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        if (isBusinessDay(result)) {
            addedDays++;
        }
    }

    return result;
}
