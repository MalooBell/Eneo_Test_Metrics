# Image Python de base
FROM python:3.11-slim

# Variables d'environnement pour éviter les fichiers .pyc et buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Créer un utilisateur non-root pour la sécurité
RUN useradd -m -u 1000 locust && \
    mkdir -p /mnt/locust /scenarios && \
    chown -R locust:locust /mnt/locust /scenarios

# Copier et installer les dépendances
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Définir l'utilisateur
USER locust

# Répertoire de travail
WORKDIR /mnt/locust

# Exposer les ports
EXPOSE 8089 9646

# CMD par défaut
CMD ["locust", "-f", "locustfile.py", "--master"]
