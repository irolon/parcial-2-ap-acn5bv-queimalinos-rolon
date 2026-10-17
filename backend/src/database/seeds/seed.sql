-- ============================================================================
-- FitTrainer — Seed de datos iniciales
-- Ejecutar DESPUÉS de database/schema/ (01 a 07) en el SQL Editor de Supabase.
-- ============================================================================

-- ── Ejercicios globales (is_global = true, trainer_id = null) ─────────────────
-- Set inicial representativo. El plan contempla ~50; se puede ampliar luego.
insert into exercises (name, muscle_group, equipment, description, is_global) values
  ('Press banca plano',        'chest',     'barbell',  'Empuje horizontal con barra.',           true),
  ('Press inclinado mancuernas','chest',    'dumbbell', 'Empuje en banco inclinado.',             true),
  ('Aperturas en polea',       'chest',     'cable',    'Aislamiento de pectoral.',               true),
  ('Dominadas',                'back',      'bodyweight','Tracción vertical con peso corporal.',  true),
  ('Remo con barra',           'back',      'barbell',  'Tracción horizontal.',                   true),
  ('Jalón al pecho',           'back',      'cable',    'Tracción vertical en polea.',            true),
  ('Press militar',            'shoulders', 'barbell',  'Empuje vertical de hombros.',            true),
  ('Elevaciones laterales',    'shoulders', 'dumbbell', 'Aislamiento de deltoides lateral.',      true),
  ('Sentadilla libre',         'legs',      'barbell',  'Patrón de sentadilla con barra.',        true),
  ('Prensa de piernas',        'legs',      'machine',  'Empuje de piernas en máquina.',          true),
  ('Peso muerto',              'legs',      'barbell',  'Bisagra de cadera con barra.',           true),
  ('Hip thrust',               'glutes',    'barbell',  'Extensión de cadera para glúteo.',       true),
  ('Curl de bíceps',           'biceps',    'dumbbell', 'Flexión de codo.',                       true),
  ('Extensión de tríceps polea','triceps',  'cable',    'Extensión de codo en polea.',            true),
  ('Plancha abdominal',        'core',      'bodyweight','Isometría de core.',                    true),
  ('Elevación de gemelos',     'calves',    'machine',  'Flexión plantar.',                       true),
  ('Burpees',                  'full_body', 'bodyweight','Ejercicio metabólico completo.',        true),
  ('Cinta de correr',          'cardio',    'machine',  'Trabajo cardiovascular continuo.',       true)
on conflict do nothing;
