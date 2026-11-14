import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import EditContactDialog from '@/components/student/profile/EditContactDialog';
import ProfilePhoto from '@/components/student/profile/ProfilePhoto';
import { goalLabel, levelLabel } from '@/utils/students/studentOptions';

const NOT_SET = 'Sin definir';
const NO_PHONE = 'Sin cargar';

function Field({ label, value }) {
  return (
    <div>
      <dt className="mb-1 font-mono text-[10px] uppercase tracking-[0.8px] text-ink6">{label}</dt>
      <dd className="break-words font-body text-sm text-bone0">{value}</dd>
    </div>
  );
}

/**
 * Los datos del propio alumno en Mi perfil (GX2): su foto, nombre, email, teléfono, objetivo y nivel. Cambia su foto,
 * su nombre y su teléfono; objetivo y nivel los define su entrenador/a.
 */
export default function MyProfileCard({ student }) {
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <ProfilePhoto student={student} />
        <h2 className="mt-2 font-display text-lg font-semibold text-bone0">{student.name}</h2>
        <p className="max-w-full break-words font-body text-sm text-ink6">{student.email}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Teléfono" value={student.phone || NO_PHONE} />
        </div>
        <Field label="Objetivo" value={goalLabel(student.goal) ?? NOT_SET} />
        <Field label="Nivel" value={levelLabel(student.level) ?? NOT_SET} />
      </dl>
      <div className="mt-5 flex flex-col gap-3 border-t border-ink2 pt-4">
        <p className="font-body text-[13px] text-ink6">Objetivo y nivel los define tu entrenador/a</p>
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setEditing(true)}>
          Editar datos
        </Button>
      </div>
      {editing && <EditContactDialog student={student} onClose={() => setEditing(false)} />}
    </Card>
  );
}
