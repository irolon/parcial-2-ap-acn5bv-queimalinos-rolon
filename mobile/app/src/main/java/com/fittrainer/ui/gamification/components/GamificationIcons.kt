package com.fittrainer.ui.gamification.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

/**
 * Los cuatro íconos de logros, copiados de Material Icons (Apache 2.0, google/material-design-icons, variante Filled).
 * Van acá en lugar de depender de material-icons-extended, que sumaba ~6,4 MB al APK por solo estos cuatro.
 */
object GamificationIcons {
    val Fire: ImageVector by lazy {
        icon(
            "Fire",
            "M12,12.9l-2.13,2.09C9.31,15.55,9,16.28,9,17.06C9,18.68,10.35,20,12,20s3-1.32,3-2.94c0-0.78-0.31-1.52-0.87-2.07L12,12.9z",
            "M16,6l-0.44,0.55C14.38,8.02,12,7.19,12,5.3V2c0,0-8,4-8,11c0,2.92,1.56,5.47,3.89,6.86C7.33,19.07,7,18.1,7,17.06" +
                "c0-1.32,0.52-2.56,1.47-3.5L12,10.1l3.53,3.47c0.95,0.93,1.47,2.17,1.47,3.5c0,1.02-0.31,1.96-0.85,2.75" +
                "c1.89-1.15,3.29-3.06,3.71-5.3C20.52,10.97,18.79,7.62,16,6z",
        )
    }

    val Trophy: ImageVector by lazy {
        icon(
            "Trophy",
            "M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1" +
                "c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z" +
                "M19,8c0,1.3-0.84,2.4-2,2.82V7h2V8z",
        )
    }

    val Calendar: ImageVector by lazy {
        icon(
            "Calendar",
            "M19,4h-1V2h-2v2H8V2H6v2H5C3.89,4,3.01,4.9,3.01,6L3,20c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V6C21,4.9,20.1,4,19,4z" +
                "M19,20H5V10h14V20z M9,14H7v-2h2V14z M13,14h-2v-2h2V14z M17,14h-2v-2h2V14z M9,18H7v-2h2V18z" +
                "M13,18h-2v-2h2V18z M17,18h-2v-2h2V18z",
        )
    }

    val Flag: ImageVector by lazy { icon("Flag", "M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z") }

    private fun icon(name: String, vararg paths: String): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach { addPath(PathParser().parsePathString(it).toNodes(), fill = SolidColor(Color.Black)) }
        }.build()
}
