import { useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { useProductionTasks } from '@/hooks/useProductionTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductionGanttProps {
    eventId?: string;
    startDate?: Date;
    endDate?: Date;
}

export function ProductionGantt({ eventId, startDate, endDate }: ProductionGanttProps) {
    const [viewMode, setViewMode] = useState(ViewMode.Hour);
    const { data: tasks, isLoading } = useProductionTasks({ event_id: eventId });

    if (isLoading) {
        return <div className="p-8 text-center">Cargando timeline...</div>;
    }

    // Convertir tareas a formato Gantt
    const ganttTasks: Task[] = (tasks || []).map((task) => ({
        id: task.id,
        name: task.title,
        start: new Date(task.scheduled_start),
        end: new Date(task.scheduled_end),
        progress: task.progress_pct || 0,
        type: 'task',
        dependencies: [], // TODO: Cargar dependencias
        styles: {
            backgroundColor: getStatusColor(task.status),
            progressColor: '#4ade80',
            progressSelectedColor: '#22c55e',
        },
    }));

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Timeline de Producción</CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === ViewMode.Hour ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode(ViewMode.Hour)}
                    >
                        Horas
                    </Button>
                    <Button
                        variant={viewMode === ViewMode.QuarterDay ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode(ViewMode.QuarterDay)}
                    >
                        6 Horas
                    </Button>
                    <Button
                        variant={viewMode === ViewMode.Day ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode(ViewMode.Day)}
                    >
                        Días
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {ganttTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Gantt
                            tasks={ganttTasks}
                            viewMode={viewMode}
                            locale="es"
                            columnWidth={viewMode === ViewMode.Hour ? 65 : 100}
                            listCellWidth="200"
                            todayColor="rgba(252, 211, 77, 0.3)"
                        />
                    </div>
                ) : (
                    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                        No hay tareas planificadas
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        PENDING: '#94a3b8',
        IN_PROGRESS: '#3b82f6',
        COMPLETED: '#22c55e',
        BLOCKED: '#ef4444',
        CANCELLED: '#64748b',
    };
    return colors[status] || '#94a3b8';
}
