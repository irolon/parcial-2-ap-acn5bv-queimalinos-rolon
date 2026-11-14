/** Avisos del editor en modo edición: rutina inactiva, error al guardar, confirmación y errores de validación. */
export default function EditMessages({ inactive, status, errors }) {
  return (
    <>
      {inactive && (
        <p className="font-body text-sm text-ink6">Esta rutina está inactiva: el alumno no la ve. Igual podés editarla.</p>
      )}
      {status.error && (
        <p role="alert" className="rounded-xl border border-hot px-4 py-3 font-body text-sm text-bone0">
          No pudimos guardar todos los cambios: {status.error.message}. Lo que ya se guardó quedó en la rutina; tocá
          Guardar cambios para reintentar el resto.
        </p>
      )}
      {status.notice && <p role="status" className="font-body text-sm text-ink6">{status.notice}</p>}
      {errors?.count > 0 && (
        <p role="alert" className="font-mono text-xs text-hot">
          <span className="block">Revisá {errors.count} {errors.count === 1 ? 'campo' : 'campos'}</span>
          {errors.form && <span className="block">{errors.form}</span>}
        </p>
      )}
    </>
  );
}
