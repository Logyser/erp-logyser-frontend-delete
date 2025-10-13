# Usa una imagen oficial de Node.js
FROM node:18

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de tu backend al contenedor
COPY package*.json ./
COPY . .

# Instala las dependencias
RUN npm install

# Expone el puerto que usa tu app (3000)
EXPOSE 3000

# Comando para arrancar la app
CMD ["node", "app.js"]