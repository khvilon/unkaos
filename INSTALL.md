sudo passwd

# Добавляем имя хоста в файл hosts
echo "127.0.0.1 $(hostname)" | sudo tee -a /etc/hosts

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
# Открываем пользователю БД доступ снаружи
echo "host    all             unkaos          0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/12/main/pg_hba.conf
sudo nano /etc/postgresql/12/main/postgresql.conf
# Тут ставим listen_addresses = '*'
sudo systemctl restart postgresql.service


sudo apt install nginx
systemctl start nginx

sudo apt install git
sudo mkdir /var/app
cd /var/app
sudo git clone -b dev https://github.com/khvilon/unkaos.git


sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
apt-cache policy docker-ce
sudo apt install docker-ce
sudo systemctl status docker

sudo curl -L "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

