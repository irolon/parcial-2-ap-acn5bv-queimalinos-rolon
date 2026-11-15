const STEPS = [
  'Escanea el QR con su celular',
  'Se abre la app con sus datos precargados',
  'Confirma y elige contraseña',
  'Entra a su primera rutina',
];

/** Caja "QUÉ VE EL ALUMNO" con los 4 pasos del prototipo. */
export default function StudentSteps() {
  return (
    <section
      aria-labelledby="student-steps-title"
      className="mt-3.5 rounded-lg border border-ink2 bg-ink1 p-3.5"
    >
      <h3 id="student-steps-title" className="mb-1.5 font-mono text-[9px] tracking-[1px] text-ink6">
        QUÉ VE EL ALUMNO
      </h3>
      <ol className="list-decimal pl-[18px] font-body text-xs leading-[1.7] text-bone0">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
