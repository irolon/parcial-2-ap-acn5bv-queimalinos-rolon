package com.fittrainer.ui.students.metrics.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.fittrainer.data.students.metrics.MetricField
import com.fittrainer.data.students.metrics.MetricForm
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.students.edit.BirthDateField
import com.fittrainer.ui.students.metrics.MetricSheet
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.LocalDate

/** Hoja "Nueva medida": medidas opcionales (al menos una), fecha de hoy por defecto y nunca futura. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewMetricSheet(
    sheet: MetricSheet,
    today: LocalDate,
    onChange: ((MetricForm) -> MetricForm) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("Nueva medida", style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            sheet.notice?.let { NoticeBanner(it) }
            sheet.errors[null]?.let { Text(it, color = FtColors.Coral) }
            val f = sheet.form
            val e = sheet.errors
            // Con un intento pendiente los campos no se editan (ver MetricSheet.pending).
            val editable = sheet.pending == null && !sheet.saving
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                NumberField("Peso (kg)", f.weight, e[MetricField.WEIGHT], editable, Modifier.weight(1f)) { v -> onChange { it.copy(weight = v) } }
                NumberField("Altura (cm)", f.height, e[MetricField.HEIGHT], editable, Modifier.weight(1f)) { v -> onChange { it.copy(height = v) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                NumberField("Grasa (%)", f.bodyFat, e[MetricField.BODY_FAT], editable, Modifier.weight(1f)) { v -> onChange { it.copy(bodyFat = v) } }
                NumberField("Cintura (cm)", f.waist, e[MetricField.WAIST], editable, Modifier.weight(1f)) { v -> onChange { it.copy(waist = v) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                NumberField("Cadera (cm)", f.hip, e[MetricField.HIP], editable, Modifier.weight(1f)) { v -> onChange { it.copy(hip = v) } }
                NumberField("Pecho (cm)", f.chest, e[MetricField.CHEST], editable, Modifier.weight(1f)) { v -> onChange { it.copy(chest = v) } }
            }
            BirthDateField(f.date, today, e[MetricField.DATE], label = "FECHA", clearable = false) { d -> onChange { it.copy(date = d ?: today) } }
            Button(onClick = onSave, enabled = !sheet.saving, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text(if (sheet.saving) "Guardando…" else if (sheet.pending != null) "Reintentar" else "Guardar")
            }
        }
    }
}

@Composable
private fun NumberField(label: String, value: String, error: String?, enabled: Boolean, modifier: Modifier, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = modifier,
        enabled = enabled,
        label = { Text(label) },
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
    )
}
