# Image unique servant le site (next start) ou le worker (pnpm worker) selon la commande.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable && useradd --create-home ministere
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/data/ministere.sqlite STORAGE_DIR=/data/storage
COPY --from=build --chown=ministere /app /app
RUN mkdir -p /data && chown ministere /data
USER ministere
VOLUME ["/data"]
EXPOSE 3000
CMD ["pnpm", "start"]
