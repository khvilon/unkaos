@echo off
setlocal enabledelayedexpansion

REM Создаем namespace если он не существует
kubectl create namespace unkaos-dev 2>nul

REM Создаем секреты из .env файла
if exist ..\.env (
    echo Creating secrets from .env file...
    for /f "tokens=*" %%a in ('type ..\.env') do (
        set "%%a"
    )
    
    kubectl create secret generic unkaos-secrets ^
        --namespace unkaos-dev ^
        --from-literal=DB_USER="%DB_USER%" ^
        --from-literal=DB_PASSWORD="%DB_PASSWORD%" ^
        --from-literal=OPENAI_KEY="%OPENAI_KEY%" ^
        --from-literal=DISCORD_TOKEN="%DISCORD_TOKEN%" ^
        --from-literal=EMAIL_SERVICE="%EMAIL_SERVICE%" ^
        --from-literal=EMAIL_USER="%EMAIL_USER%" ^
        --from-literal=EMAIL_PASS="%EMAIL_PASS%" ^
        --from-literal=EMAIL_FROM="%EMAIL_FROM%" ^
        --from-literal=SLACK_TOKEN="%SLACK_TOKEN%" ^
        --from-literal=TELEGRAM_TOKEN="%TELEGRAM_TOKEN%" ^
        --from-literal=WHATSAPP_CODE="%WHATSAPP_CODE%" ^
        --from-literal=WHATSAPP_PHONE="%WHATSAPP_PHONE%" ^
        --dry-run=client -o yaml | kubectl apply -f -
) else (
    echo Error: .env file not found!
    exit /b 1
)

REM Применяем базовую конфигурацию
echo Applying base configuration...
kubectl apply -k base/

REM Применяем конфигурацию окружения
echo Applying environment configuration...
kubectl apply -k overlays/development/

REM Ждем, пока все поды будут готовы
echo Waiting for all pods to be ready...
kubectl wait --for=condition=ready pod --all -n unkaos-dev --timeout=300s

REM Проверяем статус
echo Checking deployment status...
kubectl get pods -n unkaos-dev

endlocal
