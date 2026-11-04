package com.fittrainer.ui.messages.student.components

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import com.fittrainer.ui.messages.student.CAMERA_DENIED
import com.fittrainer.ui.messages.student.CAMERA_UNAVAILABLE
import java.io.File
import java.util.UUID

/** Carpeta de la caché donde la cámara deja la foto (la declara res/xml/photo_paths.xml). */
private const val PHOTOS_DIR = "message-photos"

/** Sacar una foto o elegirla de la galería. Las dos terminan en [onPicked] con la uri en texto. */
class PhotoPicker(val takePhoto: () -> Unit, val pickFromGallery: () -> Unit)

/** La uri donde la cámara va a guardar una foto nueva (FileProvider sobre la caché). */
private fun newPhotoUri(context: Context): Uri {
    val dir = File(context.cacheDir, PHOTOS_DIR).apply { mkdirs() }
    val file = File(dir, "${UUID.randomUUID()}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.photos", file)
}

/**
 * Cámara del sistema (`TakePicture`) y selector de fotos (`PickVisualMedia`, sin permisos). La app declara CAMERA
 * por el escáner del QR, así que la cámara del sistema necesita ese permiso: se pide antes de abrirla.
 * [onError] recibe el texto a mostrar si no hay cámara o si se negó el permiso.
 */
@Composable
fun rememberPhotoPicker(onPicked: (String) -> Unit, onError: (String) -> Unit): PhotoPicker {
    val context = LocalContext.current
    var pending by rememberSaveable { mutableStateOf<String?>(null) }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        pending?.let { if (ok) onPicked(it) }
        pending = null
    }
    val launchCamera = {
        val uri = newPhotoUri(context)
        pending = uri.toString()
        try {
            camera.launch(uri)
        } catch (e: ActivityNotFoundException) {
            pending = null
            onError(CAMERA_UNAVAILABLE)
        }
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) launchCamera() else onError(CAMERA_DENIED)
    }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { onPicked(it.toString()) }
    }
    return remember(camera, permission, gallery) {
        PhotoPicker(
            takePhoto = { permission.launch(Manifest.permission.CAMERA) },
            pickFromGallery = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
        )
    }
}
