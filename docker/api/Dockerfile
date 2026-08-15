# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/security/package.json packages/security/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json

RUN npm install --workspaces --include-workspace-root

COPY packages/security packages/security
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build -w packages/security \
 && npm run build -w packages/shared \
 && npm run build -w apps/api \
 && npx prisma generate --schema apps/api/prisma/schema.prisma

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production

RUN addgroup -S authflow && adduser -S authflow -G authflow

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/packages/security ./packages/security
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api ./apps/api

WORKDIR /repo/apps/api
USER authflow

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
