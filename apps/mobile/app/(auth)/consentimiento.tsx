/**
 * Aviso y aceptación del rastreo GPS la primera vez (queda guardado en la base).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { guardarConsentimiento } from '@/permisos/consentimiento';
import { useContextoEscritura } from '@/permisos/contexto';

export default function Consentimiento() {
  const { t } = useTranslation();
  const router = useRouter();
  const ctx = useContextoEscritura();
  const { volverA } = useLocalSearchParams<{ volverA?: string }>();
  return (
    <Pantalla volver>
      <Titulo>{t('consentimiento.titulo')}</Titulo>
      <Texto style={{ marginBottom: 24 }}>{t('consentimiento.texto')}</Texto>
      <Boton
        titulo={t('consentimiento.aceptar')}
        icono="check"
        onPress={async () => {
          if (ctx) await guardarConsentimiento(ctx, true);
          if (volverA) router.replace(volverA as never);
          else router.back();
        }}
      />
      <Boton
        titulo={t('consentimiento.rechazar')}
        variante="secundario"
        onPress={async () => {
          if (ctx) await guardarConsentimiento(ctx, false);
          router.back();
        }}
      />
    </Pantalla>
  );
}
