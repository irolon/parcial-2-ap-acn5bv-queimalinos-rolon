package com.fittrainer.data.notifications.paging

import com.fittrainer.data.api.notifications.NotificationPageDto as Page
import com.fittrainer.data.db.notifications.NotificationDao
import com.fittrainer.data.notifications.toEntity

/**
 * Escribe un refresco en Room (tarjeta 17). Corre adentro de la transacción del repositorio, así que filas, cursor y
 * no leídas quedan en un solo paso. [page] es la página 1; [unread] las no leídas (hasta 100) para la campana.
 *
 * Cursor ("Ver más"): es el del tramo bajado de corrido desde arriba y vive en la meta, no se deduce de las filas.
 * - Hueco (la página 1 no toca nada guardado): lo viejo deja de ser contiguo, se borra y sigue el del servidor.
 * - Solapamiento: el tramo guardado sigue contiguo, se conserva el cursor guardado (si no había meta, el del servidor).
 * Las no leídas se escriben después del borrado (no se las lleva la ventana de este mismo refresco) y no mueven el cursor.
 * Las lecturas pendientes están en su tabla: nada de esto las toca, y toda fila pendiente se guarda leída.
 */
internal suspend fun NotificationDao.applyRefresh(ownerId: String, page: Page, unread: Page) {
    val rows = page.data.mapNotNull { it.toEntity(ownerId) }
    val unreadRows = unread.data.mapNotNull { it.toEntity(ownerId) }
    val stored = meta(ownerId)
    val overlaps = existingAmong(ownerId, rows.map { it.id }).isNotEmpty()
    val gap = !overlaps && count(ownerId) > 0
    if (gap) clear(ownerId)
    replaceFirstPage(ownerId, rows)
    upsertKeepingRead(ownerId, unreadRows)
    // Lista de no leídas completa: lo guardado sin leer que no vino en ninguna de las dos ya se leyó en otro lado.
    if (unread.meta.nextBefore == null) setReadExcept(ownerId, (rows + unreadRows).map { it.id })
    val cursor = if (overlaps && stored != null) stored.nextBefore else page.meta.nextBefore
    updateMeta(ownerId) { it.copy(everLoaded = true, nextBefore = cursor) }
}

/** Una página de "Ver más" a Room. Devuelve cuántas filas nuevas sumó: las de tipos ajenos y las ya guardadas no cuentan. */
internal suspend fun NotificationDao.applyMore(ownerId: String, page: Page): Int {
    val rows = page.data.mapNotNull { it.toEntity(ownerId) }
    val added = rows.size - existingAmong(ownerId, rows.map { it.id }).size
    upsertKeepingRead(ownerId, rows)
    updateMeta(ownerId) { it.copy(nextBefore = page.meta.nextBefore) }
    return added
}
