#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script de despliegue y arranque para VM en Proxmox (Notarius-CC)
# Uso:
#   ./scripts/deploy-vm.sh [opciones]
#
# Opciones:
#   --tailscale       Auto-detecta la IP de Tailscale de la VM y configura SUPABASE_URL=http://<IP_TS>:54331
#   --url <URL>       URL pública/Tailscale de Supabase (ej. http://100.64.0.10:54331 o https://api.tudominio.com)
#   --port <PUERTO>   Puerto del frontend Nuxt (por defecto: 3010)
#   --https           Activa SUPABASE_COOKIE_SECURE=true (usar con Tailscale Serve HTTPS o Cloudflare Tunnel)
#   --reset           Ejecuta `supabase db reset` (reconstruye migraciones y vuelve a cargar supabase/seed.sql)
#   --skip-build      No reconstruye la imagen Docker de Nuxt (solo reinicia contenedor)
# ==============================================================================

SUPABASE_PUBLIC_URL=""
APP_PORT=""
COOKIE_SECURE=""
AUTO_TAILSCALE=false
DO_RESET=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tailscale)
      AUTO_TAILSCALE=true
      shift
      ;;
    --url)
      SUPABASE_PUBLIC_URL="$2"
      shift 2
      ;;
    --port)
      APP_PORT="$2"
      shift 2
      ;;
    --https)
      COOKIE_SECURE="true"
      shift
      ;;
    --reset)
      DO_RESET=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      echo "Opción no reconocida: $1"
      exit 1
      ;;
  esac
done

if [ "$AUTO_TAILSCALE" = true ] && [ -z "$SUPABASE_PUBLIC_URL" ]; then
  if command -v tailscale >/dev/null 2>&1; then
    TS_IP=$(tailscale ip -4 | head -n 1 | tr -d '[:space:]')
    if [ -n "$TS_IP" ]; then
      SUPABASE_PUBLIC_URL="http://${TS_IP}:54331"
      echo "==> IP de Tailscale detectada automáticamente: ${TS_IP}"
    else
      echo "ERROR: No se pudo obtener una IPv4 de Tailscale ('tailscale ip -4'). ¿Está conectado Tailscale?"
      exit 1
    fi
  else
    echo "ERROR: El comando 'tailscale' no está instalado en esta VM."
    exit 1
  fi
fi

echo "==> [1/5] Verificando prerrequisitos en la VM..."
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado o no está en el PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: El demonio de Docker no está corriendo o tu usuario no pertenece al grupo 'docker'."
  exit 1
fi

# Determinar cómo ejecutar Supabase CLI en el host (sin obligar a tener yarn en el host,
# ya que Nuxt se compila dentro del contenedor Docker)
if [ -x "./node_modules/.bin/supabase" ]; then
  SUPABASE_CMD="./node_modules/.bin/supabase"
elif command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD="supabase"
elif command -v npx >/dev/null 2>&1; then
  SUPABASE_CMD="npx --yes supabase@2.110.0"
else
  echo "==> Instalando Supabase CLI en la VM..."
  ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
  if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
  if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi
  TMP_DEB="/tmp/supabase_2.110.0_linux_${ARCH}.deb"
  curl -fsSL "https://github.com/supabase/cli/releases/download/v2.110.0/supabase_2.110.0_linux_${ARCH}.deb" -o "$TMP_DEB"
  sudo dpkg -i "$TMP_DEB"
  rm -f "$TMP_DEB"
  SUPABASE_CMD="supabase"
fi

echo "==> Usando comando Supabase: ${SUPABASE_CMD}"
echo "==> [2/5] Levantando stack de Supabase (Postgres, Auth, Storage, Kong, Studio)..."
$SUPABASE_CMD start

if [ "$DO_RESET" = true ]; then
  echo "==> [2.1/5] Aplicando migraciones y cargando datos semilla (supabase/seed.sql)..."
  $SUPABASE_CMD db reset
fi

echo "==> [3/5] Extrayendo credenciales locales de Supabase..."
STATUS_ENV=$($SUPABASE_CMD status -o env)

ANON_KEY=$(echo "$STATUS_ENV" | grep -E '^ANON_KEY=' | cut -d'=' -f2- | tr -d '"')
SERVICE_ROLE_KEY=$(echo "$STATUS_ENV" | grep -E '^SERVICE_ROLE_KEY=' | cut -d'=' -f2- | tr -d '"')
JWT_SECRET=$(echo "$STATUS_ENV" | grep -E '^JWT_SECRET=' | cut -d'=' -f2- | tr -d '"')

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: No se pudieron extraer ANON_KEY o SERVICE_ROLE_KEY de 'supabase status -o env'."
  exit 1
fi

# Crear .env desde .env.example si no existe
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "==> Archivo .env creado a partir de .env.example"
fi

# Función auxiliar para actualizar o insertar clave=valor en .env
upsert_env() {
  local key="$1"
  local val="$2"
  if grep -qE "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" .env && rm -f .env.bak
  else
    echo "${key}=${val}" >> .env
  fi
}

echo "==> [4/5] Actualizando variables en .env..."
upsert_env "SUPABASE_ANON_KEY" "$ANON_KEY"
upsert_env "SUPABASE_KEY" "$ANON_KEY"
upsert_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"
upsert_env "SUPABASE_SERVICE_KEY" "$SERVICE_ROLE_KEY"
upsert_env "SUPABASE_JWT_SECRET" "$JWT_SECRET"

if [ -n "$SUPABASE_PUBLIC_URL" ]; then
  upsert_env "SUPABASE_URL" "$SUPABASE_PUBLIC_URL"
fi

if [ -n "$APP_PORT" ]; then
  upsert_env "PORT" "$APP_PORT"
fi

if [ -n "$COOKIE_SECURE" ]; then
  upsert_env "SUPABASE_COOKIE_SECURE" "$COOKIE_SECURE"
fi

CURRENT_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d'=' -f2- || echo "http://localhost:54331")
CURRENT_PORT=$(grep -E '^PORT=' .env | cut -d'=' -f2- || echo "3010")
CURRENT_SECURE=$(grep -E '^SUPABASE_COOKIE_SECURE=' .env | cut -d'=' -f2- || echo "false")

echo "    PORT                   = ${CURRENT_PORT}"
echo "    SUPABASE_URL           = ${CURRENT_URL}"
echo "    SUPABASE_COOKIE_SECURE = ${CURRENT_SECURE}"

echo "==> [5/5] Levantando contenedor Nuxt 4 (notarius-web)..."
if [ "$SKIP_BUILD" = true ]; then
  docker compose up -d
else
  BUILDKIT_PROGRESS=plain docker compose up -d --build
fi

echo ""
echo "=============================================================================="
echo " Despliegue completado exitosamente"
echo "=============================================================================="
echo " - Aplicación Web (Nuxt 4) : Puerto ${CURRENT_PORT}"
echo " - Supabase API (Kong)     : Puerto 54331 (URL configurada: ${CURRENT_URL})"
echo " - Supabase Studio         : Puerto 54333"
echo " - Usuario Admin Semilla   : admin@notaria.local / Password123!"
echo "=============================================================================="
