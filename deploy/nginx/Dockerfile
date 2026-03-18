FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package*.json /app/
RUN npm ci

COPY index.html /app/
COPY public /app/public
COPY src /app/src
COPY tsconfig.json /app/
COPY vite.config.ts /app/
RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
RUN mkdir -p /var/www/backend-static
