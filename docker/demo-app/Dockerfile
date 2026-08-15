FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/demo-app/package.json apps/demo-app/package.json
RUN npm install --workspaces --include-workspace-root

COPY apps/demo-app apps/demo-app

ARG VITE_API_URL=http://localhost:4000
ARG VITE_AUTHFLOW_URL=http://localhost:5173
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTHFLOW_URL=$VITE_AUTHFLOW_URL

RUN npm run build -w apps/demo-app

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/demo-app/dist /usr/share/nginx/html
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
