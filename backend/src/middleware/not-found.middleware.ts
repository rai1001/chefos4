import { Request, Response } from 'express';

export const notFoundMiddleware = (req: Request, res: Response): void => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
};
