#!/bin/bash

# Function to generate a random 8-letter password
generate_password() {
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 8 | head -n 1
}

# Function to validate the workspace name
validate_workspace_name() {
    local name=$1
    if [[ -z $name ]]; then
        echo "Workspace name cannot be empty."
        return 1
    elif [[ $name =~ [^a-zA-Z0-9_] ]]; then
        echo "Workspace name can only contain letters, numbers, and underscores."
        return 1
    elif [[ ${#name} -ge 64 ]]; then
        echo "Workspace name should be shorter than 64 characters."
        return 1
    elif [[ ! $name =~ ^[a-zA-Z_] ]]; then
        echo "Workspace name should start with a letter or an underscore."
        return 1
    fi
    return 0
}