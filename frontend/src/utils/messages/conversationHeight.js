// AppShell no da un alto al <main>, así que la conversación necesita uno explícito:
// 100dvh menos topbar y padding del main (aprox. 9rem). Si cambia el layout, ajustar acá.
export const CONVERSATION_HEIGHT = 'h-[calc(100dvh-9rem)] min-h-[420px]';
