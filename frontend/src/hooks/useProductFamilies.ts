import { useQuery } from '@tanstack/react-query';
import { productFamiliesService } from '@/services/product-families.service';

export function useProductFamilies() {
    return useQuery({
        queryKey: ['product-families'],
        queryFn: () => productFamiliesService.getAll(),
    });
}
