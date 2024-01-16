#!/bin/bash

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

check_versions(){
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
    return 0
  fi

  echo "New version available! Updating..."
  return 1
}



