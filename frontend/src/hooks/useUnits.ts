import { useQuery } from '@tanstack/react-query';
import { unitsService } from '@/services/units.service';

export function useUnits() {
    return useQuery({
        queryKey: ['units'],
        queryFn: () => unitsService.getAll(),
    });
}
