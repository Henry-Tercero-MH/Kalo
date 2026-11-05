/**
 * Inicio de sesión: formulario estándar de usuario y contraseña, o gafete QR. Funciona sin señal
 * (la contraseña se verifica contra el hash guardado en el teléfono).
 * En modo demo se listan los usuarios de demostración: tocar uno llena el formulario.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
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
import { MensajeCampo } from '@/componentes/Controles';
import { FranjaSuperior } from '@/componentes/FranjaSuperior';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { LOGO } from '@/componentes/logo-fuente';
import {
  bordes,
  campo,
  colores,
  control,
  espaciado,
  estilosBase,
  estilosCampo,
  semantico,
  tamanoIcono,
  tipografia,
} from '@/componentes/tema';
import { CONFIG } from '@/config';
import { useConsulta } from '@/db/hooks';
import { esModoDemo, PINES_DEMO } from '@/demo/modo';
import { iniciarConPin } from '@/permisos/sesion';

/** Proporción del archivo del logo (960 × 200). */
const PROPORCION_LOGO = 960 / 200;
const ANCHO_LOGO = 200;

/**
 * Campo de texto con ícono, borde que se marca al enfocar y acción opcional a la derecha.
 * `error` solo pinta el borde rojo; `mensajeError` además lo escribe debajo y lo lee el lector
 * de pantalla al enfocar el campo.
 */
