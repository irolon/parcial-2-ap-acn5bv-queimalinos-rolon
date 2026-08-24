# syntax=docker/dockerfile:1
#
# Imagen del backend de FitTrainer, con dos targets sobre la misma base:
#   dev  → nodemon + código montado por volumen (docker-compose.yml)
#   prod → dependencias de producción y código horneado (docker-compose.prod.yml)
#
# Node 22 alpine: coincide con la versión de desarrollo y cumple engines >=20.

FROM node:22-alpine AS base
WORKDIR /app
# Se copian solo los manifiestos primero: mientras no cambien, Docker reutiliza
# la capa de npm ci y el rebuild no vuelve a bajar todo el árbol de paquetes.
COPY package.json package-lock.json ./


# ── Desarrollo ──────────────────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]


# ── Producción ──────────────────────────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY . .
# No correr como root: si alguien escapa del proceso, cae en un usuario sin
# privilegios. La imagen de node ya trae el usuario `node`.
USER node
EXPOSE 3001
CMD ["npm", "start"]
