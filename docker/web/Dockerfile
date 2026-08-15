# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install --workspaces --include-workspace-root

COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w packages/shared && npm run build -w apps/web

# --- Runtime stage: static file server ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://localhost/ || exit 1
