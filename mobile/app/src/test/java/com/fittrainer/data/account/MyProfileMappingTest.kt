package com.fittrainer.data.account

import com.fittrainer.data.api.account.ProfileDto
import com.fittrainer.data.session.Role
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MyProfileMappingTest {
    private val dto = ProfileDto("t1", "Profe", "profe@test.com", professionalTitle = "Lic.", avatarUrl = "https://firmada")

    @Test fun trainerKeepsAvatarUrl() {
        assertEquals("https://firmada", dto.toEntity("t1", Role.TRAINER, 1L).avatarUrl)
    }

    @Test fun studentKeepsAvatarUrl() {
        assertEquals("https://firmada", dto.toEntity("u1", Role.STUDENT, 1L).avatarUrl)
    }

    @Test fun missingAvatarIsNull() {
        assertNull(dto.copy(avatarUrl = null).toEntity("t1", Role.TRAINER, 1L).avatarUrl)
    }
}
