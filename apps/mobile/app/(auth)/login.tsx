/**
 * Inicio de sesión rápido: usuario + PIN de 4 dígitos, o gafete QR. Funciona sin señal.
 * Paso 1: el trabajador toca su nombre (celulares compartidos, cambio rápido de usuario).
 * Paso 2: escribe su PIN en un teclado grande; al cuarto dígito entra solo.
 */
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { campo, colores, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { esModoDemo, PINES_DEMO } from '@/demo/modo';
import { iniciarConPin } from '@/permisos/sesion';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'] as const;
const MARCA_DEMO = /\s*\(DEMO\)\s*$/i;

/** Nombre sin la marca «(DEMO)»: la marca se muestra aparte como etiqueta. */
const nombreVisible = (nombre: string) => nombre.replace(MARCA_DEMO, '');

/** Iniciales para el cuadro del usuario: primera letra de las dos primeras palabras. */
function iniciales(nombre: string) {
  return nombreVisible(nombre)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Avatar({ nombre, activo }: { nombre: string; activo?: boolean }) {
  return (
    <View style={[estilos.avatar, activo && estilos.avatarActivo]}>
      <Text style={[estilos.avatarTexto, activo && { color: semantico.titulo }]}>
        {iniciales(nombre)}
      </Text>
    </View>
  );
}

function MarcaDemo() {
  return (
    <View style={estilos.marcaDemo}>
      <Text style={estilos.marcaDemoTexto}>DEMO</Text>
    </View>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const todos = useConsulta('usuarios');
  const roles = useConsulta('roles');
  const [usuario, setUsuario] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const sacudida = useRef(new Animated.Value(0)).current;
  const demo = esModoDemo();

  const usuarios = useMemo(
    () => todos.filter((u) => u.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [todos],
  );
  const nombreRol = useMemo(() => new Map(roles.map((r) => [r.id, r.nombre])), [roles]);
  const elegido = usuarios.find((u) => u.usuario === usuario);

  const sacudir = () => {
    sacudida.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((x) =>
        Animated.timing(sacudida, { toValue: x, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  };

  const entrar = async (pinCompleto: string) => {
    if (!usuario) return;
    setCargando(true);
    // Deja pintar el indicador antes del cálculo del hash.
    await new Promise((r) => setTimeout(r, 30));
    const r = await iniciarConPin(usuario, pinCompleto);
    setCargando(false);
    if (r.ok) return router.replace('/(tabs)');
    setPin('');
    sacudir();
    setError(
      r.motivo === 'bloqueado' ? t('login.bloqueado', { min: r.minutos }) : t('login.pinIncorrecto'),
    );
  };

  const tecla = (k: (typeof TECLAS)[number]) => {
    setError(null);
    if (k === 'borrar') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    const nuevo = pin + k;
    setPin(nuevo);
    if (nuevo.length === 4) void entrar(nuevo);
  };

  const cambiarUsuario = () => {
    setUsuario(null);
    setPin('');
    setError(null);
  };

  // Paso 1: elegir usuario.
  if (!elegido) {
    return (
      <Pantalla>
        <Titulo>{t('login.titulo')}</Titulo>
        <Text style={[estilosBase.cuerpo, estilos.ayuda]}>{t('login.toqueSuNombre')}</Text>
        {usuarios.length === 0 ? <Aviso tipo="alerta" texto={t('login.sinUsuarios')} /> : null}
        <View style={estilos.lista}>
          {usuarios.map((u) => (
            <Pressable
              key={u.id}
              accessibilityRole="button"
              accessibilityLabel={`${nombreVisible(u.nombre)}, ${nombreRol.get(u.rol_id) ?? ''}`}
              onPress={() => {
                setUsuario(u.usuario);
                setPin('');
                setError(null);
              }}
              style={({ pressed }) => [estilos.fila, pressed && estilos.filaPresionada]}
            >
              <Avatar nombre={u.nombre} />
              <View style={{ flex: 1 }}>
                <View style={estilos.filaNombre}>
                  <Text style={estilos.nombre} numberOfLines={2}>
                    {nombreVisible(u.nombre)}
                  </Text>
                  {MARCA_DEMO.test(u.nombre) ? <MarcaDemo /> : null}
                </View>
                <Text style={estilosBase.secundario} numberOfLines={1}>
                  {nombreRol.get(u.rol_id) ?? ''}
                </Text>
              </View>
              <Icono nombre="chevron-right" color={semantico.textoSecundario} />
            </Pressable>
          ))}
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
      </Pantalla>
    );
  }

  // Paso 2: PIN.
  const pinDemo = demo ? PINES_DEMO[elegido.usuario] : undefined;
  return (
    <Pantalla>
      <View style={estilos.tarjetaUsuario}>
        <Avatar nombre={elegido.nombre} activo />
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre} numberOfLines={2}>
            {nombreVisible(elegido.nombre)}
          </Text>
          <Text style={estilosBase.secundario}>{nombreRol.get(elegido.rol_id) ?? ''}</Text>
        </View>
        <Pressable
          onPress={cambiarUsuario}
          accessibilityRole="button"
          accessibilityLabel={t('login.cambiarUsuario')}
          hitSlop={8}
          style={estilos.cambiar}
        >
          <Text style={estilos.cambiarTexto}>{t('login.cambiar')}</Text>
        </Pressable>
      </View>

      <View style={estilos.zonaPin}>
        <View style={estilos.filaEtiquetaPin}>
          <Icono nombre="lock-keyhole" tamano={18} color={semantico.textoSecundario} />
          <Text style={estilosBase.etiqueta}>{t('login.escribaPin')}</Text>
        </View>
        <Animated.View
          style={[estilos.casillas, { transform: [{ translateX: sacudida }] }]}
          accessibilityLabel={t('login.digitos', { n: pin.length })}
        >
          {[0, 1, 2, 3].map((i) => {
            const lleno = i < pin.length;
            const actual = i === pin.length && !cargando;
            return (
              <View
                key={i}
                style={[
                  estilos.casilla,
                  actual && estilos.casillaActual,
                  error ? estilos.casillaError : null,
                ]}
              >
                {lleno ? <View style={estilos.puntoPin} /> : null}
              </View>
            );
          })}
        </Animated.View>
        <View style={estilos.mensaje} accessibilityLiveRegion="polite">
          {cargando ? (
            <Text style={estilosBase.secundario}>{t('login.verificando')}</Text>
          ) : error ? (
            <Text style={estilos.error}>{error}</Text>
          ) : pinDemo ? (
            <Text style={estilosBase.secundario}>{t('login.pinDemo', { pin: pinDemo })}</Text>
          ) : null}
        </View>
      </View>

      <View style={estilos.teclado}>
        {TECLAS.map((k, i) =>
          k ? (
            <Pressable
              key={i}
              disabled={cargando}
              onPress={() => tecla(k)}
              accessibilityRole="button"
              accessibilityLabel={k === 'borrar' ? t('login.borrar') : k}
              style={({ pressed }) => [
                estilos.tecla,
                k === 'borrar' && estilos.teclaBorrar,
                pressed && estilos.teclaPresionada,
              ]}
            >
              {k === 'borrar' ? (
                <Icono nombre="delete" tamano={30} color={semantico.titulo} />
              ) : (
                <Text style={estilos.textoTecla}>{k}</Text>
              )}
            </Pressable>
          ) : (
            <View key={i} style={[estilos.tecla, estilos.teclaVacia]} />
          ),
        )}
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  ayuda: { marginTop: espaciado.sm, color: semantico.textoSecundario },
  lista: {
    marginTop: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
  },
  fila: {
    minHeight: campo.alturaTactil + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.xs,
    borderBottomWidth: 1,
    borderBottomColor: semantico.borde,
  },
  filaPresionada: { backgroundColor: semantico.fondoSuave },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  nombre: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 18,
    color: semantico.titulo,
    flexShrink: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: semantico.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActivo: { backgroundColor: semantico.acento },
  avatarTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 18,
    color: semantico.fondo,
    letterSpacing: 1,
  },
  marcaDemo: {
    backgroundColor: colores.estados.alerta,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  marcaDemoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 10,
    letterSpacing: 1,
    color: semantico.titulo,
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginVertical: espaciado.lg,
  },
  linea: { flex: 1, height: 1, backgroundColor: semantico.borde },

  tarjetaUsuario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
    borderLeftWidth: 4,
    borderLeftColor: semantico.acento,
  },
  cambiar: {
    minHeight: 40,
    paddingHorizontal: espaciado.md,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
  },
  cambiarTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: semantico.titulo,
  },
  zonaPin: { alignItems: 'center', marginTop: espaciado.xl },
  filaEtiquetaPin: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  casillas: { flexDirection: 'row', gap: espaciado.md, marginTop: espaciado.md },
  casilla: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: semantico.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaActual: { borderColor: semantico.bordeFuerte },
  casillaError: { borderColor: semantico.peligro },
  puntoPin: { width: 16, height: 16, backgroundColor: semantico.titulo },
  mensaje: { minHeight: 40, justifyContent: 'center', marginTop: espaciado.sm },
  error: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.peligro,
    textAlign: 'center',
  },
  teclado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  tecla: {
    width: '31.5%',
    minHeight: campo.alturaTactil + 12,
    backgroundColor: semantico.fondoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaBorrar: { backgroundColor: semantico.fondo },
  teclaVacia: { backgroundColor: 'transparent' },
  teclaPresionada: { backgroundColor: semantico.borde },
  textoTecla: { fontFamily: tipografia.familias.titulo, fontSize: 28, color: semantico.titulo },
});
