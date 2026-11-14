package com.fittrainer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors

/** El punto verde de "en vivo": un círculo de 8 dp. */
@Composable
fun LiveDot(modifier: Modifier = Modifier) {
    Box(modifier.size(8.dp).background(FtColors.Green, CircleShape))
}
