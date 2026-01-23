import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';
import { errorMiddleware } from '@/middleware/error.middleware';
import { notFoundMiddleware } from '@/middleware/not-found.middleware';
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';

// Routes
import authRoutes from '@/routes/auth.routes';
import ingredientsRoutes from '@/routes/ingredients.routes';
import unitsRoutes from '@/routes/units.routes';
import suppliersRoutes from '@/routes/suppliers.routes';
import eventsRoutes from '@/routes/events.routes';
import occupancyRoutes from '@/routes/occupancy.routes';
import recipesRoutes from '@/routes/recipes.routes';
import productFamiliesRoutes from '@/routes/product-families.routes';
import purchaseOrdersRoutes from '@/routes/purchase-orders.routes';
import analyticsRoutes from '@/routes/analytics.routes';
import notificationRoutes from '@/routes/notification.routes';
import ocrRoutes from './routes/ocr.routes';
import productionTasksRoutes from './routes/production-tasks.routes';
import reportsRoutes from './routes/reports.routes';
import wasteRoutes from './routes/waste.routes';
import webhookRoutes from './routes/webhook.routes';
import hrRoutes from './routes/hr.routes';
import organizationsRoutes from './routes/organizations.routes';
import inventoryRoutes from './routes/inventory.routes';
import deliveryNotesRoutes from './routes/delivery-notes.routes';
import staffRoutes from './routes/staff.routes';
import timeOffRoutes from './routes/time-off.routes';
import schedulesRoutes from './routes/schedules.routes';
import preparationsRoutes from './routes/preparations.routes';
import scheduleRulesRoutes from './routes/schedule-rules.routes';
import cron from 'node-cron';
import { InventoryAlertsJobService } from '@/services/inventory-alerts-job.service';
import { supabase } from '@/config/supabase';


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(helmet());
const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174'];
const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

// =====================================================
// API ROUTES
// =====================================================
const apiPrefix = `/api/${API_VERSION}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/ingredients`, ingredientsRoutes);
app.use(`${apiPrefix}/units`, unitsRoutes);
app.use(`${apiPrefix}/suppliers`, suppliersRoutes);
app.use(`${apiPrefix}/events`, eventsRoutes);
app.use(`${apiPrefix}/occupancy`, occupancyRoutes);
app.use(`${apiPrefix}/recipes`, recipesRoutes);
app.use(`${apiPrefix}/product-families`, productFamiliesRoutes);
app.use(`${apiPrefix}/purchase-orders`, purchaseOrdersRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/ocr`, ocrRoutes);
app.use(`${apiPrefix}/production-tasks`, productionTasksRoutes);
app.use(`${apiPrefix}/reports`, reportsRoutes);
app.use(`${apiPrefix}/waste`, wasteRoutes);
app.use(`${apiPrefix}/webhooks`, webhookRoutes);
app.use(`${apiPrefix}/hr`, hrRoutes);
app.use(`${apiPrefix}/organizations`, organizationsRoutes);
app.use(`${apiPrefix}/inventory`, inventoryRoutes);
app.use(`${apiPrefix}/delivery-notes`, deliveryNotesRoutes);
app.use(`${apiPrefix}/staff`, staffRoutes);
app.use(`${apiPrefix}/time-off`, timeOffRoutes);
app.use(`${apiPrefix}/schedules`, schedulesRoutes);
app.use(`${apiPrefix}/preparations`, preparationsRoutes);
app.use(`${apiPrefix}/schedule-rules`, scheduleRulesRoutes);


// =====================================================
// ERROR HANDLING
// =====================================================
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// =====================================================
// START SERVER
// =====================================================
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
        logger.info(`🔗 API Base: http://localhost:${PORT}${apiPrefix}`);
    });

    if (process.env.ENABLE_ALERTS_CRON === 'true') {
        const cronExpression = process.env.ALERTS_CRON || '0 6 * * *';
        const jobService = new InventoryAlertsJobService();
        cron.schedule(cronExpression, async () => {
            try {
                const { data: organizations } = await supabase.from('organizations').select('id');
                const orgIds = (organizations || []).map((org) => org.id);
                await jobService.runForOrganizations(orgIds);
                logger.info({ cronExpression }, 'Inventory alerts cron executed');
            } catch (error) {
                logger.error(error, 'Inventory alerts cron failed');
            }
        });
        logger.info({ cronExpression }, 'Inventory alerts cron scheduled');
    }
}

export default app;
