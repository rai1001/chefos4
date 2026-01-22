import csv from 'csv-parser';
import { Readable } from 'stream';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';


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
}


export class CSVImporterService {
    /**
     * FASE 1: Analizar CSV sin guardar nada
     */
    async analyzeCSV(
        fileBuffer: Buffer,
        organizationId: string
    ): Promise<{
        total_rows: number;
        unknown_suppliers: string[];
        preview: CSVRow[];
    }> {
        const rows: CSVRow[] = [];
        const unknownSuppliers = new Set<string>();


        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (row: any) => {
                    rows.push({
                        nombre_articulo: row['Nombre Artículo'] || row['nombre_articulo'],
                        proveedor: row['Proveedor'] || row['proveedor'],
                        precio: row['Precio'] || row['precio'],
                        unidad: row['Unidad'] || row['unidad'],
                        familia: row['Familia'] || row['familia'],
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });


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
            preview: rows.slice(0, 5), // Primeras 5 filas
        };
    }


    /**
     * FASE 2: Ejecutar importación con resoluciones
     */
    async executeImport(
        fileBuffer: Buffer,
        organizationId: string,
        resolutions: ConflictResolution[]
    ): Promise<{
        imported: number;
        updated: number;
        created_suppliers: number;
        errors: string[];
    }> {
        const rows: CSVRow[] = [];


        await new Promise((resolve, reject) => {
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (row: any) => {
                    rows.push({
                        nombre_articulo: row['Nombre Artículo'] || row['nombre_articulo'],
                        proveedor: row['Proveedor'] || row['proveedor'],
                        precio: row['Precio'] || row['precio'],
                        unidad: row['Unidad'] || row['unidad'],
                        familia: row['Familia'] || row['familia'],
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });


        let imported = 0;
        let updated = 0;
        let createdSuppliers = 0;
        const errors: string[] = [];


        // Crear mapa de resoluciones
        const resolutionMap = new Map<string, ConflictResolution>(
            resolutions.map((r) => [r.supplier_name.toLowerCase(), r])
        );


        for (const row of rows) {
            try {
                if (!row.nombre_articulo || !row.proveedor || !row.unidad || !row.precio) {
                    errors.push(`Fila incompleta: ${JSON.stringify(row)}`);
                    continue;
                }

                // 1. Resolver proveedor
                const supplierResult = await this.resolveSupplier(
                    row.proveedor.trim(),
                    organizationId,
                    resolutionMap
                );


                if (!supplierResult) {
                    errors.push(`Proveedor no resuelto: ${row.proveedor}`);
                    continue;
                }

                const { id: supplierId, created: supplierCreated } = supplierResult;
                if (supplierCreated) createdSuppliers++;


                // 2. Resolver unidad
                const unitId = await this.resolveUnit(row.unidad.trim());


                if (!unitId) {
                    errors.push(`Unidad desconocida: ${row.unidad}`);
                    continue;
                }


                // 3. Resolver familia (opcional)
                let familyId = null;
                if (row.familia) {
                    familyId = await this.resolveFamily(row.familia.trim(), organizationId);
                }


                // 4. Upsert ingrediente
                const precio = parseFloat(row.precio.replace(',', '.'));


                const { data: existing } = await supabase
                    .from('ingredients')
                    .select('id')
                    .eq('name', row.nombre_articulo.trim())
                    .eq('supplier_id', supplierId)
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .single();


                if (existing) {
                    // ACTUALIZAR
                    await supabase
                        .from('ingredients')
                        .update({ cost_price: precio })
                        .eq('id', existing.id);


                    updated++;
                } else {
                    // CREAR
                    await supabase.from('ingredients').insert({
                        organization_id: organizationId,
                        name: row.nombre_articulo.trim(),
                        supplier_id: supplierId,
                        family_id: familyId,
                        cost_price: precio,
                        unit_id: unitId,
                    });


                    imported++;
                }
            } catch (error: any) {
                errors.push(`Error en fila "${row.nombre_articulo}": ${error.message}`);
            }
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
    ): Promise<{ id: string; created: boolean } | null> {
        const nameLower = name.toLowerCase();


        // Buscar en BD
        const { data: existing } = await supabase
            .from('suppliers')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('name', name)
            .maybeSingle();


        if (existing) {
            return { id: existing.id, created: false };
        }


        // Buscar en resoluciones
        const resolution = resolutions.get(nameLower);


        if (!resolution) {
            return null;
        }


        if (resolution.action === 'LINK') {
            return resolution.link_to_id ? { id: resolution.link_to_id, created: false } : null;
        }


        // Crear nuevo proveedor
        const { data: newSupplier, error } = await supabase
            .from('suppliers')
            .insert({
                organization_id: organizationId,
                name: name,
            })
            .select('id')
            .single();

        if (error) {
            logger.error(`Error creating supplier ${name}:`, error);
            return null;
        }


        return newSupplier ? { id: newSupplier.id, created: true } : null;
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
