package com.fittrainer.testing.fakes.account

import com.fittrainer.data.db.account.MyProfileDao
import com.fittrainer.data.db.account.MyProfileEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

class FakeMyProfileDao : MyProfileDao {
    val rows = MutableStateFlow<Map<String, MyProfileEntity>>(emptyMap())

    override fun observe(ownerId: String): Flow<MyProfileEntity?> = rows.map { it[ownerId] }
    override suspend fun get(ownerId: String): MyProfileEntity? = rows.value[ownerId]
    override suspend fun upsert(row: MyProfileEntity) {
        rows.value = rows.value + (row.ownerId to row)
    }
    override suspend fun clearOwner(ownerId: String) {
        rows.value = rows.value - ownerId
    }
    override suspend fun clear() {
        rows.value = emptyMap()
    }
}
