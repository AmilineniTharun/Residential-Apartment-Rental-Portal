# Stage 1: Build the Angular application
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx ng build --configuration production

# Stage 2: Serve the application via Nginx
FROM nginx:alpine

# Copy built static files from the build stage
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copy the Nginx configuration template
# The official Nginx Alpine image automatically replaces variables inside the templates directory based on the env
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Ensure the app starts and exposes the PORT defined by the environment
EXPOSE 8080
