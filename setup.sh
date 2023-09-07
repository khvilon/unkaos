#!/bin/bash

# Function to generate a random 8-letter password
generate_password() {
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 8 | head -n 1
}

# 1. clone the repo
echo "127.0.0.1 $(hostname)" | sudo tee -a /etc/hosts
sudo apt update
mkdir /var/app
cd /var/app
sudo apt install git -y
git clone -b dev https://github.com/khvilon/unkaos.git
cd /var/app/unkaos

# 2. set your env variables
# Path to the .env file
ENV_FILE=".env"
TEMP_FILE=".env.tmp"
ENV_TO_CHANGE="env_to_change"  # Specify the file containing variables to change

# Create a temporary file to store the new values
touch $TEMP_FILE

# Read the env_to_change file line by line
while IFS= read -r line
do
    # Check if the line contains a variable name and comment
    if [[ $line =~ ^[^#]*# ]]; then
        # Extract the variable name from the comment
        var_name=$(echo "$line" | grep -oP '^\w+(?=#)')
        
        # Extract the comment to provide context
        comment=$(echo "$line" | grep -oP '(?<=# ).*')
        
        # Get the current value from .env
        current_value=$(grep -oP "(?<=^$var_name=).*" $ENV_FILE)
        
        # Check if it's the DB_PASSWORD variable
        if [[ "$var_name" == "DB_PASSWORD" ]]; then
            # Prompt the user to change the value or generate a random password
            echo "Current value for $var_name ($comment) is: $current_value"
            read -p "Enter a new value or press ENTER to generate a random password: " new_value < /dev/tty
            
            if [[ -z $new_value ]]; then
                new_value=$(generate_password)
                echo "Generated random password: $new_value"
            fi
        else
            # Prompt the user to change the value or skip
            echo "Current value for $var_name ($comment) is: $current_value"
            read -p "Enter a new value or press ENTER to keep the current value: " new_value < /dev/tty
        fi

        # If the user entered a new value, use it; otherwise, use the original value
        if [[ -z $new_value ]]; then
            echo "$var_name=$current_value" >> $TEMP_FILE
        else
            echo "$var_name=$new_value" >> $TEMP_FILE
        fi
    else
        # If the line doesn't contain a variable name and comment, just copy it to the temporary file
        echo "$line" >> $TEMP_FILE
    fi
done < $ENV_TO_CHANGE

# Append variables from the original .env file that should not be changed
while IFS= read -r line
do
    # Check if the line contains a variable name and value
    if [[ $line == *=* ]]; then
        # Extract the variable name from the line
        var_name=$(echo "$line" | cut -d'=' -f1)
        
        # Check if this variable is not in the env_to_change file
        if ! grep -q "^$var_name=" $ENV_TO_CHANGE; then
            # If not in env_to_change, copy it to the temporary file
            echo "$line" >> $TEMP_FILE
        fi
    else
        # If the line doesn't contain a variable name and value, just copy it to the temporary file
        echo "$line" >> $TEMP_FILE
    fi
done < $ENV_FILE

# Replace the original .env file with the updated values
mv $TEMP_FILE $ENV_FILE

echo "Updated .env file saved."

# 3. Make a copy of the server/db/public.sql with the changed schema
read -p "Enter your first workspace name: " schema_name < /dev/tty
cp server/db/_public.sql server/db/__$schema_name.sql
sed -i "s/\b_public\b/$schema_name/g" server/db/__$schema_name.sql
sed -i "s/\btest\b/$schema_name/g" server/db/_workspace.sql
random_password=$(generate_password)
sed -i "s/mypass/$random_password/g" server/db/_workspace.sql

# 4. Setting up SSL with Certbot if user has no certificate
read -p "Do you want to use Certbot for SSL setup? (yes by default, press ENTER) or type 'no' to skip: " use_certbot < /dev/tty
use_certbot=${use_certbot:-yes}  # Set default value
if [[ $use_certbot != "no" ]]; then
    # Install Certbot
    sudo apt install certbot -y

    echo "try install cert 0"

    # Generate certificates
    source $ENV_FILE
    sudo certbot certonly --standalone -d $DOMAIN --register-unsafely-without-email --agree-tos --no-eff-email

    echo "try install cert 1"

    cp -rfL /etc/letsencrypt/live/$DOMAIN/* /var/app/unkaos/nginx/ssl

    # Create a Cron Job for auto renewal of certificates
    (crontab -l ; echo "0 */12 * * * /usr/bin/certbot renew --quiet --post-hook \"docker-compose -f /var/app/unkaos/docker-compose.yml restart nginx\"") | crontab -
fi

# 5. Run docker containers
apt install docker-compose -y
docker-compose up -d

# apt install postgresql-client-common
sudo apt-get install postgresql-client

echo "Setup complete!"