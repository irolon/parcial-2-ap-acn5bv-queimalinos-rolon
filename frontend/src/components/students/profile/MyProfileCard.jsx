import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { goalLabel, levelLabel } from '@/utils/students/studentOptions';

const NOT_SET = 'Sin definir';

function Field({ label, value }) {
  return (
    <div>
      <dt className="mb-1 font-mono text-[10px] uppercase tracking-[0.8px] text-ink6">{label}</dt>
      <dd className="font-body text-sm text-bone0">{value}</dd>
    </div>
  );
}

/** Los datos del propio alumno en Mi perfil: avatar, nombre, email, objetivo y nivel. Solo lectura, los cambia su entrenador. */
export default function MyProfileCard({ student }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Avatar name={student.name} size={72} decorative />
        <h2 className="mt-2 font-display text-lg font-semibold text-bone0">{student.name}</h2>
        <p className="max-w-full break-words font-body text-sm text-ink6">{student.email}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <Field label="Objetivo" value={goalLabel(student.goal) ?? NOT_SET} />
        <Field label="Nivel" value={levelLabel(student.level) ?? NOT_SET} />
      </dl>
      <p className="mt-5 border-t border-ink2 pt-4 font-body text-[13px] text-ink6">
        Para cambiar tus datos, hablá con tu entrenador
      </p>
    </Card>
  );
}
