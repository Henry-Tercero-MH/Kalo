/**
 * Inicio de sesión rápido: usuario + PIN de 4 dígitos, o gafete QR. Funciona sin señal.
 * En celulares compartidos se elige el usuario de una lista (cambio rápido).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { campo, espaciado, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { iniciarConPin } from '@/permisos/sesion';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuarios = useConsulta('usuarios').filter((u) => u.activo);
  const [usuario, setUsuario] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (pinCompleto: string) => {
    if (!usuario) return;
    setCargando(true);
    // Deja pintar el indicador antes del cálculo del hash.
    await new Promise((r) => setTimeout(r, 30));
    const r = await iniciarConPin(usuario, pinCompleto);
    setCargando(false);
    if (r.ok) return router.replace('/(tabs)');
    setPin('');
    setError(r.motivo === 'bloqueado' ? t('login.bloqueado', { min: r.minutos }) : t('login.incorrecto'));
  };

  const tecla = (k: string) => {
    setError(null);
    if (k === '⌫') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    const nuevo = pin + k;
    setPin(nuevo);
    if (nuevo.length === 4) void entrar(nuevo);
  };

  return (
    <Pantalla>
      <Titulo>{t('login.titulo')}</Titulo>
      {usuarios.length === 0 ? <Aviso tipo="alerta" texto={t('login.sinUsuarios')} /> : null}
      {!usuario ? (
        <>
          <Etiqueta>{t('login.elegirUsuario')}</Etiqueta>
          <View style={{ marginTop: espaciado.sm }}>
            <Opciones
              opciones={[...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((u) => ({ valor: u.usuario, etiqueta: u.nombre }))}
              valor={usuario}
              onCambio={(v) => setUsuario(v as string)}
            />
          </View>
          <View style={{ marginTop: espaciado.lg }}>
            <Boton titulo={t('login.gafete')} icono="scan-qr-code" variante="secundario" onPress={() => router.push('/(auth)/gafete')} />
          </View>
        </>
      ) : (
        <>
          <Etiqueta>{t('login.usuario')}</Etiqueta>
          <Pressable onPress={() => { setUsuario(null); setPin(''); }} accessibilityRole="button">
            <Text style={estilos.usuario}>{usuarios.find((u) => u.usuario === usuario)?.nombre}</Text>
          </Pressable>
          <Etiqueta>{t('login.pin')}</Etiqueta>
          <View style={estilos.puntos} accessibilityLabel={`${pin.length} de 4 dígitos`}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[estilos.punto, i < pin.length && { backgroundColor: semantico.titulo }]} />
            ))}
          </View>
          {error ? <Aviso tipo="peligro" texto={error} /> : null}
          <View style={estilos.teclado}>
            {TECLAS.map((k, i) => (
              <Pressable
                key={i}
                disabled={!k || cargando}
                onPress={() => tecla(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Borrar' : k}
                style={({ pressed }) => [estilos.tecla, !k && { borderColor: 'transparent' }, pressed && { backgroundColor: semantico.fondoSuave }]}
              >
                <Text style={estilos.textoTecla}>{k}</Text>
              </Pressable>
            ))}
          </View>
          {cargando ? <Aviso texto={t('comun.cargando')} /> : null}
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  usuario: { fontFamily: tipografia.familias.titulo, fontSize: 22, color: semantico.titulo, marginVertical: espaciado.sm, textDecorationLine: 'underline' },
  puntos: { flexDirection: 'row', gap: espaciado.lg, marginVertical: espaciado.lg, justifyContent: 'center' },
  punto: { width: 22, height: 22, borderWidth: 2, borderColor: semantico.titulo },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: espaciado.sm },
  tecla: { width: '31.5%', minHeight: campo.alturaTactil + 12, borderWidth: 1, borderColor: semantico.borde, alignItems: 'center', justifyContent: 'center' },
  textoTecla: { fontFamily: tipografia.familias.titulo, fontSize: 28, color: semantico.titulo },
});