function CampoLogin({
  etiqueta,
  icono,
  error,
  mensajeError,
  accion,
  entradaRef,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  etiqueta: string;
  icono: NombreIcono;
  error?: boolean;
  mensajeError?: string;
  accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void };
  entradaRef?: React.Ref<TextInput>;
}) {
  const [enfocado, setEnfocado] = useState(false);
  const conError = error || Boolean(mensajeError);
  const editable = props.editable !== false;
  return (
    <View style={{ marginBottom: espaciado.lg }}>
      <Text style={estilosBase.etiqueta}>{etiqueta}</Text>
      <View
        style={[
          estilosCampo.marco,
          estilos.campo,
          enfocado && estilosCampo.marcoFoco,
          conError && estilosCampo.marcoError,
          !editable && estilosCampo.marcoSoloLectura,
          (enfocado || conError) && {
            paddingLeft: espaciado.md - control.ajusteFoco,
            paddingRight: 0,
          },
        ]}
      >
        <Icono
          nombre={icono}
          tamano={tamanoIcono.normal}
          color={enfocado ? semantico.titulo : semantico.textoSecundario}
        />
        <TextInput
          ref={entradaRef}
          {...props}
          accessibilityLabel={etiqueta}
          accessibilityHint={mensajeError}
          accessibilityState={{ disabled: !editable }}
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
          style={[estilosCampo.texto, estilos.entrada]}
        />
        {accion ? (
          <Pressable
            onPress={accion.onPress}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
            style={({ pressed }) => [
              estilos.accionCampo,
              pressed && { backgroundColor: semantico.fondoSuave },
            ]}
          >
            <Icono nombre={accion.icono} tamano={tamanoIcono.normal} color={semantico.titulo} />
          </Pressable>
        ) : null}
      </View>
      <MensajeCampo error={mensajeError} />
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
  // «credenciales» se muestra bajo el campo de contraseña; «bloqueado» como aviso aparte (no es
  // un dato mal escrito, así que no se marca ningún campo).
  const [error, setError] = useState<{
    tipo: 'credenciales' | 'bloqueado';
    texto: string;
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  // Evita un segundo envío si se toca dos veces antes de que se pinte el estado de carga.
  const enviando = useRef(false);
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

  // Tras un error de credenciales, el cursor vuelve a la contraseña (ya vacía) cuando los campos
  // dejan de estar bloqueados por la verificación.
  const errorCredenciales = error?.tipo === 'credenciales';
  useEffect(() => {
    if (errorCredenciales && !cargando) campoContrasena.current?.focus();
  }, [errorCredenciales, cargando]);

  const entrar = async () => {
    if (!listo || enviando.current) return;
    enviando.current = true;
    setError(null);
    setCargando(true);
    try {
      // Deja pintar el indicador antes del cálculo del hash.
      await new Promise((r) => setTimeout(r, 30));
      const r = await iniciarConPin(usuario, contrasena);
      if (r.ok) return router.replace('/(tabs)');
      setContrasena('');
      const bloqueado = r.motivo === 'bloqueado';
      const texto = bloqueado ? t('login.bloqueado', { min: r.minutos }) : t('login.incorrecto');
      setError({ tipo: bloqueado ? 'bloqueado' : 'credenciales', texto });
      // iOS no lee las regiones «live»; se anuncia el error explícitamente.
      AccessibilityInfo.announceForAccessibility(texto);
    } finally {
      enviando.current = false;
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['left', 'right', 'bottom']}>
      <FranjaSuperior />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          // iOS: desplaza lo necesario para que el campo enfocado y el botón no queden bajo el
          // teclado en pantallas chicas.
          automaticallyAdjustKeyboardInsets
        >
          <View style={estilos.marca}>
            {LOGO ? (
              <Image
                source={LOGO}
                style={{ width: ANCHO_LOGO, height: ANCHO_LOGO / PROPORCION_LOGO }}
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel="Inversiones Kalo"
              />
            ) : null}
            <Text style={[estilosBase.etiqueta, { marginTop: espaciado.md }]}>
              {t('login.app')}
            </Text>
          </View>

          <Titulo>{t('login.titulo')}</Titulo>
          <Text style={[estilosBase.cuerpo, estilos.ayuda]}>{t('login.ayuda')}</Text>
          <View style={estilos.sinSenal}>
            <Icono nombre="cloud-off" tamano={tamanoIcono.normal} color={semantico.titulo} />
            <Text style={[estilosBase.cuerpo, { flex: 1 }]}>{t('login.sinSenal')}</Text>
          </View>

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
            importantForAutofill="yes"
            returnKeyType="next"
            // Mantiene el teclado abierto al pasar a la contraseña.
            submitBehavior="submit"
            onSubmitEditing={() => campoContrasena.current?.focus()}
            editable={!cargando}
            error={errorCredenciales}
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
            importantForAutofill="yes"
            returnKeyType="go"
            onSubmitEditing={() => void entrar()}
            editable={!cargando}
            mensajeError={errorCredenciales ? error?.texto : undefined}
            accion={{
              icono: verContrasena ? 'eye-off' : 'eye',
              etiqueta: verContrasena ? t('login.ocultarContrasena') : t('login.mostrarContrasena'),
              onPress: () => setVerContrasena((v) => !v),
            }}
          />
          <Pressable
            onPress={() => setAyudaOlvido((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: ayudaOlvido }}
            style={estilos.olvido}
          >
            <Text style={estilos.olvidoTexto}>{t('login.olvido')}</Text>
          </Pressable>
          {ayudaOlvido ? <Aviso texto={t('login.olvidoAyuda')} /> : null}

          {error?.tipo === 'bloqueado' ? <Aviso tipo="alerta" texto={error.texto} /> : null}

          <View style={{ marginTop: espaciado.sm }}>
            <Boton
              titulo={cargando ? t('login.verificando') : t('login.entrar')}
              onPress={() => void entrar()}
              deshabilitado={!listo}
              cargando={cargando}
              motivoDeshabilitado={t('login.faltanDatos')}
            />
          </View>

          <View style={estilos.separador} importantForAccessibility="no-hide-descendants">
            <View style={estilos.linea} />
            <Text style={estilosBase.etiqueta}>{t('login.o')}</Text>
            <View style={estilos.linea} />
          </View>
          <Boton
            titulo={t('login.gafete')}
            icono="scan-qr-code"
            variante="secundario"
            accessibilityHint={t('login.gafeteHint')}
            deshabilitado={cargando}
            onPress={() => router.push('/(auth)/gafete')}
          />

          {usuariosDemo.length > 0 ? (
            <View style={estilos.demo}>
              <View style={estilos.demoEncabezado}>
                <View style={estilos.marcaDemo}>
                  <Text style={estilos.marcaDemoTexto}>{t('comun.demo')}</Text>
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
                  accessibilityLabel={t('login.usarUsuario', {
                    usuario: u.usuario,
                    rol: nombreRol.get(u.rol_id) ?? '',
                  })}
                  accessibilityState={{ selected: usuario === u.usuario, disabled: cargando }}
                  disabled={cargando}
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
                  {/* Elegido: marca visible además del fondo (no solo color). */}
                  {usuario === u.usuario ? (
                    <Icono nombre="check" tamano={tamanoIcono.normal} color={semantico.titulo} />
                  ) : null}
                  <Text style={estilos.pinDemo}>{PINES_DEMO[u.usuario]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={[estilosBase.secundario, estilos.pie]}>
            {t('login.version', { v: CONFIG.versionApp })}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: semantico.fondo },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xxl,
    paddingBottom: espaciado.lg,
  },
  marca: { alignItems: 'center', marginBottom: espaciado.xxl },
  ayuda: { color: semantico.textoSecundario, marginBottom: espaciado.sm },
  // «Sin internet» visible antes de los campos: quien no tiene señal sabe que puede seguir.
  sinSenal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
  },
  // Borde y estados (normal, foco, error) de estilosCampo; aquí solo la fila con ícono.
  campo: {
    marginTop: espaciado.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingLeft: espaciado.md,
    paddingRight: 0,
  },
  entrada: {
    flex: 1,
    minHeight: campo.alturaTactil - control.grosorFoco * 2,
    paddingRight: espaciado.md,
  },
  accionCampo: {
    minWidth: campo.alturaTactil - control.grosorFoco * 2,
    minHeight: campo.alturaTactil - control.grosorFoco * 2,
    alignItems: 'center',
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
    borderLeftWidth: espaciado.xs,
    borderLeftColor: colores.estados.alerta,
  },
  demoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.xs,
  },
  marcaDemo: {
    backgroundColor: colores.estados.alerta,
    paddingHorizontal: espaciado.xs,
    paddingVertical: control.grosor,
  },
  marcaDemoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.etiqueta,
    letterSpacing: tipografia.espaciadoLetras.enfasis,
    color: semantico.titulo,
  },
  filaDemo: {
    minHeight: campo.alturaTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderTopWidth: bordes.lineaDivision,
    borderTopColor: semantico.borde,
  },
  filaDemoActiva: { backgroundColor: semantico.fondo },
  usuarioDemo: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
  },
  pinDemo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    letterSpacing: tipografia.espaciadoLetras.codigo,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  // Enlace con área táctil de 56 pt; el margen negativo lo acerca al campo de arriba.
  olvido: {
    alignSelf: 'flex-end',
    minHeight: campo.alturaTactil,
    justifyContent: 'center',
    paddingHorizontal: espaciado.xs,
    marginTop: -espaciado.lg,
    marginBottom: espaciado.xs,
  },
  olvidoTexto: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  pie: { textAlign: 'center', marginTop: espaciado.xl },
});
