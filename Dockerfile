# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

ARG DATABASE_URL=postgresql://careerpilot:careerpilot@localhost:5432/careerpilot
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY prisma/schema.postgres.prisma prisma/schema.prisma
COPY prisma/migrations-postgres prisma/migrations
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy static assets + public into standalone output (required by Next.js standalone)
RUN cp -r .next/static .next/standalone/.next/static 2>/dev/null; \
    cp -r public .next/standalone/public 2>/dev/null; \
    chown -R node:node /app/.next/standalone

USER node
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
