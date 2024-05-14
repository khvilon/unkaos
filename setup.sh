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

# 1. Clone the repo
echo "127.0.0.1 $(hostname)" | sudo tee -a /etc/hosts
eval $PKG_UPDATE
mkdir -p /var/app
cd /var/app
eval $PKG_INSTALL git
git clone -b dev https://github.com/khvilon/unkaos.git
cd /var/app/unkaos

source /tools.sh
eval $PKG_INSTALL $PSQL

# 2. Set your env variables
ENV_FILE=".env_data"
NEW_ENV=".env"

touch $NEW_ENV

prev_line=""

superuser_password=$(generate_password)
sed -i "s/unkaossuperpass/$superuser_password/g" $ENV_FILE

while IFS= read -r line; do
    if [[ $line == *=* ]]; then
        if [[ $prev_line == "#>>"* ]]; then
            key=$(echo $line | cut -d'=' -f1)
            value=$(echo $line | cut -d'=' -f2)
            comment="${prev_line#*#>>}"
            echo "Description: $comment"
            echo "Current value for $key is: $value"
            read -p "Enter a new value or press ENTER to keep the current value: " new_value < /dev/tty

            if [[ -n $new_value ]]; then
                echo "$key=$new_value" >> $NEW_ENV
            else
                echo "$key=$value" >> $NEW_ENV
            fi
        else
            echo "$line" >> $NEW_ENV
        fi
    fi
    prev_line="$line"
done < $ENV_FILE

echo "Updated .env file saved."

# 3. Make a copy of the server/db/public.sql with the changed schema
schema_name="server"

cp server/db/-public.sql server/db/0$schema_name.sql
sed -i "s/\bpublic\b/$schema_name/g" server/db/0$schema_name.sql

for file in server/db/*_m.sql; do
    new_file="${file/_m/_m_$schema_name}"
    cp "$file" "$new_file"
    sed -i "s/\bpublic\b/$schema_name/g" "$new_file"
done

# 4. Setting up SSL with Certbot if the user has no certificate
read -p "Do you want to use Certbot for SSL setup? (yes by default, press ENTER) or type 'no' to skip: " use_certbot < /dev/tty
use_certbot=${use_certbot:-yes}
if [[ $use_certbot != "no" ]]; then
    eval $CERT_INSTALL
    source $NEW_ENV
    sudo certbot certonly --standalone -d $DOMAIN --register-unsafely-without-email --agree-tos --no-eff-email
    cp -rfL /etc/letsencrypt/live/$DOMAIN/* /var/app/unkaos/nginx/ssl
    (crontab -l ; echo "0 */12 * * * /usr/bin/certbot renew --quiet --post-hook \"docker-compose -f /var/app/unkaos/docker-compose.yml restart nginx\"") | crontab -
fi

# 5. Run docker containers
eval $DOCKER_INSTALL
sudo systemctl start docker
sudo systemctl enable docker

CPU_CORES=$(nproc)
if [ "$CPU_CORES" -gt 1 ]; then
    CPU_CORES=$((CPU_CORES - 1))
else
    CPU_CORES=1
fi

$DOCKER_COMPOSE up -d \
--scale cerberus=$CPU_CORES \
--scale zeus=$CPU_CORES \
--scale gateway=$CPU_CORES 

# 6. Set up a Cron Job to run update.sh every 5 minutes
(crontab -l ; echo "*/5 * * * * /bin/bash /var/app/unkaos/update.sh") | crontab -

echo "Setup complete!"
