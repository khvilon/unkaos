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

# Create a temporary file to store the new values
touch $TEMP_FILE

# Read the .env file line by line
while IFS= read -r line
do
    # Check if the line contains a key-value pair
    if [[ $line == *=* ]]; then
        key=$(echo $line | cut -d'=' -f1)
        value=$(echo $line | cut -d'=' -f2)

        # Prompt the user to change the value or skip
        echo "Current value for $key is: $value"
        read -p "Enter a new value or press ENTER to keep the current value: " new_value < /dev/tty

        # If the user entered a new value, use it; otherwise, use the original value
        if [[ -z $new_value ]]; then
            echo "$key=$value" >> $TEMP_FILE
        else
            echo "$key=$new_value" >> $TEMP_FILE
        fi
    else
        # If the line doesn't contain a key-value pair, just copy it to the temporary file
        echo "$line" >> $TEMP_FILE
    fi
done < $ENV_FILE

# Replace the original .env file with the updated values
mv $TEMP_FILE $ENV_FILE

echo "Updated .env file saved."

# 3. Make a copy of the server/db/public.sql with the changed schema
read -p "Enter your first workspace name: " schema_name < /dev/tty
cp server/db/public.sql server/db/0_$schema_name.sql
sed -i "s/\bpublic\b/$schema_name/g" server/db/0_$schema_name.sql
sed -i "s/\btest\b/$schema_name/g" server/db/workspace.sql
random_password=$(generate_password)
sed -i "s/mypass/$random_password/g" server/db/workspace.sql

# 4. Setting up SSL with Certbot if user have no sertificate
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

# 5. Run docker conainers
apt install docker-compose -y
docker-compose up -d


echo "Setup complete!"