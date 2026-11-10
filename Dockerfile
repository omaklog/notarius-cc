# ==============================================================================
# Stage 1: Build (Nuxt 4 + Vuetify 4)
# ==============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Habilitar Corepack para Yarn
RUN corepack enable

# Copiar manifiestos de dependencias primero para aprovechar caché de capas
COPY package.json yarn.lock ./
COPY app/shims ./app/shims

# Instalar dependencias (incluye nuxt prepare en postinstall)
RUN yarn install --frozen-lockfile

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

# Compilar aplicación Nuxt para producción (.output)
RUN yarn build

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
