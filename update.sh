#!/bin/bash

# Configuration
CHECK_INTERVAL=5000
ALLOWED_UPDATE_FROM="00:00"
ALLOWED_UPDATE_TO="23:59"
AUTO_UPDATE="true"
META_FILE_URL="https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json"
YML_PATH="/var/docker-compose.yml"

is_time_allowed() {
  CURRENT_TIME=$(date +"%H:%M")
  if [[ "$CURRENT_TIME" > "$ALLOWED_UPDATE_FROM" && "$CURRENT_TIME" < "$ALLOWED_UPDATE_TO" ]]; then
    return 0
  else
    return 1
  fi
}

# Check if time is allowed
is_time_allowed
TIME_ALLOWED=$?

if [[ "$AUTO_UPDATE" != "true" || $TIME_ALLOWED -ne 0 ]]; then
  echo "Exiting due to AUTO_UPDATE being false or update time not allowed."
  exit 0
fi

CURRENT_VERSION=$(grep -o '"version": "[^"]*' /var/app/unkaos/meta.json | grep -o '[0-9].*')

TIMESTAMP=$(date +%s)
wget --header="Cache-Control: no-cache" -O - "$META_FILE_URL?$TIMESTAMP" > temp_meta.json
NEW_VERSION=$(grep -o '"version": "[^"]*' temp_meta.json | grep -o '[0-9].*')
rm temp_meta.json

if [[ "$NEW_VERSION" == "$CURRENT_VERSION" ]]; then
  echo "Your version is up to date."
  exit 0
fi

echo "New version $NEW_VERSION available."

docker-compose down
git pull
docker-compose up -d

# Main Script
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO, $CHECK_INTERVAL"

echo "Current Version: $CURRENT_VERSION"
echo "Current Time: $CURRENT_TIME"
