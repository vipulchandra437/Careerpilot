# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Build-time defaults (overridden by compose build.args).
ARG DATABASE_URL=postgresql://careerpilot:careerpilot@localhost:5432/careerpilot
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Install dependencies against the PRODUCTION (PostgreSQL) schema and its
# migration set, so the generated Prisma client and `migrate deploy` match the
# database that runs in production.
COPY prisma/schema.postgres.prisma prisma/schema.prisma
COPY prisma/migrations-postgres prisma/migrations
COPY package.json package-lock.json ./
RUN npm ci

# Copy the app source (prisma/schema.prisma and prisma/migrations are excluded
# via .dockerignore so they do not overwrite the PostgreSQL schema above).
COPY . .

RUN npx prisma generate && npm run build

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Run as a non-root user.
USER node

EXPOSE 3000
ENTRYPOINT ["/app/start.sh"]
