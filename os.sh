#!/bin/bash

# Detect OS and set package manager commands
OS_ID=$(awk -F= '/^ID=/{print $2}' /etc/os-release)
OS_ID="${OS_ID//\"/}" # Remove quotes from the string

case $OS_ID in
    ubuntu|debian|raspbian)
        PKG_MANAGER="apt"
        PKG_UPDATE="sudo $PKG_MANAGER update -y"
        PKG_INSTALL="sudo $PKG_MANAGER install -y"
        CERT_INSTALL="$PKG_INSTALL certbot"
        DOCKER_INSTALL="$PKG_INSTALL docker.io docker-compose"
        DOCKER_COMPOSE="docker-compose"
        PSQL="postgresql-client"
        ;;
    centos|fedora|rhel)
        PKG_MANAGER="yum"
        PKG_UPDATE="sudo $PKG_MANAGER update -y"
        PKG_INSTALL="sudo $PKG_MANAGER install -y"
        if [[ $OS_ID == "fedora" ]]; then
            CERT_INSTALL="$PKG_INSTALL certbot"
        else
            CERT_INSTALL="$PKG_INSTALL epel-release && sudo $PKG_MANAGER install certbot -y"
        fi
        DOCKER_INSTALL="sudo $PKG_MANAGER install -y yum-utils && sudo $PKG_MANAGER-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin"
        DOCKER_COMPOSE="docker compose"
        PSQL="postgresql"
        ;;
    *)
        echo "Unsupported OS: $OS_ID"
        exit 1
        ;;
esac
