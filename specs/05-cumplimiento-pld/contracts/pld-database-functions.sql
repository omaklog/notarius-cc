-- ============================================================
-- Contratos de Funciones y Procedimientos Almacenados PLD
-- Feature: 05-cumplimiento-pld
-- ============================================================

-- 1. Evaluación y Cálculo de Umbrales LFPIORPI
-- Recalcula el valor UMA, veces UMA de la operación, límites de efectivo Art. 32
-- y actualiza o crea el registro en public.pld_evaluaciones_escritura.
create or replace function public.fn_evaluar_pld_escritura (
  p_escritura_id uuid
) returns public.pld_evaluaciones_escritura language plpgsql security definer;

-- 2. Detección de Screening Vigente para Reutilización Asistida (< 90 días)
-- Retorna JSON con los datos del screening más reciente válido si existe.
create or replace function public.fn_obtener_screening_vigente (
  p_compareciente_id uuid,
  p_escritura_id_actual uuid
) returns jsonb language plpgsql security definer;

-- 3. Importación Asistida de Screening PLD
-- Vincula las 4 consultas limpias existentes a la nueva escritura,
-- registrando método 'reutilizado_asistido' y autoría de quien autoriza.
create or replace function public.fn_importar_screening_pld (
  p_escritura_destino_id uuid,
  p_compareciente_id uuid,
  p_escritura_origen_id uuid
) returns setof public.pld_consultas language plpgsql security definer;

-- 4. Aprobación de Debida Diligencia Reforzada PEP
-- Exclusivo para usuarios con rol 'notario_titular' o 'administrador'.
-- Valida permisos RBAC, estampa sellado y actualiza pld_pep_diligencias.
create or replace function public.fn_aprobar_diligencia_pep (
  p_diligencia_id uuid,
  p_notas text
) returns public.pld_pep_diligencias language plpgsql security definer;

-- 5. Validación Canónica del Gate de Protocolización (Reemplazo definitivo)
-- Evalúa que todos los otorgantes tengan screening limpio, PEP aprobado,
-- efectivo dentro del límite legal y beneficiario controlador en personas morales.
create or replace function public.fn_validar_protocolizacion (
  p_escritura_id uuid
) returns jsonb language plpgsql security definer;
