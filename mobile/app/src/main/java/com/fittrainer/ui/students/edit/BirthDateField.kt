package com.fittrainer.ui.students.edit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.invitations.components.FieldLabel
import com.fittrainer.ui.students.detail.dateLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** Fecha de nacimiento: selector sin fechas futuras y "Borrar". El DatePicker trabaja en UTC. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BirthDateField(value: LocalDate?, today: LocalDate, error: String?, onChange: (LocalDate?) -> Unit) {
    var open by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        FieldLabel("FECHA DE NACIMIENTO")
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            OutlinedButton(onClick = { open = true }, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                Text(dateLabel(value))
            }
            if (value != null) {
                TextButton(onClick = { onChange(null) }, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Borrar") }
            }
        }
        error?.let { Text(it, color = FtColors.Coral) }
    }
    if (!open) return
    val todayMillis = today.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    val picker = rememberDatePickerState(
        initialSelectedDateMillis = value?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli(),
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis <= todayMillis
            override fun isSelectableYear(year: Int) = year <= today.year
        },
    )
    DatePickerDialog(
        onDismissRequest = { open = false },
        confirmButton = {
            TextButton(onClick = {
                picker.selectedDateMillis?.let { onChange(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate()) }
                open = false
            }) { Text("Aceptar") }
        },
        dismissButton = { TextButton(onClick = { open = false }) { Text("Cancelar") } },
    ) { DatePicker(picker) }
}
