#!/bin/bash

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
        read -p "$key [$value]: " new_value < /dev/tty

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



# 2. Make a copy of the server/db/public.sql with the changed schema
cp server/db/public.sql server/db/test.sql
sed -i 's/\bpublic\b/test/g' server/db/test.sql

# 3. Run docker-compose up -d
apt install docker-compose
docker-compose up -d
