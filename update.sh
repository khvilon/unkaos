#!/bin/bash

# Configuration
CHECK_INTERVAL=5000
ALLOWED_UPDATE_FROM="00:00"
ALLOWED_UPDATE_TO="23:59"
AUTO_UPDATE=true
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

if [[ "$AUTO_UPDATE" != true || ! is_time_allowed ]]; then
  echo "Exiting due to AUTO_UPDATE being false or update time not allowed."
  exit 0
fi

CURRENT_VERSION=$(grep -o '"version": "[^"]*' /var/app/unkaos/meta.json | grep -o '[0-9].*')


NEW_VERSION=$(curl -s $META_FILE_URL | grep -o '"version": "[^"]*' | grep -o '[0-9].*')
if [[ "$NEW_VERSION" != "$CURRENT_VERSION" ]]; then
  echo "New version $NEW_VERSION available."
else
  echo "Your version is up to date."
fi


# Main Script
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO, $CHECK_INTERVAL"


echo $CURRENT_VERSION
echo $CURRENT_TIME


