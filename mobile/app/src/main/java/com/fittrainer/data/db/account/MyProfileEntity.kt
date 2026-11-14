package com.fittrainer.data.db.account

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * El perfil del usuario logueado, alumno o entrenador (una fila por cuenta). [avatarUrl] llega firmada y vence en
 * una hora: se guarda para la sesión y se reemplaza en cada refresco. [role] es el nombre de [com.fittrainer.data.session.Role].
 */
@Entity(tableName = "my_profile")
data class MyProfileEntity(
    @PrimaryKey val ownerId: String,
    val role: String,
    val name: String,
    val email: String,
    val phone: String?,
    val avatarUrl: String?,
    val professionalTitle: String?,
    val fetchedAt: Long,
)
