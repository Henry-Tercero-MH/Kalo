CREATE TABLE "asignaciones_labor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"server_updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint,
	"device_id" text,
	"created_by" uuid,
	"finca_id" uuid,
	"tipo_labor_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"trabajador_id" uuid NOT NULL,
	"cuadrilla_id" uuid,
	"fecha" date NOT NULL,
	"meta" double precision,
	"estado" text DEFAULT 'asignada' NOT NULL,
	"labor_id" uuid,
	"notas" text
);
--> statement-breakpoint
ALTER TABLE "asignaciones_labor" ADD CONSTRAINT "asignaciones_labor_tipo_labor_id_tipos_labor_id_fk" FOREIGN KEY ("tipo_labor_id") REFERENCES "public"."tipos_labor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones_labor" ADD CONSTRAINT "asignaciones_labor_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asignaciones_labor_sync_idx" ON "asignaciones_labor" USING btree ("finca_id","server_updated_at");