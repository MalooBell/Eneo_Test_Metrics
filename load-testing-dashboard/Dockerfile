# Utiliser Node.js 20 (version LTS la plus récente)
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Nettoyer le cache npm et installer les dépendances
RUN npm cache clean --force && \
    npm install

# Copier tout le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement
ENV HOST=0.0.0.0
ENV PORT=3000

# Lancer l'application en mode développement
CMD ["npm", "run", "dev"]
