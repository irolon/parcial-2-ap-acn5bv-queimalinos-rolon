package com.fittrainer.data.exercises.trainer

/** El backend rechazó campos del alta o la edición (400): mensaje por campo del backend ("name", "video_url", …). */
class ExerciseRejectedException(val fields: Map<String, String>, val messageText: String?) : Exception(messageText)

/** 409 EXERCISE_IN_USE: el ejercicio está en una rutina o en una sesión y no se puede borrar. */
class ExerciseInUseException(val messageText: String) : Exception(messageText)
