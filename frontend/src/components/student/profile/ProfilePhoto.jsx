import PhotoField from '@/components/shared/forms/PhotoField';
import { useAvatar } from '@/hooks/students/useAvatar';

/** La foto del alumno en Mi perfil (GX2): la sube o la quita él mismo. */
export default function ProfilePhoto({ student }) {
  const avatar = useAvatar(student.id);
  return <PhotoField name={student.name} src={student.avatar_url} avatar={avatar} />;
}
