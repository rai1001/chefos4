import csv from 'csv-parser';
import { Readable } from 'stream';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import {
    ValidationError,
    validateFile,
    validateHeaders,
    sanitizeCSVValue,
    parseFloatSafe,
    createValidationError,
} from '@/utils/csv-validator';


interface CSVRow {
    nombre_articulo: string;
    proveedor: string;
    precio: string;
    unidad: string;
    familia?: string;
}


interface ConflictResolution {
    supplier_name: string;
    action: 'CREATE' | 'LINK';
    link_to_id?: string; // Si action = LINK
    default_family_id?: string | null;
}

const normalizeKey = (key: string): string =>
    key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

const normalizeValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toString();
    return String(value).trim();
};

const mapRow = (row: Record<string, any>): CSVRow => {
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
        if (!key) continue;
        normalizedRow[normalizeKey(key)] = normalizeValue(value);
    }

    const getValue = (keys: string[]) => {
        for (const key of keys) {
            const value = normalizedRow[key];
            if (value) return value;
        }
        return '';
    };

    return {
        nombre_articulo: getValue([
            'nombrearticulo',
            'articulo',
            'producto',
            'nombre',
            'descripcion',
            'item',
            'material',
        ]),
        proveedor: getValue(['proveedor', 'supplier', 'vendor']),
        precio: getValue([
            'precio',
            'coste',
            'costo',
            'price',
            'preciounitario',
            'costeunitario',
        ]),
        unidad: getValue([
            'unidad',
            'ud',
            'un',
            'uom',
            'unit',
            'unidadmedida',
        ]),
        familia: getValue(['familia', 'categoria', 'category']),
    };
};


export class CSVImporterService {
    /**
     * FASE 1: Analizar CSV sin guardar nada
     */
    async analyzeCSV(
        fileBuffer: Buffer,
        organizationId: string,
        filename: string = 'upload.csv'
    ): Promise<{
        total_rows: number;
        unknown_suppliers: string[];
        preview: CSVRow[];
        validation_errors: string[];
    }> {
        // 1. Validate file
        const fileValidation = validateFile(fileBuffer, filename);
        if (!fileValidation.valid) {
            throw new Error(`File validation failed: ${fileValidation.errors.join(', ')}`);
        }
        const rows: CSVRow[] = [];
        const unknownSuppliers = new Set<string>();
        let headers: string[] = [];
        let firstRow = true;

        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('headers', (hdrs: string[]) => {
                    headers = hdrs;
                })
                .on('data', (row: any) => {
                    rows.push(mapRow(row));
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // 2. Validate required columns
        const requiredColumns = ['nombre_articulo', 'proveedor', 'precio', 'unidad'];
        const headerValidation = validateHeaders(headers, requiredColumns);

        if (!headerValidation.valid) {
            throw new Error(
                `Missing required columns: ${headerValidation.missing.join(', ')}. ` +
                `Found: ${headerValidation.found.join(', ')}`
            );
        }


        // Obtener proveedores existentes
        const { data: existingSuppliers } = await supabase
            .from('suppliers')
            .select('name')
            .eq('organization_id', organizationId);


        const existingNames = new Set(
            existingSuppliers?.map((s) => s.name.toLowerCase()) || []
        );


        // Detectar proveedores desconocidos
        for (const row of rows) {
            if (!row.proveedor) continue;
            const supplierName = row.proveedor.trim().toLowerCase();
            if (!existingNames.has(supplierName)) {
                unknownSuppliers.add(row.proveedor.trim());
            }
        }


        logger.info(`CSV Analysis: ${rows.length} rows, ${unknownSuppliers.size} unknown suppliers`);

        return {
            total_rows: rows.length,
            unknown_suppliers: Array.from(unknownSuppliers),
            preview: rows.slice(0, 5),
            validation_errors: [],
        };
    }


    /**
     * FASE 2: Ejecutar importación con resoluciones
     */
    async executeImport(
        fileBuffer: Buffer,
        organizationId: string,
        resolutions: ConflictResolution[],
        filename: string = 'upload.csv'
    ): Promise<{
        imported: number;
        updated: number;
        created_suppliers: number;
        errors: ValidationError[];
    }> {
        // 1. Validate file
        const fileValidation = validateFile(fileBuffer, filename);
        if (!fileValidation.valid) {
            throw new Error(`File validation failed: ${fileValidation.errors.join(', ')}`);
        }
        const rows: CSVRow[] = [];


        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (row: any) => {
                    rows.push(mapRow(row));
                })
                .on('end', resolve)
                .on('error', reject);
        });


