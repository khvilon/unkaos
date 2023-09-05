#!/bin/bash

# Configuration
CHECK_INTERVAL=5000
ALLOWED_UPDATE_FROM="00:00"
ALLOWED_UPDATE_TO="23:59"
AUTO_UPDATE=true
META_FILE_URL="https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json"
YML_PATH="/var/docker-compose.yml"

# Utility Functions
read_current_version() {
  CURRENT_VERSION=$(jq -r '.version' /var/meta.json)
}

is_time_allowed() {
  CURRENT_TIME=$(date +"%H:%M")
  if [[ "$CURRENT_TIME" > "$ALLOWED_UPDATE_FROM" && "$CURRENT_TIME" < "$ALLOWED_UPDATE_TO" ]]; then
    return 0
  else
    return 1
  fi
}


# Main Script
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO, $CHECK_INTERVAL"

read_current_version

echo $CURRENT_VERSION


