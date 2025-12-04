#!/bin/bash

# Создаем namespace если он не существует
kubectl create namespace unkaos-dev 2>/dev/null || true

# Создаем секреты из .env файла
if [ -f ../.env ]; then
    echo "Creating secrets from .env file..."
    export $(cat ../.env | xargs)
    
    kubectl create secret generic unkaos-secrets \
        --namespace unkaos-dev \
        --from-literal=DB_USER="$DB_USER" \
        --from-literal=DB_PASSWORD="$DB_PASSWORD" \
        --from-literal=OPENAI_KEY="$OPENAI_KEY" \
        --from-literal=DISCORD_TOKEN="$DISCORD_TOKEN" \
        --from-literal=EMAIL_SERVICE="$EMAIL_SERVICE" \
        --from-literal=EMAIL_USER="$EMAIL_USER" \
        --from-literal=EMAIL_PASS="$EMAIL_PASS" \
        --from-literal=EMAIL_FROM="$EMAIL_FROM" \
        --from-literal=SLACK_TOKEN="$SLACK_TOKEN" \
        --from-literal=TELEGRAM_TOKEN="$TELEGRAM_TOKEN" \
        --from-literal=WHATSAPP_CODE="$WHATSAPP_CODE" \
        --from-literal=WHATSAPP_PHONE="$WHATSAPP_PHONE" \
        --dry-run=client -o yaml | kubectl apply -f -
else
    echo "Error: .env file not found!"
    exit 1
fi

# Применяем базовую конфигурацию
echo "Applying base configuration..."
kubectl apply -k base/

# Применяем конфигурацию окружения
echo "Applying environment configuration..."
kubectl apply -k overlays/development/

# Ждем, пока все поды будут готовы
echo "Waiting for all pods to be ready..."
kubectl wait --for=condition=ready pod --all -n unkaos-dev --timeout=300s

# Проверяем статус
echo "Checking deployment status..."
kubectl get pods -n unkaos-dev