        let imported = 0;
        let updated = 0;
        let createdSuppliers = 0;
        const errors: ValidationError[] = [];

        // Accumulate valid ingredients for bulk insert
        const ingredientsToCreate: any[] = [];
        const ingredientsToUpdate: Array<{ id: string; cost_price: number }> = [];


        // Crear mapa de resoluciones
        const resolutionMap = new Map<string, ConflictResolution>(
            resolutions.map((r) => [r.supplier_name.toLowerCase(), r])
        );


        // Process each row with validation
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const rowNumber = rowIndex + 2; // +2 because: 0-indexed + 1 header row + 1 for 1-based

            try {
                // Validate required fields
                if (!row.nombre_articulo) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REQUIRED',
                        'Missing required field',
                        'nombre_articulo'
                    ));
                    continue;
                }
                if (!row.proveedor) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REQUIRED',
                        'Missing required field',
                        'proveedor'
                    ));
                    continue;
                }
                if (!row.unidad) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REQUIRED',
                        'Missing required field',
                        'unidad'
                    ));
                    continue;
                }
                if (!row.precio) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REQUIRED',
                        'Missing required field',
                        'precio'
                    ));
                    continue;
                }

                // 1. Resolver proveedor
                const supplierResult = await this.resolveSupplier(
                    row.proveedor.trim(),
                    organizationId,
                    resolutionMap
                );


                if (!supplierResult) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REFERENCE',
                        `Supplier not resolved: ${row.proveedor}`,
                        'proveedor',
                        row.proveedor
                    ));
                    continue;
                }

                const {
                    id: supplierId,
                    created: supplierCreated,
                    default_family_id: supplierDefaultFamilyId,
                } = supplierResult;
                if (supplierCreated) createdSuppliers++;


                // 2. Resolver unidad
                const unitId = await this.resolveUnit(row.unidad.trim());


                if (!unitId) {
                    errors.push(createValidationError(
                        rowNumber,
                        'REFERENCE',
                        `Unknown unit: ${row.unidad}`,
                        'unidad',
                        row.unidad
                    ));
                    continue;
                }


                // 3. Resolver familia (opcional)
                let familyId = null;
                if (row.familia) {
                    familyId = await this.resolveFamily(row.familia.trim(), organizationId);
                } else if (supplierDefaultFamilyId) {
                    familyId = supplierDefaultFamilyId;
                }


                // 4. Parse and validate price
                const precio = parseFloatSafe(row.precio);
                if (precio === null || precio < 0) {
                    errors.push(createValidationError(
                        rowNumber,
                        'FORMAT',
                        `Invalid price format: ${row.precio}`,
                        'precio',
                        row.precio
                    ));
                    continue;
                }

                // Sanitize values to prevent CSV injection
                const sanitizedName = sanitizeCSVValue(row.nombre_articulo.trim());


                // 5. Check if ingredient exists (for bulk operations)
                const { data: existing } = await supabase
                    .from('ingredients')
                    .select('id')
                    .eq('name', sanitizedName)
                    .eq('supplier_id', supplierId)
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .single();

                if (existing) {
                    // Queue for bulk update
                    ingredientsToUpdate.push({
                        id: existing.id,
                        cost_price: precio,
                    });
                } else {
                    // Queue for bulk insert
                    ingredientsToCreate.push({
                        organization_id: organizationId,
                        name: sanitizedName,
                        supplier_id: supplierId,
                        family_id: familyId,
                        cost_price: precio,
                        unit_id: unitId,
                    });
                }
            } catch (error: any) {
                errors.push(createValidationError(
                    rowNumber,
                    'VALIDATION',
                    `Unexpected error: ${error.message}`,
                    undefined,
                    row.nombre_articulo
                ));
            }
        }

        // ========================================
        // BULK OPERATIONS (Much faster!)
        // ========================================

        // Bulk insert new ingredients
        if (ingredientsToCreate.length > 0) {
            const { error: insertError } = await supabase
                .from('ingredients')
                .insert(ingredientsToCreate);

            if (insertError) {
                logger.error(insertError as any, 'Bulk insert failed:');
                throw new Error('Bulk insert failed');
            }
            imported = ingredientsToCreate.length;
            logger.info(`Bulk inserted ${imported} ingredients`);
        }

        // Bulk update existing ingredients (one by one for now - Supabase doesn't support bulk update easily)
        for (const item of ingredientsToUpdate) {
            try {
                const { error: updateError } = await supabase
                    .from('ingredients')
                    .update({ cost_price: item.cost_price })
                    .eq('id', item.id);

                if (updateError) throw updateError;
            } catch (error: any) {
                logger.error(`Error updating ingredient ${item.id}:`, error);
                errors.push(createValidationError(
                    0,
                    'UPDATE',
                    `Failed to update ingredient: ${error.message || 'Unknown error'}`,
                    undefined,
                    item.id
                ));
            }
        }
        updated = ingredientsToUpdate.length;
        if (updated > 0) {
            logger.info(`Updated ${updated} ingredients`);
        }


        logger.info(`Import complete: ${imported} created, ${updated} updated, ${createdSuppliers} suppliers created`);


        return {
            imported,
            updated,
            created_suppliers: createdSuppliers,
            errors,
        };
    }


    // ========================================
    // HELPERS
    // ========================================


    private async resolveSupplier(
        name: string,
        organizationId: string,
        resolutions: Map<string, ConflictResolution>
    ): Promise<{ id: string; created: boolean; default_family_id?: string | null } | null> {
        const nameLower = name.toLowerCase();


        // Buscar en BD
        const { data: existing } = await supabase
            .from('suppliers')
            .select('id, default_family_id')
            .eq('organization_id', organizationId)
            .ilike('name', name)
            .maybeSingle();


        if (existing) {
            return {
                id: existing.id,
                created: false,
                default_family_id: existing.default_family_id ?? null,
            };
        }


        // Buscar en resoluciones
        const resolution = resolutions.get(nameLower);


        if (!resolution) {
            return null;
        }


        if (resolution.action === 'LINK') {
            if (!resolution.link_to_id) {
                return null;
            }

            const { data: linkedSupplier } = await supabase
                .from('suppliers')
                .select('id, default_family_id')
                .eq('organization_id', organizationId)
                .eq('id', resolution.link_to_id)
                .maybeSingle();

            return linkedSupplier
                ? {
                    id: linkedSupplier.id,
                    created: false,
                    default_family_id: linkedSupplier.default_family_id ?? null,
                }
                : null;
        }


        // Crear nuevo proveedor
        const { data: newSupplier, error } = await supabase
            .from('suppliers')
            .insert({
                organization_id: organizationId,
                name: name,
                default_family_id: resolution.default_family_id ?? null,
            })
            .select('id, default_family_id')
            .single();

        if (error) {
            logger.error(error as any, `Error creating supplier ${name}:`);
            return null;
        }


        return newSupplier
            ? {
                id: newSupplier.id,
                created: true,
                default_family_id: newSupplier.default_family_id ?? null,
            }
            : null;
    }


    private async resolveUnit(abbreviation: string): Promise<string | null> {
        const { data } = await supabase
            .from('units')
            .select('id')
            .ilike('abbreviation', abbreviation)
            .maybeSingle();


        return data?.id || null;
    }


    private async resolveFamily(
        name: string,
        organizationId: string
    ): Promise<string | null> {
        const { data } = await supabase
            .from('product_families')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('name', name)
            .maybeSingle();


        return data?.id || null;
    }
}
