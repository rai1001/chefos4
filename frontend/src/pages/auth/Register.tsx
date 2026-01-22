import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        organizationName: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authService.register(formData);
            setAuth(response.user, response.token);
            toast({ title: '¡Cuenta creada exitosamente!' });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                title: 'Error en el registro',
                description: error.response?.data?.error || 'No se pudo crear la cuenta',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Crear cuenta</h1>
                    <p className="mt-2 text-muted-foreground">Comienza gratis hoy</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Juan Pérez"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="input-large"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="input-large"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                            className="input-large"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="organizationName">Nombre del restaurante/hotel</Label>
                        <Input
                            id="organizationName"
                            type="text"
                            placeholder="Mi Restaurante"
                            value={formData.organizationName}
                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                            required
                            className="input-large"
                        />
                    </div>

                    <Button type="submit" className="btn-large w-full" disabled={isLoading}>
                        {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                    </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
