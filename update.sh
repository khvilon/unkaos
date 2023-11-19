#!/bin/bash

cd /var/app/unkaos

#load env variables
if [ -f .env ]; then
  source .env
fi

# Configuration
CHECK_INTERVAL=5000
ALLOWED_UPDATE_FROM="00:00"
ALLOWED_UPDATE_TO="23:59"
AUTO_UPDATE="true"
META_FILE_URL="https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json"
YML_PATH="/var/docker-compose.yml"
MIGRATIONS_DIR="server/db/"

#Check if autoupdate is on and the time is aloud for update========================================================================
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
#</>Check if autoupdate is on and the time is aloud for update=====================================================================


#Check if autoupdate needed or the version is up to date===========================================================================
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

if [[ $version_compare_current_result -gt 0 ]]; then
  echo "Your version is up to date."
  exit 0
fi
#</>Check if autoupdate needed or the version is up to date========================================================================

#perform update====================================================================================================================
echo "New version $NEW_VERSION available."

git stash
git pull
git stash pop -q
#Perform DB migration if needed for all workplaces-----------------------------------------------------

# Get a list of workspaces names
WORKSPACES=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w -c "SELECT name FROM admin.workspaces" | tail -n +3 | grep -v '^(.*row)')

# Get a list of migration files matching the pattern
migration_files=$(find "$MIGRATIONS_DIR" -type f -name 'z[0-9]*_m.sql' | sort -V)

# Iterate over migration files and filter by version
for file in $migration_files; do
  # Extract version from the filename
  version=$(basename "$file" | awk -F'[z._]' '{printf "%d.%d.%d\n", $2, $3, $4}')



  # Compare the version with current and new versions
  compare_versions "$version" "$CURRENT_VERSION"
  version_compare_result=$?

  compare_versions "$version" "$NEW_VERSION"
  version_compare_new_result=$?

  echo "try $file $version_compare_result $version_compare_new_result"
  if [ $version_compare_result -eq 2 ] && [ $version_compare_new_result -lt 2 ]; then
    echo "Found migration file: $file"
    
    # Execute the content of $file
    echo "Executing migration file: $file"
    cat "$file" | PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w
    
    # Execute for each workspace with 'public' replaced by workspace name
    for workspace in $WORKSPACES; do
      echo "Executing migration for workspace $workspace"

      # Replace 'public' in the SQL content with the workspace name to get modified_sql
      modified_sql=$(cat "$file" | sed "s/\bpublic\b/$workspace/g")
      
      # Execute the modified SQL for the workspace
      echo "$modified_sql" | PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DOMAIN" -p "$DB_PORT" -d "$DB_DATABASE" -w
    done
  fi
done
#</>Perform DB migration if needed for all warkplaces--------------------------------------------------
docker-compose down
docker-compose up -d --build
#</>perform update=================================================================================================================

# Main Script
echo "Autoupdate conf: $AUTO_UPDATE, $ALLOWED_UPDATE_FROM-$ALLOWED_UPDATE_TO, $CHECK_INTERVAL"

echo "Current Version: $CURRENT_VERSION"
echo "Current Time: $CURRENT_TIME"
