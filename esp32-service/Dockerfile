FROM node:20-alpine

WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY src/ ./src/

# Exponer puerto
EXPOSE 3000

# Iniciar aplicación
CMD ["npm", "start"]
