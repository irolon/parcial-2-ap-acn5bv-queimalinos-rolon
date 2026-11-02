package com.fittrainer.data.repository

import java.io.IOException
import retrofit2.HttpException

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

    /** El recurso no existe o ya no es de este usuario (el backend responde 403 o 404 sin distinguir). */
    data object NotFound : DataError
}

class DataException(val error: DataError, cause: Throwable? = null) : Exception(cause)

/** Falla de red, HTTP o de parseo → error que entiende la UI. */
fun Exception.toDataError(): DataError = when (this) {
    is IOException -> DataError.Offline
    is HttpException -> DataError.Http(code())
    else -> DataError.Unknown
}
