# ==========================================
# BUILD STAGE
# ==========================================

FROM node:22-alpine AS build

WORKDIR /app

# Explicitly install development dependencies
ENV NODE_ENV=development

COPY package.json package-lock.json ./

RUN npm ci --include=dev

# Verify that Vite is installed
RUN ls -la node_modules/.bin/ && \
    node_modules/.bin/vite --version

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ==========================================
# PRODUCTION STAGE
# ==========================================

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
# COPY custom Nginx configuration to enable /api proxying and React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]