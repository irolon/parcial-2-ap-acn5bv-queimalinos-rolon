import { CalendarCheck, Dumbbell, Flame, Medal, Trophy } from 'lucide-react';

/** Ícono y color por categoría de logro. */
const BY_CATEGORY = {
  streak: { Icon: Flame, className: 'text-hot' },
  volume: { Icon: Dumbbell, className: 'text-cool' },
  consistency: { Icon: CalendarCheck, className: 'text-good' },
  pr: { Icon: Trophy, className: 'text-accentText' },
  milestone: { Icon: Medal, className: 'text-accentText' },
};

export const categoryIcon = (category) => BY_CATEGORY[category] ?? BY_CATEGORY.milestone;
