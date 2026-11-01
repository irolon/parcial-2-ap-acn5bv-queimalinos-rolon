package com.fittrainer.ui.students.sessions

const val SESSIONS_SECTION = "ÚLTIMAS SESIONES"
const val SESSIONS_TITLE = "Sesiones"
const val SESSIONS_EMPTY = "Todavía no registró sesiones."
const val SESSIONS_NOT_LOADED = "Conectate para ver sus sesiones."
const val SESSIONS_SEE_ALL = "Ver todas"
const val SESSIONS_SEE_MORE = "Ver más"
const val SESSIONS_REFRESH_FAILED = "No pudimos actualizar las sesiones."
const val LOAD_MORE_FAILED = "No pudimos traer más sesiones. Revisá la conexión."
const val COMMENT_TITLE = "TU COMENTARIO"
const val COMMENT_HINT = "Escribile algo sobre esta sesión…"
const val COMMENT_SAVED = "Comentario guardado"
const val COMMENT_DELETED = "Comentario borrado"
const val COMMENT_FAILED = "No pudimos guardar el comentario. Probá de nuevo."
const val COMMENT_GONE = "Esta sesión ya no está disponible."
const val COMMENT_NEEDS_NETWORK = "Necesitás conexión para comentar"
const val DETAIL_REFRESH_FAILED = "No pudimos actualizar esta sesión."
const val DETAIL_NOT_LOADED = "Todavía no se bajó el detalle de esta sesión. Conectate para verlo."

/** Tope del backend para trainer_comment. */
const val MAX_COMMENT = 1000

/** "12/1000". */
fun commentCounter(text: String): String = "${text.length}/$MAX_COMMENT"
