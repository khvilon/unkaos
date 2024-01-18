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
BRANCH=${1:-master}
META_FILE_BASE_URL="https://raw.githubusercontent.com/khvilon/unkaos"
META_FILE_URL="$META_FILE_BASE_URL/$BRANCH/meta.json"
YML_PATH="/var/docker-compose.yml"
MIGRATIONS_DIR="server/db/"

# Fetch configurations
CONFIGS=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w -c "SELECT name, value FROM server.configs WHERE service = 'autoupdate'" | grep -E 'from|allow|to')

# Process and assign values to variables
while IFS='|' read -r name value; do
    # Trim whitespace from name and value
    name=$(echo "$name" | xargs)
    value=$(echo "$value" | xargs)

    case $name in
        "from")
            ALLOWED_UPDATE_FROM="$value"
            ;;
        "to")
            ALLOWED_UPDATE_TO="$value"
            ;;
        "allow")
            AUTO_UPDATE="$value"
            ;;
    esac
done <<< "$CONFIGS"

# Echo variables for verification
echo "ALLOWED_UPDATE_FROM: $ALLOWED_UPDATE_FROM"
echo "ALLOWED_UPDATE_TO: $ALLOWED_UPDATE_TO"
echo "AUTO_UPDATE: $AUTO_UPDATE"



# Function to check if update time is allowed
is_time_allowed() {
  # Get the current hour
  CURRENT_HOUR=$(date +"%H")

  # Convert the current hour to an integer
  CURRENT_HOUR=$(printf "%d" "$CURRENT_HOUR")

  # Check if update is allowed based on the time range
  if [[ "$ALLOWED_UPDATE_FROM" -le "$ALLOWED_UPDATE_TO" ]]; then
    # Time range does not span midnight
    if [[ "$CURRENT_HOUR" -ge "$ALLOWED_UPDATE_FROM" && "$CURRENT_HOUR" -lt "$ALLOWED_UPDATE_TO" ]]; then
      return 0
    fi
  else
    # Time range spans midnight
    if [[ "$CURRENT_HOUR" -ge "$ALLOWED_UPDATE_FROM" || "$CURRENT_HOUR" -lt "$ALLOWED_UPDATE_TO" ]]; then
      return 0
    fi
  fi

  return 1
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
curl -H "Cache-Control: no-cache" "$META_FILE_URL?$TIMESTAMP" -o temp_meta.json
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

docker image prune -f

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

docker-compose down ossa cerberus zeus gateway hermes eileithyia athena postgres
docker-compose up -d  eileithyia athena postgres

case $OS_ID in
    ubuntu|debian|raspbian)
        docker-compose up --build -d \
        --scale ossa=$CPU_CORES \
        --scale cerberus=$CPU_CORES \
        --scale zeus=$CPU_CORES \
        --scale gateway=$CPU_CORES \
        --scale hermes=$CPU_CORES
        ;;
    centos)
        docker compose up -d --build \
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
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO"
echo "Your old version: $CURRENT_VERSION"
echo "Your new version: $NEW_VERSION"
echo "Current Time: $CURRENT_TIME"
