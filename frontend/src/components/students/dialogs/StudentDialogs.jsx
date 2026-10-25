import { Fragment } from 'react';
import DeleteMetricDialog from '@/components/body-metrics/dialogs/DeleteMetricDialog';
import MetricFormDialog from '@/components/body-metrics/dialogs/MetricFormDialog';
import AiContextDialog from '@/components/students/dialogs/AiContextDialog';
import DeactivateStudentDialog from '@/components/students/dialogs/DeactivateStudentDialog';
import EditStudentDialog from '@/components/students/dialogs/EditStudentDialog';

/** Renderiza el modal abierto de la ficha (`dialog` = `{ id, type, metric? }`); `id` cambia en cada apertura. */
export default function StudentDialogs({ dialog, student, onClose }) {
  if (!dialog) return null;
  return (
    <Fragment key={dialog.id}>
      <OpenDialog dialog={dialog} student={student} onClose={onClose} />
    </Fragment>
  );
}

function OpenDialog({ dialog, student, onClose }) {
  switch (dialog.type) {
    case 'edit':
      return <EditStudentDialog student={student} onClose={onClose} />;
    case 'context':
      return <AiContextDialog student={student} onClose={onClose} />;
    case 'metric':
      return <MetricFormDialog studentId={student.id} latest={student.latest_metrics} onClose={onClose} />;
    case 'deleteMetric':
      return <DeleteMetricDialog studentId={student.id} metric={dialog.metric} onClose={onClose} />;
    case 'deactivate':
      return <DeactivateStudentDialog student={student} onClose={onClose} />;
    default:
      return null;
  }
}
