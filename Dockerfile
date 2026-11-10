# ==============================================================================
# Stage 1: Build (Nuxt 4 + Vuetify 4)
# ==============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Forzar resolución IPv4 primero para evitar que Node 22 intente salir por IPv6 sin ruta en la VM
# y se quede colgado hasta agotar el network-timeout (100s)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Habilitar Corepack para Yarn
RUN corepack enable

# Copiar manifiestos de dependencias primero para aprovechar caché de capas
COPY package.json yarn.lock ./

# Instalar dependencias ignorando postinstall prematuro y limitando concurrencia de sockets
RUN yarn install --ignore-scripts --ignore-engines --network-concurrency 8 --network-timeout 300000

# Copiar el código fuente de la aplicación
COPY . .

# Argumentos de build para que @nuxtjs/supabase preconfigure las opciones base
ARG SUPABASE_URL=http://localhost:54331
ARG SUPABASE_ANON_KEY=placeholder-anon-key
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
ARG SUPABASE_COOKIE_SECURE=false

ENV SUPABASE_URL=${SUPABASE_URL} \
    SUPABASE_KEY=${SUPABASE_ANON_KEY} \
    SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY} \
    SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
    SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
    SUPABASE_COOKIE_SECURE=${SUPABASE_COOKIE_SECURE} \
    NODE_ENV=production

# Preparar tipos y compilar aplicación Nuxt para producción (.output)
RUN npx nuxt prepare && yarn build

# ==============================================================================
# Stage 2: Runtime (Nitro Server ligero)
# ==============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Copiar únicamente el artefacto compilado de Nitro
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
