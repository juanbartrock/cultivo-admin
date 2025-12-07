FROM node:20-alpine

# Instalar ffmpeg para capturar snapshots del stream RTSP
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar código fuente
COPY src/ ./src/

# Crear directorio para snapshots
RUN mkdir -p /app/snapshots && chown node:node /app/snapshots

# Exponer puerto
EXPOSE 3000

# Usuario no-root para seguridad
USER node

# Comando de inicio
CMD ["node", "src/index.js"]
