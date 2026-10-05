/**
 * Inicio de sesión: formulario estándar de usuario y contraseña, o gafete QR. Funciona sin señal
 * (la contraseña se verifica contra el hash guardado en el teléfono).
 * En modo demo se listan los usuarios de demostración: tocar uno llena el formulario.
 */
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '@/componentes/Boton';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { Aviso } from '@/componentes/Visuales';
import { LOGO } from '@/componentes/logo-fuente';
import { campo, colores, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { CONFIG } from '@/config';
import { useConsulta } from '@/db/hooks';
import { esModoDemo, PINES_DEMO } from '@/demo/modo';
import { iniciarConPin } from '@/permisos/sesion';

/** Proporción del archivo del logo (960 × 200). */
const PROPORCION_LOGO = 960 / 200;
const ANCHO_LOGO = 200;

/** Campo de texto con ícono, borde que se marca al enfocar y acción opcional a la derecha. */
function CampoLogin({
  etiqueta,
  icono,
  error,
  accion,
  entradaRef,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  etiqueta: string;
  icono: NombreIcono;
  error?: boolean;
  accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void };
  entradaRef?: React.Ref<TextInput>;
}) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={{ marginBottom: espaciado.lg }}>
      <Text style={estilosBase.etiqueta}>{etiqueta}</Text>
      <View style={[estilos.campo, enfocado && estilos.campoEnfocado, error && estilos.campoError]}>
        <Icono
          nombre={icono}
          tamano={20}
          color={enfocado ? semantico.titulo : semantico.textoSecundario}
        />
        <TextInput
          ref={entradaRef}
          {...props}
          accessibilityLabel={etiqueta}
          placeholderTextColor={semantico.textoSecundario}
          autoCorrect={false}
          onFocus={(e) => {
            setEnfocado(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            props.onBlur?.(e);
          }}
          style={estilos.entrada}
        />
        {accion ? (
          <Pressable
            onPress={accion.onPress}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
            hitSlop={10}
            style={estilos.accionCampo}
          >
            <Icono nombre={accion.icono} tamano={22} color={semantico.textoSecundario} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuarios = useConsulta('usuarios');
  const roles = useConsulta('roles');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [ayudaOlvido, setAyudaOlvido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const campoContrasena = useRef<TextInput>(null);
  const demo = esModoDemo();

  const nombreRol = useMemo(() => new Map(roles.map((r) => [r.id, r.nombre])), [roles]);
  const usuariosDemo = useMemo(
    () =>
      demo
        ? usuarios
            .filter((u) => u.activo && PINES_DEMO[u.usuario])
            .sort((a, b) => PINES_DEMO[a.usuario]!.localeCompare(PINES_DEMO[b.usuario]!))
        : [],
    [demo, usuarios],
  );

  const listo = usuario.trim().length > 0 && contrasena.length > 0 && !cargando;

  const entrar = async () => {
    if (!listo) return;
    setError(null);
    setCargando(true);
    // Deja pintar el indicador antes del cálculo del hash.
    await new Promise((r) => setTimeout(r, 30));
    const r = await iniciarConPin(usuario, contrasena);
    setCargando(false);
    if (r.ok) return router.replace('/(tabs)');
    setContrasena('');
    setError(
      r.motivo === 'bloqueado' ? t('login.bloqueado', { min: r.minutos }) : t('login.incorrecto'),
    );
    campoContrasena.current?.focus();
  };

  return (
    <SafeAreaView style={estilos.raiz}>
      <View style={estilos.franja} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            {LOGO ? (
              <Image
                source={LOGO}
                style={{ width: ANCHO_LOGO, height: ANCHO_LOGO / PROPORCION_LOGO }}
                resizeMode="contain"
                accessibilityLabel="Inversiones Kalo"
              />
            ) : null}
            <Text style={[estilosBase.etiqueta, { marginTop: espaciado.md }]}>
              {t('login.app')}
            </Text>
          </View>

          <Text style={estilos.titulo}>{t('login.titulo')}</Text>
          <View style={[estilosBase.lineaTitulo, { marginVertical: espaciado.sm }]} />
          <Text style={[estilosBase.cuerpo, estilos.ayuda]}>{t('login.ayuda')}</Text>

          <CampoLogin
            etiqueta={t('login.usuario')}
            icono="user-round"
            value={usuario}
            onChangeText={(v) => {
              setUsuario(v);
              setError(null);
            }}
            placeholder={t('login.usuarioEjemplo')}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => campoContrasena.current?.focus()}
            error={Boolean(error)}
          />
          <CampoLogin
            entradaRef={campoContrasena}
            etiqueta={t('login.contrasena')}
            icono="lock-keyhole"
            value={contrasena}
            onChangeText={(v) => {
              setContrasena(v);
              setError(null);
            }}
            placeholder={t('login.contrasenaEjemplo')}
            secureTextEntry={!verContrasena}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void entrar()}
            error={Boolean(error)}
            accion={{
              icono: verContrasena ? 'eye-off' : 'eye',
              etiqueta: verContrasena ? t('login.ocultarContrasena') : t('login.mostrarContrasena'),
              onPress: () => setVerContrasena((v) => !v),
            }}
          />
          <Pressable
            onPress={() => setAyudaOlvido((v) => !v)}
            accessibilityRole="button"
            hitSlop={8}
            style={estilos.olvido}
          >
            <Text style={estilos.olvidoTexto}>{t('login.olvido')}</Text>
          </Pressable>
          {ayudaOlvido ? <Aviso texto={t('login.olvidoAyuda')} /> : null}

          {error ? <Aviso tipo="peligro" texto={error} /> : null}

          <View style={{ marginTop: espaciado.sm }}>
            <Boton
              titulo={cargando ? t('login.verificando') : t('login.entrar')}
              onPress={() => void entrar()}
              deshabilitado={!listo}
              cargando={cargando}
            />
          </View>

          <View style={estilos.separador}>
            <View style={estilos.linea} />
            <Text style={estilosBase.etiqueta}>{t('login.o')}</Text>
            <View style={estilos.linea} />
          </View>
          <Boton
            titulo={t('login.gafete')}
            icono="scan-qr-code"
            variante="secundario"
            onPress={() => router.push('/(auth)/gafete')}
          />

          {usuariosDemo.length > 0 ? (
            <View style={estilos.demo}>
              <View style={estilos.demoEncabezado}>
                <View style={estilos.marcaDemo}>
                  <Text style={estilos.marcaDemoTexto}>DEMO</Text>
                </View>
                <Text style={estilosBase.etiqueta}>{t('login.usuariosDemo')}</Text>
              </View>
              <Text style={[estilosBase.secundario, { marginBottom: espaciado.sm }]}>
                {t('login.usuariosDemoAyuda')}
              </Text>
              {usuariosDemo.map((u) => (
                <Pressable
                  key={u.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('login.usarUsuario', { usuario: u.usuario })}
                  onPress={() => {
                    setUsuario(u.usuario);
                    setContrasena(PINES_DEMO[u.usuario]!);
                    setError(null);
                  }}
                  style={({ pressed }) => [
                    estilos.filaDemo,
                    usuario === u.usuario && estilos.filaDemoActiva,
                    pressed && { backgroundColor: semantico.fondoSuave },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.usuarioDemo}>{u.usuario}</Text>
                    <Text style={estilosBase.secundario} numberOfLines={1}>
                      {nombreRol.get(u.rol_id) ?? ''}
                    </Text>
                  </View>
                  <Text style={estilos.pinDemo}>{PINES_DEMO[u.usuario]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={[estilosBase.secundario, estilos.pie]}>
            {t('login.sinSenal')} · v{CONFIG.versionApp}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: semantico.fondo },
  franja: { height: 6, backgroundColor: semantico.acento },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xxl,
    paddingBottom: espaciado.lg,
  },
  marca: { alignItems: 'center', marginBottom: espaciado.xxl },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.titulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ayuda: { color: semantico.textoSecundario, marginBottom: espaciado.lg },
  campo: {
    minHeight: campo.alturaTactil,
    marginTop: espaciado.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingLeft: espaciado.md,
    borderWidth: 2,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondo,
  },
  campoEnfocado: { borderColor: semantico.bordeFuerte },
  campoError: { borderColor: semantico.peligro },
  entrada: {
    flex: 1,
    minHeight: campo.alturaTactil - 4,
    paddingRight: espaciado.md,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: 18,
    color: semantico.titulo,
    // En web el navegador dibuja su propio contorno al enfocar; ya lo marca el borde.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  accionCampo: {
    minHeight: campo.alturaTactil - 4,
    paddingHorizontal: espaciado.md,
    justifyContent: 'center',
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginVertical: espaciado.lg,
  },
  linea: { flex: 1, height: 1, backgroundColor: semantico.borde },
  demo: {
    marginTop: espaciado.xl,
    padding: espaciado.md,
    backgroundColor: semantico.fondoSuave,
    borderLeftWidth: 4,
    borderLeftColor: colores.estados.alerta,
  },
  demoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.xs,
  },
  marcaDemo: { backgroundColor: colores.estados.alerta, paddingHorizontal: 5, paddingVertical: 1 },
  marcaDemoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 10,
    letterSpacing: 1,
    color: semantico.titulo,
  },
  filaDemo: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
  },
  filaDemoActiva: { backgroundColor: semantico.fondo },
  usuarioDemo: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: 16,
    color: semantico.titulo,
  },
  pinDemo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 16,
    letterSpacing: 2,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  olvido: { alignSelf: 'flex-end', marginTop: -espaciado.sm, marginBottom: espaciado.md },
  olvidoTexto: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  pie: { textAlign: 'center', marginTop: espaciado.xl },
});
