CREATE TABLE "alertas_fusarium" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"estado_validacion" text DEFAULT 'pendiente' NOT NULL,
	"validado_por" uuid,
	"validado_en" bigint,
	"motivo_rechazo" text,
	"lote_id" uuid,
	"fecha" date NOT NULL,
	"sintomas" jsonb NOT NULL,
	"estado" text DEFAULT 'sospecha' NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"tipo" text NOT NULL,
	"mime" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"ancho" double precision,
	"alto" double precision,
	"registro_tabla" text NOT NULL,
	"registro_id" uuid NOT NULL,
	"estado_subida" text DEFAULT 'pendiente' NOT NULL,
	"clave_s3" text,
	"uri_local" text
);
--> statement-breakpoint
CREATE TABLE "asistencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"trabajador_id" uuid NOT NULL,
	"cuadrilla_id" uuid,
	"fecha" date NOT NULL,
	"presente" boolean NOT NULL,
	"hora_entrada" bigint
);
--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finca_id" uuid,
	"usuario_id" uuid,
	"dispositivo_id" text,
	"accion" text NOT NULL,
	"tabla" text,
	"registro_id" text,
	"datos" jsonb,
	"requiere_revision" boolean DEFAULT false NOT NULL,
	"resuelto_por" uuid,
	"resuelto_en" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cobertura_lote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lote_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"celdas_total" integer NOT NULL,
	"celdas_recorridas" integer NOT NULL,
	"porcentaje" double precision NOT NULL,
	"celdas" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colores_cinta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"nombre" text NOT NULL,
	"hex" text NOT NULL,
	"orden" integer NOT NULL,
	"pendiente_confirmar" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consentimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"version_texto" text NOT NULL,
	"aceptado" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conteos_cinta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"lote_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"color_cinta_id" uuid NOT NULL,
	"racimos" integer NOT NULL,
	"origen" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosecha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"estado_validacion" text DEFAULT 'pendiente' NOT NULL,
	"validado_por" uuid,
	"validado_en" bigint,
	"motivo_rechazo" text,
	"lote_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"color_cinta_id" uuid NOT NULL,
	"racimos_cosechados" integer NOT NULL,
	"racimos_perdidos" integer NOT NULL,
	"motivo_perdida" text,
	"cuadrilla_id" uuid
);
--> statement-breakpoint
CREATE TABLE "cuadrilla_miembros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"cuadrilla_id" uuid NOT NULL,
	"trabajador_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuadrillas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"nombre" text NOT NULL,
	"caporal_id" uuid
);
--> statement-breakpoint
CREATE TABLE "definiciones_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"version" integer NOT NULL,
	"titulo" text NOT NULL,
	"definicion" jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispositivos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"finca_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"modelo" text,
	"sistema" text,
	"version_app" text,
	"estado" text DEFAULT 'activo' NOT NULL,
	"ultimo_sync" bigint,
	"registros_pendientes" integer DEFAULT 0 NOT NULL,
	"archivos_pendientes" integer DEFAULT 0 NOT NULL,
	"clave_respaldo" text NOT NULL,
	"registrado_por" uuid,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"nombre" text NOT NULL,
	"codigo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enfunde" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"lote_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"color_cinta_id" uuid NOT NULL,
	"racimos" integer NOT NULL,
	"cuadrilla_id" uuid,
	"trabajador_id" uuid
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"rol_id" uuid,
	"activo" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fincas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"codigo" text NOT NULL,
	"unidad_area" text DEFAULT 'ha' NOT NULL,
	"centro_lat" double precision NOT NULL,
	"centro_lng" double precision NOT NULL,
	"bbox" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"estado_validacion" text DEFAULT 'pendiente' NOT NULL,
	"validado_por" uuid,
	"validado_en" bigint,
	"motivo_rechazo" text,
	"tipo_labor_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"trabajador_id" uuid,
	"cuadrilla_id" uuid,
	"fecha" date NOT NULL,
	"cantidad" double precision NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "lecturas_trampa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"trampa_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"cantidad" integer NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"hectareas" double precision NOT NULL,
	"poblacion" double precision NOT NULL,
	"poligono" jsonb NOT NULL,
	"geom" geometry(Polygon,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_GeomFromGeoJSON(poligono::text), 4326)) STORED
);
--> statement-breakpoint
CREATE TABLE "modulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" double precision NOT NULL,
	CONSTRAINT "modulos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "muestreos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"lote_id" uuid NOT NULL,
	"plaga_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"incidencia" double precision NOT NULL,
	"severidad" text NOT NULL,
	"respuestas" jsonb NOT NULL,
	"formulario_id" uuid,
	"formulario_version" integer NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "ordenes_trabajo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"titulo" text NOT NULL,
	"descripcion" text,
	"modulo" text NOT NULL,
	"lote_id" uuid,
	"asignado_a" uuid NOT NULL,
	"asignado_por" uuid,
	"fecha" date NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"clave" text NOT NULL,
	"valor" jsonb NOT NULL,
	"descripcion" text NOT NULL,
	"pendiente" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"modulo" text NOT NULL,
	"accion" text NOT NULL,
	"descripcion" text NOT NULL,
	CONSTRAINT "permisos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "plagas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"nombre_cientifico" text,
	"tipo" text NOT NULL,
	"umbral_alerta" double precision NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preaviso_sigatoka" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"precision_gps" double precision,
	"hora_gps" bigint,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END) STORED,
	"lote_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"plantas_muestreadas" integer NOT NULL,
	"hoja_mas_joven_enferma" double precision NOT NULL,
	"estado_evolucion" double precision NOT NULL,
	"severidad" double precision NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "pronosticos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finca_id" uuid NOT NULL,
	"generado_en" bigint NOT NULL,
	"generado_por" uuid,
	"anio" integer NOT NULL,
	"semana" integer NOT NULL,
	"racimos" double precision NOT NULL,
	"factor" double precision NOT NULL,
	"cajas" double precision NOT NULL,
	"detalle" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puntos_ruta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"ruta_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"precision_gps" double precision NOT NULL,
	"hora_gps" bigint NOT NULL,
	"secuencia" integer NOT NULL,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sujeto_tipo" text NOT NULL,
	"sujeto_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"expira_en" bigint NOT NULL,
	"revocado_en" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "refresh_tokens_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "rol_permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"rol_id" uuid NOT NULL,
	"permiso_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"plataformas" jsonb NOT NULL,
	CONSTRAINT "roles_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "rutas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"usuario_id" uuid NOT NULL,
	"orden_trabajo_id" uuid,
	"lote_id" uuid,
	"tarea" text NOT NULL,
	"inicio" bigint NOT NULL,
	"fin" bigint,
	"estado" text NOT NULL,
	"distancia_m" double precision DEFAULT 0 NOT NULL,
	"puntos" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semanas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"anio" integer NOT NULL,
	"numero" integer NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"color_cinta_id" uuid NOT NULL,
	"factor" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_labor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"unidad" text NOT NULL,
	"tarifa" double precision,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trabajadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"dpi" text NOT NULL,
	"cuadrilla_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "trabajadores_dpi_unique" UNIQUE("dpi")
);
--> statement-breakpoint
CREATE TABLE "trampas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"lote_id" uuid NOT NULL,
	"codigo_qr" text NOT NULL,
	"nombre" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"geom" geometry(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
	CONSTRAINT "trampas_codigo_qr_unique" UNIQUE("codigo_qr")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"empresa_id" uuid NOT NULL,
	"usuario" text NOT NULL,
	"nombre" text NOT NULL,
	"rol_id" uuid NOT NULL,
	"pin_hash" text NOT NULL,
	"pin_offline_hash" text NOT NULL,
	"pin_offline_sal" text NOT NULL,
	"gafete_hash" text,
	"trabajador_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "usuarios_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
ALTER TABLE "alertas_fusarium" ADD CONSTRAINT "alertas_fusarium_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_trabajador_id_trabajadores_id_fk" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobertura_lote" ADD CONSTRAINT "cobertura_lote_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteos_cinta" ADD CONSTRAINT "conteos_cinta_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteos_cinta" ADD CONSTRAINT "conteos_cinta_color_cinta_id_colores_cinta_id_fk" FOREIGN KEY ("color_cinta_id") REFERENCES "public"."colores_cinta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosecha" ADD CONSTRAINT "cosecha_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosecha" ADD CONSTRAINT "cosecha_color_cinta_id_colores_cinta_id_fk" FOREIGN KEY ("color_cinta_id") REFERENCES "public"."colores_cinta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuadrilla_miembros" ADD CONSTRAINT "cuadrilla_miembros_cuadrilla_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_id") REFERENCES "public"."cuadrillas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuadrilla_miembros" ADD CONSTRAINT "cuadrilla_miembros_trabajador_id_trabajadores_id_fk" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuadrillas" ADD CONSTRAINT "cuadrillas_caporal_id_usuarios_id_fk" FOREIGN KEY ("caporal_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enfunde" ADD CONSTRAINT "enfunde_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enfunde" ADD CONSTRAINT "enfunde_color_cinta_id_colores_cinta_id_fk" FOREIGN KEY ("color_cinta_id") REFERENCES "public"."colores_cinta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fincas" ADD CONSTRAINT "fincas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labores" ADD CONSTRAINT "labores_tipo_labor_id_tipos_labor_id_fk" FOREIGN KEY ("tipo_labor_id") REFERENCES "public"."tipos_labor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labores" ADD CONSTRAINT "labores_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas_trampa" ADD CONSTRAINT "lecturas_trampa_trampa_id_trampas_id_fk" FOREIGN KEY ("trampa_id") REFERENCES "public"."trampas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas_trampa" ADD CONSTRAINT "lecturas_trampa_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muestreos" ADD CONSTRAINT "muestreos_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muestreos" ADD CONSTRAINT "muestreos_plaga_id_plagas_id_fk" FOREIGN KEY ("plaga_id") REFERENCES "public"."plagas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_asignado_a_usuarios_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preaviso_sigatoka" ADD CONSTRAINT "preaviso_sigatoka_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronosticos" ADD CONSTRAINT "pronosticos_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_ruta" ADD CONSTRAINT "puntos_ruta_ruta_id_rutas_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."rutas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_permiso_id_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semanas" ADD CONSTRAINT "semanas_color_cinta_id_colores_cinta_id_fk" FOREIGN KEY ("color_cinta_id") REFERENCES "public"."colores_cinta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trampas" ADD CONSTRAINT "trampas_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_trabajador_id_trabajadores_id_fk" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alertas_fusarium_sync_idx" ON "alertas_fusarium" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "archivos_sync_idx" ON "archivos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "archivos_registro_idx" ON "archivos" USING btree ("registro_tabla","registro_id");--> statement-breakpoint
CREATE INDEX "asistencia_sync_idx" ON "asistencia" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "bitacora_registro_idx" ON "bitacora" USING btree ("tabla","registro_id");--> statement-breakpoint
CREATE INDEX "bitacora_revision_idx" ON "bitacora" USING btree ("requiere_revision","created_at");--> statement-breakpoint
CREATE INDEX "cobertura_lote_sync_idx" ON "cobertura_lote" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cobertura_uq" ON "cobertura_lote" USING btree ("lote_id","anio","semana");--> statement-breakpoint
CREATE INDEX "colores_cinta_sync_idx" ON "colores_cinta" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "consentimientos_sync_idx" ON "consentimientos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "conteos_cinta_sync_idx" ON "conteos_cinta" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "cosecha_sync_idx" ON "cosecha" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "cosecha_semana_idx" ON "cosecha" USING btree ("anio","semana");--> statement-breakpoint
CREATE INDEX "cuadrilla_miembros_sync_idx" ON "cuadrilla_miembros" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "cuadrillas_sync_idx" ON "cuadrillas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "definiciones_formulario_sync_idx" ON "definiciones_formulario" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "formulario_version_uq" ON "definiciones_formulario" USING btree ("codigo","version");--> statement-breakpoint
CREATE INDEX "empresas_sync_idx" ON "empresas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "enfunde_sync_idx" ON "enfunde" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "enfunde_semana_idx" ON "enfunde" USING btree ("anio","semana");--> statement-breakpoint
CREATE INDEX "feature_flags_sync_idx" ON "feature_flags" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "fincas_sync_idx" ON "fincas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "labores_sync_idx" ON "labores" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "lecturas_trampa_sync_idx" ON "lecturas_trampa" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "lotes_sync_idx" ON "lotes" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "lotes_geom_idx" ON "lotes" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "modulos_sync_idx" ON "modulos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "muestreos_sync_idx" ON "muestreos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "muestreos_lote_fecha_idx" ON "muestreos" USING btree ("lote_id","fecha");--> statement-breakpoint
CREATE INDEX "ordenes_trabajo_sync_idx" ON "ordenes_trabajo" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "parametros_sync_idx" ON "parametros" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "parametro_uq" ON "parametros" USING btree ("finca_id","clave");--> statement-breakpoint
CREATE INDEX "permisos_sync_idx" ON "permisos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "plagas_sync_idx" ON "plagas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "preaviso_sigatoka_sync_idx" ON "preaviso_sigatoka" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "puntos_ruta_sync_idx" ON "puntos_ruta" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "puntos_ruta_ruta_idx" ON "puntos_ruta" USING btree ("ruta_id","secuencia");--> statement-breakpoint
CREATE INDEX "puntos_ruta_geom_idx" ON "puntos_ruta" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "refresh_sujeto_idx" ON "refresh_tokens" USING btree ("sujeto_tipo","sujeto_id");--> statement-breakpoint
CREATE INDEX "rol_permisos_sync_idx" ON "rol_permisos" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rol_permiso_uq" ON "rol_permisos" USING btree ("rol_id","permiso_id");--> statement-breakpoint
CREATE INDEX "roles_sync_idx" ON "roles" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "rutas_sync_idx" ON "rutas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "semanas_sync_idx" ON "semanas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "semana_uq" ON "semanas" USING btree ("finca_id","anio","numero");--> statement-breakpoint
CREATE INDEX "tipos_labor_sync_idx" ON "tipos_labor" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "trabajadores_sync_idx" ON "trabajadores" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "trampas_sync_idx" ON "trampas" USING btree ("finca_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "usuarios_sync_idx" ON "usuarios" USING btree ("finca_id","server_updated_at");