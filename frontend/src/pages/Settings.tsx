import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WebhooksManager } from "@/components/webhooks/WebhooksManager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Settings() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configuración</h1>
                <p className="text-muted-foreground">Administración y preferencias del sistema.</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General</CardTitle>
                            <CardDescription>Configuración general de la aplicación.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">Próximamente: Configuración de perfil, notificaciones, etc.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="webhooks">
                    <Card>
                        <CardHeader>
                            {/* Header handled inside Manager or here? Manager has its own header. Let's wrap it in CardContent */}
                        </CardHeader>
                        <CardContent>
                            <WebhooksManager />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
