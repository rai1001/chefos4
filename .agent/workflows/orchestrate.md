---
description: Orquestador de habilidades - coordina múltiples skills para tareas complejas
---

# Orquestador de Habilidades

Esta workflow coordina el uso de múltiples habilidades especializadas para resolver tareas complejas que requieren diferentes expertises.

## Cuándo Usar

Usa `/orchestrate` cuando necesites:
- Múltiples etapas que requieren diferentes especialidades
- Combinar seguridad + tests + documentación
- Crear features completas con calidad profesional
- Coordinar auditoría, implementación y optimización

## Habilidades Disponibles

1. **auditor-de-seguridad** - Vulnerabilidades y buenas prácticas
2. **generador-de-documentacion** - READMEs, guías, diagramas
3. **arquitecto-de-pruebas** - Diseño e implementación de tests
4. **optimizador-de-rendimiento** - Cuellos de botella y mejoras
5. **explicador-de-codigo** - Clarificación de lógica compleja
6. **importador-de-excel** - Manejo profesional de datos externos
7. **creador-de-habilidades** - Nuevas capacidades para el agente

## Flujo de Ejecución

### 1. Analizar la Petición

Lee la solicitud del usuario e identifica:
- ¿Qué habilidades específicas se necesitan?
- ¿En qué orden deben ejecutarse?
- ¿Hay dependencias entre pasos?

**Criterios de Selección**:
- **Seguridad** → auditor-de-seguridad
- **Documentación falta** → generador-de-documentacion
- **Sin tests** → arquitecto-de-pruebas
- **Lento/ineficiente** → optimizador-de-rendimiento
- **Código confuso** → explicador-de-codigo
- **Import/export masivo** → importador-de-excel
- **Nueva funcionalidad** → creador-de-habilidades

### 2. Crear Plan de Ejecución

Genera un `implementation_plan.md` que incluya:

```markdown
# [Nombre de la Tarea]

## Habilidades Requeridas
- [ ] skill-1 - Razón
- [ ] skill-2 - Razón
- [ ] skill-3 - Razón

## Secuencia de Ejecución

### Paso 1: [Skill Name]
**Objetivo**: ...
**Entradas**: ...
**Salidas esperadas**: ...

### Paso 2: [Skill Name]
**Objetivo**: ...
**Dependencias**: Paso 1
**Salidas esperadas**: ...

## Criterios de Éxito
- [ ] Criterio 1
- [ ] Criterio 2
```

### 3. Solicitar Aprobación

Pide al usuario que revise y apruebe el plan antes de ejecutar.

### 4. Ejecutar Secuencialmente

Para cada skill en el plan:

```
1. Lee G:\visual\CHEFOS2\.agent\skills\[skill-name]\SKILL.md
2. Nota: sincroniza habilidades externas con `npm run sync:skills:overwrite`.
3. Aplica las instrucciones de esa skill
4. Verifica que el resultado cumple expectativas
5. Continúa con siguiente skill
```

### 5. Verificación Final

Al completar todos los pasos:
- Revisa coherencia global
- Verifica criterios de éxito
- Genera walkthrough.md con resumen

## Ejemplo de Uso

**Usuario**: 
```
/orchestrate "Crear sistema de notificaciones por email seguro, 
con tests y bien documentado"
```

**Orquestador genera plan**:
```markdown
## Habilidades Requeridas
1. auditor-de-seguridad (validar seguridad de emails)
2. creador-de-habilidades (implementar servicio)
3. arquitecto-de-pruebas (crear suite de tests)
4. generador-de-documentacion (API docs + guía de uso)

## Secuencia
1. Security audit del diseño
2. Implementar servicio de emails
3. Tests (unit, integration, security)
4. Documentar API y casos de uso
```

**Ejecución**:
1. Lee `auditor-de-seguridad/SKILL.md` → aplica audit
2. Lee `creador-de-habilidades/SKILL.md` → implementa
3. Lee `arquitecto-de-pruebas/SKILL.md` → crea tests
4. Lee `generador-de-documentacion/SKILL.md` → documenta

## Notas Importantes

- El orquestador NO ejecuta las skills en paralelo (por ahora)
- Cada skill debe completarse antes de la siguiente
- Si un paso falla, detener y reportar al usuario
- El plan puede ajustarse si el usuario lo solicita

## Comandos

- `/orchestrate [tarea]` - Analiza tarea y genera plan
- Usuario revisa y aprueba
- Orquestador ejecuta secuencia completa
