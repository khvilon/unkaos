Все что нужно сделать
1. установить пакеты
    sudo apt update
    sudo apt install apt-transport-https ca-certificates curl software-properties-common git
2. установить докер
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
    apt-cache policy docker-ce
    sudo apt install docker-ce
    sudo systemctl start docker   
    sudo systemctl enable docker
    sudo curl -L "https://github.com/docker/compose/releases/download/2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
3. Клонировать репозиторий
    sudo mkdir /var/app
    cd /var/app
    sudo git clone -b dev https://github.com/khvilon/unkaos.git   
4. Заполнить переменные
    cd /var/app/unkaos/server
    vi .env
5. Запустить docker-compose
    cd /var/app/unkaos/server
    docker-compose up -d --build
6. Проверить что все сервисы поднялись
    cd /var/app/unkaos/server
    docker-compose ps
7. Усправить ошибки в логах сервисов 
    cd /var/app/unkaos/server
    docker-compose logs ossa
