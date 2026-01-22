import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authService.login({ email, password });
            setAuth(response.user, response.token);
            toast({ title: 'Bienvenido de vuelta!' });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                title: 'Error de autenticación',
                description: error.response?.data?.error || 'Credenciales inválidas',
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
                    <h1 className="text-3xl font-bold">🍳 CulinaryOS</h1>
                    <p className="mt-2 text-muted-foreground">Gestión profesional de cocinas</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="input-large"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="input-large"
                        />
                    </div>

                    <Button type="submit" className="btn-large w-full" disabled={isLoading}>
                        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="font-medium text-primary hover:underline">
                        Regístrate gratis
                    </Link>
                </p>
            </div>
        </div>
    );
}
