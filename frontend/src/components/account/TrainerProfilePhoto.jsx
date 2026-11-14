import PhotoField from '@/components/shared/forms/PhotoField';
import { useTrainerAvatar } from '@/hooks/account/useTrainerAvatar';

/** La foto del PT en Tu perfil: la ven él (sidebar y topbar) y sus alumnos ("Tu entrenador/a" y Mensajes). */
export default function TrainerProfilePhoto({ me }) {
  const avatar = useTrainerAvatar();
  return <PhotoField name={me.name} src={me.avatar_url} avatar={avatar} />;
}
