import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        organizationIds: string[];
    };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        // Verificar token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
            email: string;
        };

        // Obtener organizaciones del usuario
        const { data: memberships, error } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', decoded.userId);

        if (error) {
            logger.error(error as any, 'Error fetching user organizations:');
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            organizationIds: memberships?.map((m) => m.organization_id) || [],
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

        logger.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
