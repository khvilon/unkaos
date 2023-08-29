#!/bin/bash

# Source environment variables from the .env file
source /var/app/unkaos/.env

sudo apt install certbot -y

# Generate a certificate with DNS challenge (you'll have to include your DNS provider's plugin)
echo "Please follow the instructions to complete the DNS challenge."
sudo certbot certonly --manual -d $DOMAIN -d *.$DOMAIN --agree-tos --no-eff-email --manual-public-ip-logging-ok

# Wait for user to confirm DNS challenge completion
read -p "Press ENTER after you've added the DNS TXT record and it has propagated." < /dev/tty

# Copy the certificate to the Nginx folder
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    cp -rfL /etc/letsencrypt/live/$DOMAIN/* /var/app/unkaos/nginx/ssl
else
    echo "Certificate for $DOMAIN not found."
    exit 1
fi

# Setup auto-renewal
(crontab -l ; echo "0 */12 * * * /usr/bin/certbot renew --quiet --post-hook \"docker-compose -f /var/app/unkaos/docker-compose.yml restart nginx\"") | crontab -

echo "SSL setup complete."
