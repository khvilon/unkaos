sudo passwd

# Обновляем список пакетов
sudo apt update

# Устанавливаем PostgreSQL и дополнительные пакеты
sudo apt install postgresql postgresql-contrib

# Запускаем сервис PostgreSQL
sudo systemctl start postgresql.service

# Создаем пользователя unkaos
sudo -u postgres psql -c "CREATE ROLE unkaos WITH SUPERUSER LOGIN PASSWORD 'your_password';"

# Создаем базу данных unkaos
sudo -u postgres psql -c "CREATE DATABASE unkaos WITH OWNER = unkaos;"

# Загружаем sql скрипт в домашнюю директорию пользователя postgres
sudo wget -P /var/lib/postgresql https://raw.githubusercontent.com/khvilon/unkaos/dev/server/db/basic.sql

# Импортируем скрипт в базу данных unkaos
sudo -u postgres psql -d unkaos -f /var/lib/postgresql/basic.sql

# Загружаем sql скрипт в домашнюю директорию пользователя postgres
sudo wget -P /var/lib/postgresql https://raw.githubusercontent.com/khvilon/unkaos/dev/server/db/public.sql

# Импортируем скрипт в базу данных unkaos
sudo -u postgres psql -d unkaos -f /var/lib/postgresql/public.sql
