# 🛠️ Guía de Desarrollo - ChefOS

Esta guía establece los estándares y flujos de trabajo para contribuir al desarrollo de ChefOS.

## 📏 Estándares de Código

### General
*   **Idioma**: Código, comentarios y commits en **Inglés** (preferible) o Español consistente.
*   **Formato**: Usar Prettier para formateo automático.
*   **Linting**: Respetar las reglas de ESLint configuradas. No ignorar warnings sin justificación.

### Naming Conventions
*   **Variables/Funciones**: `camelCase` (ej. `calculateTotalCost`).
*   **Clases/Componentes**: `PascalCase` (ej. `RecipeController`, `UserProfile`).
*   **Constantes**: `UPPER_SNAKE_CASE` (ej. `MAX_LOGIN_ATTEMPTS`).
*   **Interfaces**: `PascalCase` (ej. `Recipe`). Evitar prefijo `I` (ej. `IRecipe`).

## 🔄 Flujo de Git

1.  **Main/Master**: Rama de producción estable.
2.  **Develop**: Rama de integración principal.
3.  **Feature Branches**: Ramas para nuevas funcionalidades salen de `develop`.
    *   Formato: `feature/nombre-de-la-funcionalidad`
    *   Ejemplo: `feature/auth-rate-limiting`

### Commits
Usar formato [Conventional Commits](https://www.conventionalcommits.org/):
*   `feat: add new recipe calculation logic`
*   `fix: resolve null pointer in user auth`
*   `docs: update API documentation`
*   `refactor: optimize database queries`

## 🧪 Testing

### Backend
*   **Framework**: Vitest / Jest.
*   **Ubicación**: `backend/src/tests/`.
*   **Cobertura**: Objetivo > 70%.
*   **Comando**: `npm test` en directorio backend.

Tips:
*   Mockear siempre llamadas a servicios externos (Supabase, APIs de terceros).
*   Probar Happy Path y Edge Cases (inputs nulos, arrays vacíos).

### Frontend
*   **Framework**: Vitest + React Testing Library.
*   **Ubicación**: Archivos `.test.tsx` junto a los componentes o en `src/tests`.

## 🔒 Seguridad

*   **Secretos**: NUNCA commitear credenciales o claves API. Usar `.env`.
*   **Validación**: Validar todos los inputs en el backend, no confiar solo en validación frontend.
*   **Auditoría**: Ejecutar auditorías de seguridad periódicas (npm audit).

## 🚀 Despliegue

El despliegue se realiza automáticamente a través de pipelines de CI/CD (GitHub Actions) al hacer merge a `main`.
Asegurarse de que todos los tests pasen antes de solicitar un Pull Request.

## Skills

- Sync external skills into the repo with `npm run sync:skills` (dry run) or `npm run sync:skills:overwrite`.
- Update sources and overrides in `skills/skill-registry.json`.
