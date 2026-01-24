import { z } from 'zod';


export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    }),
});


export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
        name: z.string().min(2, 'El nombre es obligatorio'),
        organizationName: z.string().min(2, 'El nombre de la organización es obligatorio'),
    }),
});


export const createSupplierSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'El nombre es obligatorio'),
        contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
        contact_phone: z.string().optional(),
        lead_time_days: z.coerce.number().min(0).optional(),
        default_family_id: z.preprocess(
            (value) => (value === '' || value === null ? undefined : value),
            z.string().uuid().optional()
        ),
        cut_off_time: z.preprocess(
            (value) => (value === '' || value === null ? undefined : value),
            z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Formato de hora inválido (HH:mm)').optional()
        ),
        delivery_days: z.array(z.number().min(1).max(7)).optional(),
    }),
});


export const updateSupplierSchema = createSupplierSchema.partial();


export const createProductFamilySchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        description: z.string().optional(),
        safety_buffer_pct: z
            .number()
            .min(1.0)
            .max(2.0)
            .optional()
            .default(1.10),
    }),
});


export const updateProductFamilySchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        safety_buffer_pct: z.number().min(1.0).max(2.0).optional(),
    }),
});


export const createIngredientSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name required'),
        description: z.string().optional(),
        family_id: z.string().uuid().optional(),
        supplier_id: z.string().uuid().optional(),
        cost_price: z.number().min(0),
        unit_id: z.string().uuid(),
        stock_current: z.number().min(0).optional(),
        stock_min: z.number().min(0).optional(),
        barcode: z.string().max(100).optional(),
    }),
});


export const updateIngredientSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        family_id: z.string().uuid().optional(),
        supplier_id: z.string().uuid().optional(),
        cost_price: z.number().min(0).optional(),
        unit_id: z.string().uuid().optional(),
        stock_current: z.number().min(0).optional(),
        stock_min: z.number().min(0).optional(),
        barcode: z.string().max(100).optional(),
    }),
});

// --- RESTORED SCHEMAS ---

export const createEventSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Event name is required'),
        event_type: z.string().min(2, 'Event type is required'),
        date_start: z.string().datetime(),
        date_end: z.string().datetime().optional(),
        pax: z.number().int().min(1),
        menus: z.array(z.object({
            recipe_id: z.string().uuid(),
            qty_forecast: z.number().min(0)
        })).optional(),
        direct_ingredients: z.array(z.object({
            ingredient_id: z.string().uuid(),
            quantity: z.number().min(0),
            unit_id: z.string().uuid()
        })).optional()
    })
});

export const updateEventSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        event_type: z.string().min(2).optional(),
        date_start: z.string().datetime().optional(),
        date_end: z.string().datetime().optional(),
        pax: z.number().int().min(1).optional(),
        status: z.enum(['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional()
    })
});

export const createRecipeSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Recipe name is required'),
        description: z.string().optional(),
        servings: z.number().min(1),
        ingredients: z.array(z.object({
            ingredient_id: z.string().uuid(),
            quantity: z.number().min(0),
            unit_id: z.string().uuid()
        })).optional()
    })
});

export const updateRecipeSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        servings: z.number().min(1).optional(),
        ingredients: z.array(z.object({
            ingredient_id: z.string().uuid(),
            quantity: z.number().min(0),
            unit_id: z.string().uuid()
        })).optional()
    })
});

export const createPurchaseOrderSchema = z.object({
    body: z.object({
        supplier_id: z.string().uuid(),
        event_id: z.string().uuid().optional(),
        items: z.array(z.object({
            ingredient_id: z.string().uuid(),
            quantity_ordered: z.number().min(0),
            unit_id: z.string().uuid(),
            unit_price: z.number().min(0).optional()
        })).optional()
    })
});

export const updatePurchaseOrderSchema = z.object({
    body: z.object({
        status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'How_Partially_Received', 'CANCELLED', 'PARTIAL']).optional(), // Corrected enum based on Controller
        // status also allows 'PARTIAL' in controller logic
    })
});

// --- INVENTORY SCHEMAS ---

export const stockOutSchema = z.object({
    body: z.object({
        quantity: z.number().positive('Quantity must be positive'),
        movement_type: z.enum(['OUT', 'WASTE', 'ADJUSTMENT']).optional().default('OUT'),
        barcode: z.string().optional(),
        ingredient_id: z.string().uuid().optional(),
        notes: z.string().optional(),
        production_order_id: z.string().uuid().optional(),
        save_barcode: z.boolean().optional(),
    }),
});

export const createLocationSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        type: z.string().optional().nullable(),
    }),
});

export const updateLocationSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').optional(),
        type: z.string().optional().nullable(),
    }),
});

export const updateBatchSchema = z.object({
    body: z.object({
        expiry_date: z.string().datetime().optional().nullable(), // Or just string if loose validation, but datetime is better
        storage_location_id: z.string().uuid().optional().nullable(),
        lot_code: z.string().optional().nullable(),
    }),
});

export const createCycleCountSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        location_id: z.string().uuid().optional().nullable(),
    }),
});

export const updateCycleCountItemsSchema = z.object({
    body: z.object({
        items: z.array(z.object({
            id: z.string().uuid(),
            counted_qty: z.number().min(0),
            notes: z.string().optional().nullable(),
        })).min(1, 'At least one item is required'),
    }),
});
