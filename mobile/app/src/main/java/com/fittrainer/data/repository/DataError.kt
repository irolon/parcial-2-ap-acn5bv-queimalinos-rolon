package com.fittrainer.data.repository

/** Errores de datos que la UI entiende, sin exponer Retrofit ni OkHttp fuera de la capa data. */
sealed interface DataError {
    data object Offline : DataError
    data object InvalidCredentials : DataError
    data class Http(val code: Int) : DataError
    data object Unknown : DataError
    data object InvitationNotFound : DataError
    data object InvitationExpired : DataError
    data object InvitationUsed : DataError
    data object StudentEmailExists : DataError
}

class DataException(val error: DataError, cause: Throwable? = null) : Exception(cause)
