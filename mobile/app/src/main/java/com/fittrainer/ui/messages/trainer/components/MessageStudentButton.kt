package com.fittrainer.ui.messages.trainer.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

const val MESSAGE_STUDENT = "Mensaje"

/** En la ficha del alumno (E11): abre el chat. Sin red igual se ve lo guardado. */
@Composable
fun MessageStudentButton(onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(MESSAGE_STUDENT) }
}
