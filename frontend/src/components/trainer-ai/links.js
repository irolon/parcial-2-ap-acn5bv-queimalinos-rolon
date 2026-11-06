// Links con el aspecto de `Button` (primario y ghost, tamaño md y sm).
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg border font-display font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText';
const PRIMARY = 'border-transparent bg-accent text-accentInk hover:bg-accentDim';
const GHOST = 'border-white/[0.14] text-bone0 hover:bg-white/[0.06]';

export const GHOST_LINK = `${BASE} ${GHOST} h-11 px-[18px] text-sm`;
export const PRIMARY_LINK_SM = `${BASE} ${PRIMARY} h-8 px-3 text-[13px]`;
