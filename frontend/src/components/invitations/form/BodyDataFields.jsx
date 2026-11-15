import { useState } from 'react';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import { HEIGHT_RANGE, WEIGHT_RANGE } from '@/pages/invitations/invitationExtras';
import { todayString } from '@/utils/dates';
import { ageFrom } from '@/utils/students/age';
import { FREQUENCY_OPTIONS } from '@/utils/students/studentOptions';

/**
 * Frecuencia, altura, peso y fecha de nacimiento (todos opcionales). El prototipo pide la edad: se carga la
 * fecha (la ficha calcula la edad con ella y no envejece) y se muestra la edad que da. Altura y peso pasan a
 * ser la primera medida del alumno cuando acepta la invitación.
 */
export default function BodyDataFields({ errors = {} }) {
  const [birthDate, setBirthDate] = useState('');
  const age = ageFrom(birthDate, new Date());
  return (
    <>
      <Select
        label="Frecuencia (opcional)"
        name="weekly_frequency"
        options={FREQUENCY_OPTIONS}
        defaultValue=""
        error={errors.weekly_frequency}
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Input
          label="Altura (cm)"
          name="height_cm"
          type="number"
          inputMode="decimal"
          min={HEIGHT_RANGE.min}
          max={HEIGHT_RANGE.max}
          step="any"
          placeholder="178"
          error={errors.height_cm}
        />
        <Input
          label="Peso (kg)"
          name="weight_kg"
          type="number"
          inputMode="decimal"
          min={WEIGHT_RANGE.min}
          max={WEIGHT_RANGE.max}
          step="any"
          placeholder="74.5"
          error={errors.weight_kg}
        />
        <Input
          label="Fecha de nacimiento"
          name="birth_date"
          type="date"
          max={todayString()}
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          hint={age !== null && age >= 0 ? `${age} años` : undefined}
          error={errors.birth_date}
        />
      </div>
    </>
  );
}
