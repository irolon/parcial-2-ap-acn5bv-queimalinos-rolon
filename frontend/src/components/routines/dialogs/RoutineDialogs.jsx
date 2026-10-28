import AssignRoutineDialog from './AssignRoutineDialog';
import SaveTemplateDialog from './SaveTemplateDialog';
import UseTemplateDialog from './UseTemplateDialog';

/**
 * Modal abierto del editor (`dialog` = `{ type }`) o nada. `on` trae los manejadores de la página:
 * `assigned`, `invalid`, `templateGone`, `invalidRows`, `invalidTemplate`, `load`, `saved`, `close` y `hasContent` (si el editor tiene algo que perder).
 */
export default function RoutineDialogs({ dialog, state, byId, preselectedStudentId, on }) {
  switch (dialog?.type) {
    case 'assign':
      return (
        <AssignRoutineDialog
          state={state}
          preselectedStudentId={preselectedStudentId}
          onAssigned={on.assigned}
          onInvalid={on.invalid}
          onTemplateGone={on.templateGone}
          onClose={on.close}
        />
      );
    case 'template':
      return <UseTemplateDialog hasContent={on.hasContent} exercisesById={byId} onLoad={on.load} onClose={on.close} />;
    case 'save':
      return <SaveTemplateDialog state={state} onSaved={on.saved} onInvalid={on.invalidRows} onServerInvalid={on.invalidTemplate} onClose={on.close} />;
    default:
      return null;
  }
}
