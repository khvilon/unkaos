#!/bin/bash

# Detect OS and set package manager commands
OS_ID=$(awk -F= '/^ID=/{print $2}' /etc/os-release)
OS_ID="${OS_ID//\"/}" # Remove quotes from the string

cd /var/app/unkaos

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Configuration
CHECK_INTERVAL=5000
ALLOWED_UPDATE_FROM="00:00"
ALLOWED_UPDATE_TO="23:59"
AUTO_UPDATE="true"
BRANCH=${1:-master}
META_FILE_BASE_URL="https://raw.githubusercontent.com/khvilon/unkaos"
META_FILE_URL="$META_FILE_BASE_URL/$BRANCH/meta.json"
YML_PATH="/var/docker-compose.yml"
MIGRATIONS_DIR="server/db/"

# Function to check if update time is allowed
is_time_allowed() {
  CURRENT_TIME=$(date +"%H:%M")
  if [[ "$CURRENT_TIME" > "$ALLOWED_UPDATE_FROM" && "$CURRENT_TIME" < "$ALLOWED_UPDATE_TO" ]]; then
    return 0
  else
    return 1
  fi
}

is_time_allowed
TIME_ALLOWED=$?

if [[ "$AUTO_UPDATE" != "true" || $TIME_ALLOWED -ne 0 ]]; then
  echo "Exiting due to AUTO_UPDATE being false or update time not allowed."
  exit 0
fi

# Function to compare versions
compare_versions() {
  local ver1="$1"
  local ver2="$2"
  local IFS=.
  local ver1_arr=($ver1)
  local ver2_arr=($ver2)

  local i
  for ((i = 0; i < ${#ver1_arr[@]}; i++)); do
    if [ ${ver1_arr[i]} -lt ${ver2_arr[i]} ]; then
      return 0
    elif [ ${ver1_arr[i]} -gt ${ver2_arr[i]} ]; then
      return 2
    fi
  done
  return 1
}

normalize_version() {
  local version="$1"
  local IFS=.
  local ver_arr=($version)
  printf "%02d.%03d.%05d\n" ${ver_arr[0]} ${ver_arr[1]} ${ver_arr[2]}
}

CURRENT_VERSION=$(grep -o '"version": "[^"]*' /var/app/unkaos/meta.json | grep -o '[0-9].*')

TIMESTAMP=$(date +%s)
wget --header="Cache-Control: no-cache" -O - "$META_FILE_URL?$TIMESTAMP" > temp_meta.json
NEW_VERSION=$(grep -o '"version": "[^"]*' temp_meta.json | grep -o '[0-9].*')
rm temp_meta.json

compare_versions "$CURRENT_VERSION" "$NEW_VERSION"
version_compare_current_result=$?

echo "Your current version: $CURRENT_VERSION"
echo "Last version available: $NEW_VERSION"

if [[ $version_compare_current_result -gt 0 ]]; then
  echo "Your version is up to date."
  exit 0
fi

echo "New version available! Updating..."

# Enable maintenance mode in Nginx
docker-compose exec nginx sh -c 'touch /etc/nginx/conf.d/maintenance.flag'  
docker-compose exec nginx nginx -s reload

# Switch to the correct branch before pulling updates
git stash
if [ "$BRANCH" == "dev" ]; then
  git checkout dev
else
  git checkout master
fi
git pull
git stash pop -q

# DB migration logic
WORKSPACES=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w -c "SELECT name FROM admin.workspaces" | tail -n +3 | grep -v '^(.*row)')

migration_files=$(find "$MIGRATIONS_DIR" -type f -name 'z[0-9]*_m.sql' | sort -V)

for file in $migration_files; do
  version=$(basename "$file" | awk -F'[z._]' '{printf "%d.%d.%d\n", $2, $3, $4}')

  compare_versions "$version" "$CURRENT_VERSION"
  version_compare_result=$?

  compare_versions "$version" "$NEW_VERSION"
  version_compare_new_result=$?

  if [ $version_compare_result -eq 2 ] && [ $version_compare_new_result -lt 2 ]; then
    echo "Found migration file: $file"
    
    cat "$file" | PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w
    
    for workspace in $WORKSPACES; do
      modified_sql=$(cat "$file" | sed "s/\bpublic\b/$workspace/g")
      echo "$modified_sql" | PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w
    done
  fi
done

CPU_CORES=$(nproc)
if [ "$CPU_CORES" -gt 1 ]; then
    CPU_CORES=$((CPU_CORES - 1))
else
    CPU_CORES=1
fi

CPU_CORES=1

docker-compose down ossa cerberus zeus gateway hermes eileithia athena postgres
docker-compose up -d  eileithia athena postgres

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

# Disable maintenance mode in Nginx
docker-compose exec nginx sh -c 'rm /etc/nginx/conf.d/maintenance.flag'
docker-compose exec nginx nginx -s reload

# Main Script Output
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO, $CHECK_INTERVAL"
echo "Current Version: $CURRENT_VERSION"
echo "Current Time: $CURRENT_TIME"
