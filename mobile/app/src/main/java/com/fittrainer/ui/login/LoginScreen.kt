package com.fittrainer.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.fittrainer.data.session.Role
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Login PROVISORIO de desarrollo: elegís el rol. La tarjeta de auth lo reemplaza. */
@Composable
fun LoginScreen(viewModel: LoginViewModel = hiltViewModel()) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
    ) {
        Text("FitTrainer", style = MaterialTheme.typography.displayLarge)
        Text("MODO DESARROLLO", style = MaterialTheme.typography.labelMedium, color = FtColors.Amber)
        Text(
            "Elegí con qué rol entrar. El login real llega en la tarjeta de auth.",
            style = MaterialTheme.typography.bodyMedium,
            color = FtColors.TextSecondary,
        )
        Button(
            onClick = { viewModel.signInAs(Role.STUDENT) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Entrar como alumno") }
        OutlinedButton(
            onClick = { viewModel.signInAs(Role.TRAINER) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Entrar como entrenador") }
    }
}
