package com.fittrainer.ui.routines.trainer.section

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.trainer.ASSIGN_ROUTINE
import com.fittrainer.ui.theme.FtColors

/** Botón primario del encabezado de la ficha (prototipo EM_PerfilAlumno). Sin red queda deshabilitado. */
@Composable
fun AssignRoutineButton(enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
    ) { Text(ASSIGN_ROUTINE) }
}
