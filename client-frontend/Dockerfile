# ============================================
# Dockerfile pour Frontend React Museum Voice
# ============================================

FROM node:18-alpine AS build

WORKDIR /app

# Build arguments (URLs publiques pour le client)
ARG REACT_APP_BACKEND_URL=http://51.38.188.211:5000
ARG REACT_APP_ADMIN_URL=http://51.38.188.211:3000

# Les convertir en variables d'environnement pour le build React
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_ADMIN_URL=$REACT_APP_ADMIN_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build React app (les variables d'environnement REACT_APP_* sont intégrées au build)
RUN npm run build

# Production stage avec Nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
