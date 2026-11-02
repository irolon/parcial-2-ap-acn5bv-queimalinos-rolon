package com.fittrainer.ui.invitations.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.InputChip
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.data.invitation.invite.MAX_EQUIPMENT
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Selector de una opción del backend, con "Sin definir" para dejarlo vacío si [allowNone]. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OptionPicker(
    label: String,
    value: String?,
    options: List<String>,
    labelOf: (String?) -> String,
    error: String?,
    allowNone: Boolean = true,
    onSelect: (String?) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        FieldLabel(label)
        ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }) {
            OutlinedTextField(
                value = labelOf(value),
                onValueChange = {},
                readOnly = true,
                isError = error != null,
                supportingText = error?.let { { Text(it) } },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = open) },
                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
            )
            ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                ((if (allowNone) listOf<String?>(null) else emptyList()) + options).forEach { option ->
                    DropdownMenuItem(
                        text = { Text(labelOf(option)) },
                        onClick = { onSelect(option); open = false },
                        modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                    )
                }
            }
        }
    }
}

/** Equipamiento como chips: se escribe uno, "Agregar", y se quita con la cruz. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EquipmentChips(items: List<String>, error: String?, onAdd: (String) -> Unit, onRemove: (Int) -> Unit) {
    var draft by rememberSaveable { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        FieldLabel("EQUIPAMIENTO (${items.size}/$MAX_EQUIPMENT)")
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            OutlinedTextField(
                value = draft,
                onValueChange = { draft = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ej.: mancuernas") },
                isError = error != null,
                singleLine = true,
            )
            TextButton(
                onClick = { onAdd(draft); draft = "" },
                enabled = draft.isNotBlank(),
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            ) { Text("Agregar") }
        }
        error?.let { Text(it, color = FtColors.Coral) }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            items.forEachIndexed { i, item ->
                InputChip(
                    selected = false,
                    onClick = { onRemove(i) },
                    label = { Text(item) },
                    trailingIcon = { Icon(Icons.Filled.Close, contentDescription = "Quitar $item", modifier = Modifier.heightIn(max = 18.dp)) },
                )
            }
        }
    }
}
