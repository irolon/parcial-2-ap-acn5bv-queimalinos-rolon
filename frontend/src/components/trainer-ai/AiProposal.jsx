import { useState } from 'react';
import { Info } from 'lucide-react';
import { Link } from 'react-router';
import Button from '@/components/shared/ui/Button';
import { NEW_ROUTINE, aiBlockHref } from '@/routes/routeTable';
import { GHOST_LINK } from './links';
import ProposalBlock from './ProposalBlock';
import SaveTemplatesDialog from './SaveTemplatesDialog';

const NOTICE = 'Esta es una propuesta de la IA. Revisala y ajustala antes de asignarla.';

function SavedNotice({ saved }) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-2 font-body text-sm text-bone0">
      <span className="font-semibold text-good">{saved.already ? 'Ya estaba guardada' : 'Guardadas'}</span>
      <span className="text-ink6">· Las encontrás en &quot;Usar plantilla&quot; del editor.</span>
      <Link to={NEW_ROUTINE.path} className="text-accentText underline hover:text-bone0">Ir al editor</Link>
    </p>
  );
}

/**
 * Propuesta de la IA: aviso, porqué, un bloque por tarjeta y las acciones generales (guardar como plantillas,
 * generar otra y armar a mano). `session` es la del asistente (`useAiSession`).
 */
export default function AiProposal({ session, manualHref, onSaved, onAgain }) {
  const [saving, setSaving] = useState(false);
  const { proposal, generationId, student, assigned = {}, saved } = session;
  const blocks = proposal.routines;
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2.5 rounded-xl border border-accentText/40 bg-accent/10 px-4 py-3 font-body text-sm text-bone0">
        <Info size={16} className="mt-0.5 shrink-0 text-accentText" aria-hidden="true" />
        {NOTICE}
      </p>
      <div className="rounded-xl border border-ink2 bg-ink1 px-5 py-4">
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[1px] text-ink6">Por qué se armó así</p>
        <p className="font-body text-sm text-bone0">{proposal.rationale}</p>
      </div>
      {blocks.map((block, index) => (
        <ProposalBlock
          key={`${generationId}-${index}`}
          block={block}
          assigned={assigned[index]}
          editHref={aiBlockHref({ studentId: student?.id, generationId, index })}
        />
      ))}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved ? <SavedNotice saved={saved} /> : <Button variant="ghost" onClick={() => setSaving(true)}>Guardar como plantillas</Button>}
        <Button variant="ghost" onClick={onAgain}>Generar otra</Button>
        <Link to={manualHref} className={GHOST_LINK}>Armar a mano</Link>
      </div>
      {saving && (
        <SaveTemplatesDialog
          generationId={generationId}
          blocks={blocks.length}
          onClose={() => setSaving(false)}
          onSaved={(result) => {
            setSaving(false);
            onSaved(result);
          }}
        />
      )}
    </div>
  );
}
