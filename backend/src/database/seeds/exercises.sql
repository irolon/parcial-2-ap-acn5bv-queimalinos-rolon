-- ============================================================================
-- FitTrainer — Seed de la biblioteca global de ejercicios (50 ejercicios)
-- Ejecutar DESPUÉS de database/schema/ (01 a 07) en el SQL Editor de Supabase
-- (y, en una base ya creada, después de la migración 2026-10-17-exercises-global-name.sql).
-- Es re-ejecutable: el upsert usa el índice único parcial uq_exercises_global_name
-- (name) where is_global, así que correrlo N veces deja siempre las mismas 50 filas.
-- Cada ejercicio lleva un video de YouTube que demuestra la técnica.
-- ============================================================================

insert into exercises (name, muscle_group, equipment, description, video_url, is_global) values
  -- chest (6)
  ('Press banca plano', 'chest', 'barbell', 'Acostado en banco plano, bajá la barra controlada hasta el pecho y empujá hacia arriba sin despegar los glúteos del banco.', 'https://www.youtube.com/watch?v=uEtiwYaT3d0', true),
  ('Press inclinado mancuernas', 'chest', 'dumbbell', 'En banco inclinado, empujá las mancuernas hacia arriba y bajalas hasta la altura del pecho para trabajar la parte alta del pectoral.', 'https://www.youtube.com/watch?v=oTD5g77GgSA', true),
  ('Aperturas en polea', 'chest', 'cable', 'Con los codos levemente flexionados, juntá las manos frente al pecho en un arco amplio, sintiendo la contracción del pectoral.', 'https://www.youtube.com/watch?v=XnaMi2Gb_9Q', true),
  ('Flexiones de brazos', 'chest', 'bodyweight', 'Cuerpo en línea recta desde la cabeza a los talones; bajá el pecho hasta casi tocar el suelo y empujá con los codos cerca del torso.', 'https://www.youtube.com/watch?v=e_EKkqoHxns', true),
  ('Fondos en paralelas', 'chest', 'bodyweight', 'Inclinando el torso hacia adelante, bajá hasta que los hombros queden a la altura de los codos y subí empujando las barras.', 'https://www.youtube.com/watch?v=OgjaUueRiII', true),
  ('Press de pecho en máquina', 'chest', 'machine', 'Ajustá el asiento para que las manijas queden a la altura del pecho y empujá hacia adelante sin bloquear del todo los codos.', 'https://www.youtube.com/watch?v=iBAUNsrwWdI', true),
  -- back (6)
  ('Dominadas', 'back', 'bodyweight', 'Colgado de la barra, llevá el pecho hacia ella tirando con los codos hacia abajo y bajá con control hasta extender los brazos.', 'https://www.youtube.com/watch?v=8mhDd9Ahl1M', true),
  ('Remo con barra', 'back', 'barbell', 'Con el torso inclinado y la espalda neutra, llevá la barra hacia el abdomen juntando los omóplatos.', 'https://www.youtube.com/watch?v=5Gg2OPlCkuE', true),
  ('Jalón al pecho', 'back', 'cable', 'Sentado en la polea alta, tirá de la barra hasta la parte alta del pecho llevando los codos hacia abajo y atrás.', 'https://www.youtube.com/watch?v=1JiNvChA0_Q', true),
  ('Remo con mancuerna', 'back', 'dumbbell', 'Apoyá una mano y una rodilla en el banco y llevá la mancuerna hacia la cadera con el codo pegado al cuerpo.', 'https://www.youtube.com/watch?v=Vvnw0EYAlgc', true),
  ('Remo en polea baja', 'back', 'cable', 'Sentado con la espalda erguida, tirá del agarre hacia el abdomen juntando los omóplatos y volvé sin dejar caer el torso.', 'https://www.youtube.com/watch?v=nwdptbhYjTw', true),
  ('Hiperextensiones', 'back', 'bodyweight', 'En el banco de hiperextensiones, subí el tronco hasta alinearlo con las piernas sin arquear en exceso la zona lumbar.', 'https://www.youtube.com/watch?v=atEI-PfmpBI', true),
  -- shoulders (5)
  ('Press militar', 'shoulders', 'barbell', 'De pie, empujá la barra desde los hombros hasta estirar los brazos sobre la cabeza, con el abdomen firme y sin arquear la espalda.', 'https://www.youtube.com/watch?v=WREUHExSxDc', true),
  ('Elevaciones laterales', 'shoulders', 'dumbbell', 'Con los codos apenas flexionados, subí las mancuernas hacia los costados hasta la altura de los hombros y bajá despacio.', 'https://www.youtube.com/watch?v=aVa9ce3SlSA', true),
  ('Press de hombros con mancuernas', 'shoulders', 'dumbbell', 'Sentado con la espalda apoyada, empujá las mancuernas desde la altura de las orejas hasta estirar los brazos arriba.', 'https://www.youtube.com/watch?v=SYA1r1J49R8', true),
  ('Face pull', 'shoulders', 'cable', 'Tirá de la cuerda hacia la cara abriendo los codos a los costados para trabajar el deltoides posterior y la zona alta de la espalda.', 'https://www.youtube.com/watch?v=tIuXc_X8T4I', true),
  ('Pájaros con mancuernas', 'shoulders', 'dumbbell', 'Con el torso inclinado, abrí los brazos hacia los costados llevando los codos hacia atrás para trabajar el deltoides posterior.', 'https://www.youtube.com/watch?v=24z3h_bZ7Zo', true),
  -- legs (8)
  ('Sentadilla libre', 'legs', 'barbell', 'Con la barra apoyada en la espalda alta, bajá hasta que los muslos queden paralelos al suelo con las rodillas alineadas con los pies.', 'https://www.youtube.com/watch?v=9D7zI27gFHM', true),
  ('Prensa de piernas', 'legs', 'machine', 'Con la zona lumbar apoyada, bajá la plataforma hasta flexionar las rodillas a unos 90 grados y empujá sin bloquearlas.', 'https://www.youtube.com/watch?v=ccDlOeZ90hs', true),
  ('Peso muerto', 'legs', 'barbell', 'Con la espalda neutra, levantá la barra pegada al cuerpo extendiendo cadera y rodillas a la vez.', 'https://www.youtube.com/watch?v=1-UFXJeP564', true),
  ('Zancadas con mancuernas', 'legs', 'dumbbell', 'Da un paso largo adelante y bajá la rodilla de atrás casi hasta el suelo, con el torso erguido; empujá con la pierna delantera para volver.', 'https://www.youtube.com/watch?v=Dg9DX9Tv62k', true),
  ('Sentadilla búlgara', 'legs', 'dumbbell', 'Con el pie de atrás apoyado en un banco, bajá con control sobre la pierna de adelante manteniendo el torso erguido.', 'https://www.youtube.com/watch?v=l5c49YVRYjM', true),
  ('Extensión de cuádriceps', 'legs', 'machine', 'Sentado en la máquina, extendé las rodillas hasta estirar las piernas y bajá despacio sin dejar caer el peso.', 'https://www.youtube.com/watch?v=GMFFZnDz6wE', true),
  ('Curl femoral tumbado', 'legs', 'machine', 'Boca abajo en la máquina, flexioná las rodillas llevando los talones hacia los glúteos sin levantar la cadera del banco.', 'https://www.youtube.com/watch?v=sRMO3SbTqjk', true),
  ('Peso muerto rumano', 'legs', 'barbell', 'Con las rodillas apenas flexionadas, llevá la cadera hacia atrás bajando la barra por los muslos hasta sentir el estiramiento de los femorales.', 'https://www.youtube.com/watch?v=NIng2JWF1Rs', true),
  -- glutes (4)
  ('Hip thrust', 'glutes', 'barbell', 'Con la espalda alta apoyada en el banco, subí la cadera con la barra hasta alinear tronco y muslos y apretá los glúteos arriba.', 'https://www.youtube.com/watch?v=7wOBI_8Sv74', true),
  ('Patada de glúteo en polea', 'glutes', 'cable', 'Con la tobillera en la polea baja, extendé la pierna hacia atrás apretando el glúteo sin arquear la zona lumbar.', 'https://www.youtube.com/watch?v=JvTbK5773hc', true),
  ('Puente de glúteos', 'glutes', 'bodyweight', 'Acostado boca arriba con las rodillas flexionadas, subí la cadera empujando con los talones y apretá los glúteos arriba.', 'https://www.youtube.com/watch?v=v_9dS-l3GWU', true),
  ('Caminata lateral con banda', 'glutes', 'band', 'Con la banda sobre las rodillas y las rodillas apenas flexionadas, dá pasos laterales manteniendo la tensión de la banda.', 'https://www.youtube.com/watch?v=b2luLptL_h4', true),
  -- biceps (4)
  ('Curl de bíceps', 'biceps', 'dumbbell', 'De pie, flexioná los codos subiendo las mancuernas sin balancear el cuerpo y bajá controlando el movimiento.', 'https://www.youtube.com/watch?v=72dihs2dEdc', true),
  ('Curl martillo', 'biceps', 'dumbbell', 'Con las palmas enfrentadas, flexioná los codos subiendo las mancuernas y mantené los codos pegados al torso.', 'https://www.youtube.com/watch?v=RHdacbwKbTo', true),
  ('Curl con barra', 'biceps', 'barbell', 'De pie y con agarre supino, subí la barra flexionando los codos sin despegarlos del cuerpo ni usar impulso.', 'https://www.youtube.com/watch?v=uDLZNOqv3EA', true),
  ('Curl en polea baja', 'biceps', 'cable', 'Frente a la polea baja, flexioná los codos fijos a los costados y mantené la tensión constante todo el recorrido.', 'https://www.youtube.com/watch?v=ZzjMo9mzrHg', true),
  -- triceps (4)
  ('Extensión de tríceps polea', 'triceps', 'cable', 'Con los codos pegados al cuerpo, extendé los brazos hacia abajo en la polea alta y volvé despacio sin mover los hombros.', 'https://www.youtube.com/watch?v=sJs1GpiTp8g', true),
  ('Fondos en banco', 'triceps', 'bodyweight', 'Con las manos apoyadas en el banco detrás de vos, bajá flexionando los codos hacia atrás y subí empujando con los tríceps.', 'https://www.youtube.com/watch?v=EZSjDiiTi2o', true),
  ('Press francés', 'triceps', 'barbell', 'Acostado, bajá la barra hacia la frente flexionando solo los codos y extendé sin abrirlos.', 'https://www.youtube.com/watch?v=0kT1atwDmVg', true),
  ('Patada de tríceps', 'triceps', 'dumbbell', 'Con el torso inclinado y el codo pegado al cuerpo, extendé el brazo hacia atrás hasta estirarlo por completo.', 'https://www.youtube.com/watch?v=BhXYRgN3kg8', true),
  -- core (5)
  ('Plancha abdominal', 'core', 'bodyweight', 'Apoyado en antebrazos y puntas de los pies, mantené el cuerpo en línea recta apretando el abdomen sin hundir la cadera.', 'https://www.youtube.com/watch?v=O4bNV8W4CkU', true),
  ('Crunch abdominal', 'core', 'bodyweight', 'Acostado con las rodillas flexionadas, despegá los hombros del suelo contrayendo el abdomen sin tirar del cuello.', 'https://www.youtube.com/watch?v=hl9Yu7UZqHU', true),
  ('Crunch en polea', 'core', 'cable', 'De rodillas frente a la polea alta, flexioná el tronco llevando los codos hacia las rodillas y contrayendo el abdomen.', 'https://www.youtube.com/watch?v=ui3iEsYbXtI', true),
  ('Elevación de piernas colgado', 'core', 'bodyweight', 'Colgado de la barra, subí las piernas con control hasta la altura de la cadera o más, sin balancear el cuerpo.', 'https://www.youtube.com/watch?v=F9wTR13Cd3M', true),
  ('Bicicleta abdominal', 'core', 'bodyweight', 'Acostado, alterná llevando un codo hacia la rodilla contraria mientras estirás la otra pierna, con el movimiento lento y controlado.', 'https://www.youtube.com/watch?v=dYxamPVcKvk', true),
  -- calves (3)
  ('Elevación de gemelos', 'calves', 'machine', 'De pie en la máquina, subí sobre las puntas de los pies lo más alto posible, hacé una pausa arriba y bajá estirando el gemelo.', 'https://www.youtube.com/watch?v=RLX8HFAOIhg', true),
  ('Elevación de gemelos con mancuernas', 'calves', 'dumbbell', 'De pie con una mancuerna en cada mano, subí sobre las puntas de los pies con pausa arriba y bajá lento.', 'https://www.youtube.com/watch?v=1BL4681pIz4', true),
  ('Elevación de gemelos sentado', 'calves', 'machine', 'Sentado en la máquina con las rodillas flexionadas, subí los talones con recorrido completo para trabajar el sóleo.', 'https://www.youtube.com/watch?v=Az8wdZmbVPo', true),
  -- full_body (3)
  ('Burpees', 'full_body', 'bodyweight', 'Desde parado, bajá a plancha, hacé una flexión, volvé a la posición de cuclillas y terminá con un salto.', 'https://www.youtube.com/watch?v=Uy2nUNX38xE', true),
  ('Swing con kettlebell', 'full_body', 'kettlebell', 'Con la espalda neutra, impulsá la pesa hacia adelante con una extensión explosiva de cadera, no con los brazos.', 'https://www.youtube.com/watch?v=8gGn_4bJgFs', true),
  ('Thruster con mancuernas', 'full_body', 'dumbbell', 'Bajá en sentadilla con las mancuernas en los hombros y, al subir, empujalas sobre la cabeza en un solo movimiento fluido.', 'https://www.youtube.com/watch?v=19pK_ATHhDA', true),
  -- cardio (2)
  ('Cinta de correr', 'cardio', 'machine', 'Trotá o caminá con postura erguida y pasos cortos, y ajustá velocidad e inclinación según el objetivo.', 'https://www.youtube.com/watch?v=clOMvIG1R-o', true),
  ('Saltar la soga', 'cardio', 'bodyweight', 'Con los codos pegados al cuerpo, hacé girar la soga con las muñecas y saltá con pequeños rebotes sobre las puntas de los pies.', 'https://www.youtube.com/watch?v=t90SayxU1Pc', true)
on conflict (name) where is_global do update set
  muscle_group = excluded.muscle_group,
  equipment    = excluded.equipment,
  description  = excluded.description,
  video_url    = excluded.video_url;
