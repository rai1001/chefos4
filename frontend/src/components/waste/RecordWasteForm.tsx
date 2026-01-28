export function RecordWasteForm({ onSuccess }: { onSuccess: () => void }) {
    return (
        <div className="p-4">
            <p>Formulario de Merma (Placeholder)</p>
            <button onClick={onSuccess}>Guardar</button>
        </div>
    );
}
