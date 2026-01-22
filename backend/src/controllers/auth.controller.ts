import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class AuthController {
    /**
     * Register: Crear usuario + organización nueva
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, name, organizationName } = req.body;

            // 1. Verificar si el email ya existe
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                throw new AppError(409, 'Email already registered');
            }

            // 2. Hash de password
            const passwordHash = await bcrypt.hash(password, 10);

            // 3. Crear usuario
            const { data: newUser, error: userError } = await supabase
                .from('organization_members') // Assuming user table management by Supabase Auth or custom table
                .insert({
                    // This logic depends on whether 'users' is a custom table or if we use Supabase Auth
                    // In the provided schema, 'users' is a custom table.
                })
                // NOTE: The user's custom schema defines a 'users' table.
                // Let's stick to the providing SQL schema from earlier steps.
                ;

            // I will implement the logic based on the users table provided in the schema.
            const { data: createdUser, error: uError } = await supabase
                .from('users')
                .insert({
                    email,
                    password_hash: passwordHash,
                    name,
                })
                .select()
                .single();

            if (uError || !createdUser) {
                logger.error('Error creating user:', uError);
                throw new AppError(500, 'Failed to create user');
            }

            // 4. Crear organización
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: organizationName,
                    plan: 'FREE',
                })
                .select()
                .single();

            if (orgError || !newOrg) {
                logger.error('Error creating organization:', orgError);
                // Rollback: eliminar usuario
                await supabase.from('users').delete().eq('id', createdUser.id);
                throw new AppError(500, 'Failed to create organization');
            }

            // 5. Vincular usuario a organización como ORG_ADMIN
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    user_id: createdUser.id,
                    organization_id: newOrg.id,
                    role: 'ORG_ADMIN',
                });

            if (memberError) {
                logger.error('Error creating membership:', memberError);
                throw new AppError(500, 'Failed to link user to organization');
            }

            // 6. Generar JWT
            const token = jwt.sign(
                { userId: createdUser.id, email: createdUser.email },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: createdUser.id,
                    email: createdUser.email,
                    name: createdUser.name,
                },
                organization: {
                    id: newOrg.id,
                    name: newOrg.name,
                    plan: newOrg.plan,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Register error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Login: Autenticar usuario
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            // 1. Buscar usuario
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .is('deleted_at', null)
                .single();

            if (userError || !user) {
                throw new AppError(401, 'Invalid credentials');
            }

            // 2. Verificar password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                throw new AppError(401, 'Invalid credentials');
            }

            // 3. Actualizar last_login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);

            // 4. Generar JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
                return;
            }
            logger.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Logout (placeholder - implementar blacklist de tokens si es necesario)
     */
    async logout(req: Request, res: Response): Promise<void> {
        res.json({ message: 'Logout successful' });
    }
}
