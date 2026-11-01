package com.fittrainer.ui.students.edit

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.invitation.invite.GOALS
import com.fittrainer.data.invitation.invite.LEVELS
import com.fittrainer.data.students.detail.EditField
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.invitations.components.EquipmentChips
import com.fittrainer.ui.invitations.components.FieldLabel
import com.fittrainer.ui.invitations.components.OptionPicker
import com.fittrainer.ui.invitations.levelLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.students.detail.DETAIL_GONE
import com.fittrainer.ui.students.detail.DETAIL_NEEDS_NETWORK
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Editar datos del alumno. "Guardar" queda deshabilitado sin cambios o sin red. */
@Composable
fun EditStudentScreen(onBack: () -> Unit, onGone: () -> Unit, viewModel: EditStudentViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.saved) { if (state.saved) onBack() }
    val context = LocalContext.current
    LaunchedEffect(state.gone) {
        if (state.gone) {
            Toast.makeText(context, DETAIL_GONE, Toast.LENGTH_LONG).show()
            onGone()
        }
    }
    Column(
        Modifier.fillMaxSize().background(FtColors.Background).verticalScroll(rememberScrollState()).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
            }
            Text("Editar datos", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
        }
        if (state.offline) OfflineIndicator(DETAIL_NEEDS_NETWORK)
        state.notice?.let { NoticeBanner(it, viewModel::dismissNotice) }
        val form = state.form ?: return@Column
        val e = state.errors
        FieldLabel("NOMBRE Y APELLIDO")
        OutlinedTextField(
            form.name, { v -> viewModel.onChange({ it.copy(name = v) }, EditField.NAME) },
            Modifier.fillMaxWidth(), isError = EditField.NAME in e, supportingText = e[EditField.NAME]?.let { { Text(it) } }, singleLine = true,
        )
        // goal y level no se pueden borrar desde el PATCH: sin opción "Sin definir" si ya tienen valor.
        OptionPicker("OBJETIVO", form.goal, GOALS, ::goalLabel, e[EditField.GOAL], allowNone = form.goal == null) { v ->
            viewModel.onChange({ it.copy(goal = v ?: it.goal) }, EditField.GOAL)
        }
        OptionPicker("NIVEL", form.level, LEVELS, ::levelLabel, e[EditField.LEVEL], allowNone = form.level == null) { v ->
            viewModel.onChange({ it.copy(level = v ?: it.level) }, EditField.LEVEL)
        }
        BirthDateField(form.birthDate, viewModel.today(), e[EditField.BIRTH_DATE]) { d ->
            viewModel.onChange({ it.copy(birthDate = d) }, EditField.BIRTH_DATE)
        }
        EquipmentChips(
            form.equipment, e[EditField.EQUIPMENT],
            onAdd = { t -> val item = t.trim(); if (item.isNotEmpty()) viewModel.onChange({ it.copy(equipment = (it.equipment + item).distinct()) }, EditField.EQUIPMENT) },
            onRemove = { i -> viewModel.onChange({ it.copy(equipment = it.equipment.filterIndexed { j, _ -> j != i }) }, EditField.EQUIPMENT) },
        )
        FieldLabel("LESIONES")
        OutlinedTextField(
            form.injuries, { v -> viewModel.onChange({ it.copy(injuries = v) }, EditField.INJURIES) },
            Modifier.fillMaxWidth(), isError = EditField.INJURIES in e, supportingText = e[EditField.INJURIES]?.let { { Text(it) } }, minLines = 3,
        )
        Button(onClick = viewModel::onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text(if (state.saving) "Guardando…" else "Guardar")
        }
    }
}
