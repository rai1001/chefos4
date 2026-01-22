import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import multer from 'multer';
import { CSVImporterService } from '@/services/csv-importer.service';
import * as XLSX from 'xlsx';


// Configurar multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const isCsv = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
        const isXlsx =
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls');

        if (isCsv || isXlsx) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV or Excel files allowed'));
        }
    },
});

const getImportBuffer = (file: any): Buffer => {
    const isSpreadsheet =
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls');

    if (!isSpreadsheet) return file.buffer;

    try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            throw new AppError(400, 'Excel file has no sheets');
        }

        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);

        if (!csv.trim()) {
            throw new AppError(400, 'Excel file is empty');
        }

        return Buffer.from(csv, 'utf8');
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(400, 'Invalid Excel file');
    }
};


export class IngredientsController {
    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;
            const {
                page = 1,
                limit = 50,
                search = '',
                family_id,
                supplier_id
            } = req.query;


            let query = supabase
                .from('ingredients')
                .select(`
          *,
          product_families (id, name, safety_buffer_pct),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `, { count: 'exact' })
                .in('organization_id', orgIds)
                .is('deleted_at', null);


            // Filtros
            if (search) {
                query = query.ilike('name', `%${search}%`);
            }
            if (family_id) {
                query = query.eq('family_id', family_id);
            }
            if (supplier_id) {
                query = query.eq('supplier_id', supplier_id);
            }


            // Paginación
            const offset = (Number(page) - 1) * Number(limit);
            query = query.range(offset, offset + Number(limit) - 1);


            const { data, error, count } = await query.order('name');


            if (error) throw error;


            res.json({
                data,
                pagination: {
                    total: count || 0,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil((count || 0) / Number(limit)),
                },
            });
        } catch (error: any) {
            logger.error('Error fetching ingredients:', error);
            res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }


    async getById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            const { data, error } = await supabase
                .from('ingredients')
                .select(`
          *,
          product_families (id, name, safety_buffer_pct),
          suppliers (id, name, contact_email),
          units!ingredients_unit_id_fkey (id, name, abbreviation, type)
        `)
                .eq('id', id)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .single();


            if (error || !data) {
                throw new AppError(404, 'Ingredient not found');
            }


            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error fetching ingredient:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient' });
        }
    }


    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const {
                name,
                description,
                family_id,
                supplier_id,
                cost_price,
                unit_id,
                stock_current,
                stock_min,
                barcode,
            } = req.body;


            const organizationId = req.user!.organizationIds[0];


            const { data, error } = await supabase
                .from('ingredients')
                .insert({
                    organization_id: organizationId,
                    name,
                    description,
                    family_id,
                    supplier_id,
                    cost_price,
                    unit_id,
                    stock_current: stock_current || 0,
                    stock_min: stock_min || 0,
                    barcode,
                })
                .select(`
          *,
          product_families (id, name),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `)
                .single();


            if (error) {
                if (error.code === '23505') {
                    throw new AppError(409, 'Ingredient with this name already exists');
                }
                throw error;
            }


            res.status(201).json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error creating ingredient:', error);
            res.status(500).json({ error: 'Failed to create ingredient' });
        }
    }


    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;
            const updateData = req.body;


            // Verificar ownership
            const { data: existing } = await supabase
                .from('ingredients')
                .select('id')
                .eq('id', id)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .single();


            if (!existing) {
                throw new AppError(404, 'Ingredient not found');
            }


            const { data, error } = await supabase
                .from('ingredients')
                .update(updateData)
                .eq('id', id)
                .select(`
          *,
          product_families (id, name),
          suppliers (id, name),
          units!ingredients_unit_id_fkey (id, name, abbreviation)
        `)
                .single();


            if (error) throw error;


            res.json({ data });
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Error updating ingredient:', error);
            res.status(500).json({ error: 'Failed to update ingredient' });
        }
    }


    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const orgIds = req.user!.organizationIds;


            // Soft delete
            const { error } = await supabase
                .from('ingredients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .in('organization_id', orgIds);


            if (error) throw error;


            res.json({ message: 'Ingredient deleted successfully' });
        } catch (error: any) {
            logger.error('Error deleting ingredient:', error);
            res.status(500).json({ error: 'Failed to delete ingredient' });
        }
    }


    async getLowStock(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orgIds = req.user!.organizationIds;


            const { data, error } = await supabase
                .from('ingredients')
                .select(`
          *,
          product_families (name),
          suppliers (name),
          units!ingredients_unit_id_fkey (abbreviation)
        `)
                .in('organization_id', orgIds)
                .is('deleted_at', null)
                .order('stock_current', { ascending: true });


            if (error) throw error;


            const filtered = (data || []).filter(
                (row) => Number(row.stock_current) <= Number(row.stock_min)
            );
            res.json({ data: filtered, total: filtered.length });
        } catch (error: any) {
            logger.error('Error fetching low stock ingredients:', error);
            res.status(500).json({ error: 'Failed to fetch low stock ingredients' });
        }
    }


    async analyzeCSV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const file = (req as any).file;


            if (!file) {
                throw new AppError(400, 'No file uploaded');
            }


            const organizationId = req.user!.organizationIds[0];
            const importer = new CSVImporterService();

            const buffer = getImportBuffer(file);
            const analysis = await importer.analyzeCSV(buffer, organizationId);


            res.json(analysis);
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error({ err: error }, 'Error analyzing CSV');
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: 'Failed to analyze CSV' });
        }
    }


    async importCSV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const file = (req as any).file;
            const { resolutions } = req.body;


            if (!file) {
                throw new AppError(400, 'No file uploaded');
            }


            const organizationId = req.user!.organizationIds[0];
            const importer = new CSVImporterService();

            const buffer = getImportBuffer(file);
            const result = await importer.executeImport(
                buffer,
                organizationId,
                JSON.parse(resolutions || '[]')
            );


            res.json(result);
        } catch (error: any) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error({ err: error }, 'Error importing CSV');
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: 'Failed to import CSV' });
        }
    }
}


export const uploadMiddleware = upload.single('file');
