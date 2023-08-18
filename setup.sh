#!/bin/bash

echo "Starting setup script..."

# 1. Prompt user to set each variable in .env (or skip)
while read -r line || [[ -n "$line" ]]; do
    echo "Reading line: $line"
    if [[ $line != \#* && $line = *'='* ]]; then
        var_name="${line%=*}"
        current_value="${line#*=}"
        echo "Prompting for $var_name..."
        read -p "Set value for $var_name (current: $current_value) or press enter to skip: " new_value
        if [ ! -z "$new_value" ]; then
            sed -i "s|^$var_name=.*$|$var_name=$new_value|" /var/app/unkaos/.env
        fi
    fi
done < /var/app/unkaos/.env




# 2. Make a copy of the server/db/public.sql with the changed schema
cp server/db/public.sql server/db/test.sql
sed -i 's/\bpublic\b/test/g' server/db/test.sql

# 3. Run docker-compose up -d
apt install docker-compose
docker-compose up -d
