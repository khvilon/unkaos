#!/bin/bash

# Function to generate a random 8-letter password
generate_password() {
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 8 | head -n 1
}

# Function to validate the workspace name
validate_workspace_name() {
    local name=$1
    if [[ -z $name ]]; then
        echo "Workspace name cannot be empty."
        return 1
    elif [[ $name =~ [^a-zA-Z0-9_] ]]; then
        echo "Workspace name can only contain letters, numbers, and underscores."
        return 1
    elif [[ ${#name} -ge 64 ]]; then
        echo "Workspace name should be shorter than 64 characters."
        return 1
    elif [[ ! $name =~ ^[a-zA-Z_] ]]; then
        echo "Workspace name should start with a letter or an underscore."
        return 1
    fi
    return 0
}

# Detect OS and set package manager commands
OS_ID=$(awk -F= '/^ID=/{print $2}' /etc/os-release)
OS_ID="${OS_ID//\"/}" # Remove quotes from the string

case $OS_ID in
    ubuntu|debian|raspbian)
        PKG_MANAGER="apt"
        PKG_UPDATE="$PKG_MANAGER update -y"
        PKG_INSTALL="$PKG_MANAGER install -y"
        CERT_INSTALL="$PKG_INSTALL certbot"
        DOCKER_INSTALL="$PKG_INSTALL docker.io docker-compose"
        ;;
    centos)
        PKG_MANAGER="yum"
        PKG_UPDATE="$PKG_MANAGER update -y"
        PKG_INSTALL="$PKG_MANAGER install -y"
        CERT_INSTALL="$PKG_INSTALL epel-release && $PKG_MANAGER install certbot -y"
        DOCKER_INSTALL="$PKG_MANAGER install -y yum-utils && $PKG_MANAGER-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin"
        ;;
    *)
        echo "Unsupported OS: $OS_ID"
        exit 1
        ;;
esac

# 1. Clone the repo
echo "127.0.0.1 $(hostname)" | sudo tee -a /etc/hosts
sudo $PKG_UPDATE
mkdir -p /var/app
cd /var/app
sudo $PKG_INSTALL git
git clone -b dev https://github.com/khvilon/unkaos.git
cd /var/app/unkaos

# 2. Set your env variables
# Path to the .env file
ENV_FILE=".env_data"
NEW_ENV=".env"

# Create a temporary file to store the new values
touch $NEW_ENV

prev_line=""

superuser_password=$(generate_password)
sed -i "s/unkaossuperpass/$superuser_password/g" $ENV_FILE

# Read the .env file line by line
while IFS= read -r line
do
    # Check if the line contains a key-value pair
    if [[ $line == *=* ]]; then
        if [[ $prev_line == "#>>"* ]]; then
            key=$(echo $line | cut -d'=' -f1)
            value=$(echo $line | cut -d'=' -f2)
      
            # Prompt the user to change the value
            comment="${prev_line#*#>>}"
            echo "Description: $comment"
            echo "Current value for $key is: $value"
            read -p "Enter a new value or press ENTER to keep the current value: " new_value < /dev/tty

            # If the user entered a new value, use it; otherwise, use the original value
            if [[ -n $new_value ]]; then
                echo "$key=$new_value" >> $NEW_ENV
            else
                echo "$key=$value" >> $NEW_ENV
            fi
        else
            # If the line is not following the #>> comment pattern, preserve it in the temporary file
            echo "$line" >> $NEW_ENV
        fi
    fi
    prev_line="$line"
done < $ENV_FILE

echo "Updated .env file saved."

# 3. Make a copy of the server/db/public.sql with the changed schema
#while true; do
#    read -p "Enter your first workspace name: " schema_name < /dev/tty
#    validate_workspace_name "$schema_name"
#    if [[ $? -eq 0 ]]; then
#        break
#    else
#        echo "Wrong workspace name format."
#    fi
#done

schema_name = "server"

cp server/db/-public.sql server/db/0$schema_name.sql
sed -i "s/\bpublic\b/$schema_name/g" server/db/0$schema_name.sql

# migrations
for file in server/db/*_m.sql; do
    new_file="${file/_m/_m_$schema_name}"
    cp "$file" "$new_file"
    sed -i "s/\bpublic\b/$schema_name/g" "$new_file"
done

# 4. Setting up SSL with Certbot if the user has no certificate
read -p "Do you want to use Certbot for SSL setup? (yes by default, press ENTER) or type 'no' to skip: " use_certbot < /dev/tty
use_certbot=${use_certbot:-yes}  # Set default value
if [[ $use_certbot != "no" ]]; then
    # Install Certbot
    eval $CERT_INSTALL
    echo "try install cert 0"
    # Generate certificates
    source $NEW_ENV
    sudo certbot certonly --standalone -d $DOMAIN --register-unsafely-without-email --agree-tos --no-eff-email
    echo "try install cert 1"
    cp -rfL /etc/letsencrypt/live/$DOMAIN/* /var/app/unkaos/nginx/ssl
    # Create a Cron Job for auto-renewal of certificates
    (crontab -l ; echo "0 */12 * * * /usr/bin/certbot renew --quiet --post-hook \"docker-compose -f /var/app/unkaos/docker-compose.yml restart nginx\"") | crontab -
fi

# 5. Run docker containers
eval $DOCKER_INSTALL
sudo systemctl start docker
sudo systemctl enable docker

# Get cpu count for scaling nodes
CPU_CORES=$(nproc)

case $OS_ID in
    ubuntu|debian|raspbian)
        docker-compose up -d \
        --scale ossa=$CPU_CORES \
        --scale cerberus=$CPU_CORES \
        --scale zeus=$CPU_CORES \
        --scale gateway=$CPU_CORES \
        --scale hermes=$CPU_CORES
        ;;
    centos)
        docker compose up -d \
        --scale ossa=$CPU_CORES \
        --scale cerberus=$CPU_CORES \
        --scale zeus=$CPU_CORES \
        --scale gateway=$CPU_CORES \
        --scale hermes=$CPU_CORES
        ;;
    *)
        echo "Unsupported OS: $OS_ID"
        ;;
esac


# 6. Set up a Cron Job to run update.sh every 5 minutes
(crontab -l ; echo "*/5 * * * * /bin/bash /var/app/unkaos/update.sh") | crontab -

echo "Setup complete!"
