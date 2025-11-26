# Imagen base oficial de Node
FROM node:18

# Directorio principal
WORKDIR /app

# Copiar package.json para instalar dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --production

# Copiar todo el proyecto al contenedor
COPY . .

# Puerto que utiliza Cloud Run
ENV PORT=8080
EXPOSE 8080

# Ejecutar servidor
CMD ["node", "server.js"]
