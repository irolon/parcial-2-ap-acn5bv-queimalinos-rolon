package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/** Lo que el alumno ve de la subida: el aviso de Hoy y la línea del resumen (spec §6). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class UploadStatusViewModel @Inject constructor(
    sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
) : ViewModel() {

    val counts: StateFlow<UploadCounts> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .flatMapLatest { owner -> owner?.let(status::observeCounts) ?: flowOf(UploadCounts()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UploadCounts())

    fun session(sessionId: String): Flow<SessionUploadRow?> = status.observeSession(sessionId)
}
