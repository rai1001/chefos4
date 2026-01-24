## 2026-01-24 - Client-side Filtering Anti-Pattern
**Learning:** Found `eventsService.getAll` fetching all records for client-side filtering, despite backend `EventsController` supporting query params (`status`, `start_date`, etc.). The frontend service interface didn't expose these params.
**Action:** Always check the backend controller implementation before accepting client-side filtering. Expose hidden backend filters in the frontend service to reduce payload size.
