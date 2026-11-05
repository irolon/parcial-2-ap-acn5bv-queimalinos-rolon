# has_image en el chat del celular (04/11, sobre la #73)

Seguimiento de la #73 de Pablo, que suma `has_image` a cada mensaje (`Boolean(image_path)`). Igna lo pidió el 04/11 («arrancá con lo de has_image»). Rama `feature/android-mensajes-has-image`, base `develop`.

## Problema

Con la firma best-effort de las fotos, una foto que Storage no pudo firmar llega con `image_url: null`.
- **Solo foto:** el celular la reconocía porque no tiene texto (`body == null`). Mostraba «Foto no disponible» y la volvía a pedir en el próximo refresco (`fetchedAt = 0`).
- **Foto con texto:** no se distinguía de un mensaje de solo texto. La foto no se avisaba y no se reintentaba nunca, hasta borrar el caché.

## Qué cambia

- **API.** `MessageDto.hasImage: Boolean?`, al final para no correr los argumentos posicionales. `null` significa un backend anterior a la #73.
- **Room v22.** `trainer_messages.hasImage` (`@ColumnInfo(defaultValue = "0")`), con `AutoMigration(21, 22)`.
  - Las filas viejas quedan en 0 hasta el próximo refresco.
  - Mientras tanto, el dominio deduce igual que antes: con URL, o sin texto, tiene foto.
- **Mapper.**
  - Entidad: `hasImage = dto.hasImage ?: (imageUrl != null || body == null)`.
  - Dominio: `Message.hasImage = hasImage || imageUrl != null || body == null`.
- **Reintento.**
  - `keepSigned` marca con `fetchedAt = 0` toda fila con `hasImage` que no tenga URL, ni nueva ni guardada (antes, solo las de `body == null`).
  - `newestStaleImageAt` también cuenta `hasImage = 1`.
  - Con eso, la próxima `renewStaleImages` la vuelve a pedir.
- **Vista.** `MessageBubble` muestra «Foto no disponible» cuando `hasImage && imageUrl == null`, también con texto, y lo pone arriba del texto, donde iría la foto, como la web de la #73. Lo usan el chat del alumno y el del PT.
- **Vista previa de la lista.** `withSent` usa `hasImage`.
- **Orden de carpetas.** Los tests de migración de `androidTest/.../data/db/migration/` eran 14 archivos sueltos. Pasan a `v1x/` (v10 a v19) y `v2x/` (v20 en adelante); quedan en la raíz la v9 y el test general.

## Fuera de alcance

- La prueba a mano con Storage caído (la foto con texto sin firmar muestra el aviso y vuelve sola) necesita la #73 mergeada y forzar el fallo de la firma.
