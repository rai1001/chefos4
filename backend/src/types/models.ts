export interface ProductFamily {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    safety_buffer_pct: number;
    created_at: string;
    updated_at: string;
}

export interface CreateProductFamilyDto {
    name: string;
    description?: string;
    safety_buffer_pct?: number;
}

export interface UpdateProductFamilyDto {
    name?: string;
    description?: string;
    safety_buffer_pct?: number;
}
