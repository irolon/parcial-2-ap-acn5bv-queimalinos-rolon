export const MESSAGES_KEY = ['messages'];
export const conversationsKey = [...MESSAGES_KEY, 'conversations'];
export const unreadKey = [...MESSAGES_KEY, 'unread'];
export const messagesKey = (studentId) => [...MESSAGES_KEY, 'thread', studentId];
// Los mensajes optimistas viven fuera de MESSAGES_KEY para que invalidar la conversación no los toque.
export const pendingKey = (studentId) => ['messages-pending', studentId];

export const POLL_THREAD_MS = 4000;
export const POLL_LIST_MS = 15000;
