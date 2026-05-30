FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY apps/web apps/web

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace apps/web run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 80

ENV HOSTNAME="0.0.0.0"
WORKDIR /app/apps/web
CMD ["node", "server.js"]
