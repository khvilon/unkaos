#!/bin/bash
set -euo pipefail

# Renew LetsEncrypt cert and ensure nginx serves FULLCHAIN (leaf + intermediate)
# This fixes Node/OpenSSL clients failing with:
#   UNABLE_TO_VERIFY_LEAF_SIGNATURE / unable to verify the first certificate
#
# Expected layout (as in docker-compose.yml volumes):
#   <repo>/nginx/ssl  -> /etc/nginx/ssl (inside nginx container)
# Nginx config uses:
#   ssl_certificate     /etc/nginx/ssl/cert.pem;
#   ssl_certificate_key /etc/nginx/ssl/privkey.pem;
# So we copy fullchain.pem -> cert.pem.

if [ "${EUID:-0}" -ne 0 ]; then
  echo "Please run as root (certbot + /etc/letsencrypt access required)" >&2
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$APP_DIR/.env"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE (needed for DOMAIN)" >&2
  exit 1
fi
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing $COMPOSE_FILE" >&2
  exit 1
fi

# Load DOMAIN from .env
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "DOMAIN is empty in $ENV_FILE" >&2
  exit 1
fi

LE_DIR="/etc/letsencrypt/live/$DOMAIN"
SSL_DIR="$APP_DIR/nginx/ssl"

if [ ! -d "$LE_DIR" ]; then
  echo "LetsEncrypt directory not found: $LE_DIR" >&2
  exit 1
fi

# Copy fullchain/privkey into repo-mounted nginx/ssl.
# NOTE: certbot hooks run ONLY when a renewal is attempted; but we also need
# to fix the existing installation even if the cert is not due for renewal yet.
sync_ssl_files() {
  mkdir -p "$SSL_DIR"

  local tmp_cert tmp_key changed=0
  tmp_cert="$(mktemp)"
  tmp_key="$(mktemp)"

  cp -fL "$LE_DIR/fullchain.pem" "$tmp_cert"
  cp -fL "$LE_DIR/privkey.pem" "$tmp_key"

  if [ ! -f "$SSL_DIR/cert.pem" ] || ! cmp -s "$tmp_cert" "$SSL_DIR/cert.pem"; then
    cp -f "$tmp_cert" "$SSL_DIR/cert.pem"
    changed=1
  fi
  if [ ! -f "$SSL_DIR/privkey.pem" ] || ! cmp -s "$tmp_key" "$SSL_DIR/privkey.pem"; then
    cp -f "$tmp_key" "$SSL_DIR/privkey.pem"
    changed=1
  fi

  rm -f "$tmp_cert" "$tmp_key"

  chmod 600 "$SSL_DIR/privkey.pem" || true
  chmod 644 "$SSL_DIR/cert.pem" || true

  # Sanity: cert.pem must contain at least 2 cert blocks (leaf + intermediate)
  local blocks
  blocks="$(grep -c "BEGIN CERTIFICATE" "$SSL_DIR/cert.pem" 2>/dev/null || true)"
  echo "[renew-cert] cert.pem cert-blocks=$blocks (expected >= 2)"

  return $changed
}

# Detect compose command (docker-compose legacy vs docker compose plugin)
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  echo "docker compose not found (need docker-compose or docker compose plugin)" >&2
  exit 1
fi

mkdir -p "$SSL_DIR"

# Ensure fullchain is in place even if certbot does not renew.
echo "[renew-cert] Syncing fullchain -> nginx/ssl/cert.pem"
if sync_ssl_files; then
  echo "[renew-cert] SSL files updated; restarting nginx"
  $COMPOSE -f "$COMPOSE_FILE" restart nginx
else
  echo "[renew-cert] SSL files already up to date"
fi

# Certbot standalone http-01 needs port 80 -> stop nginx ONLY if a renewal is attempted.
# Hooks run only when renewal is actually due/attempted.
PRE_HOOK="$COMPOSE -f $COMPOSE_FILE stop nginx"
DEPLOY_HOOK="cp -fL $LE_DIR/fullchain.pem $SSL_DIR/cert.pem && cp -fL $LE_DIR/privkey.pem $SSL_DIR/privkey.pem && chmod 600 $SSL_DIR/privkey.pem || true"
POST_HOOK="$COMPOSE -f $COMPOSE_FILE start nginx && $COMPOSE -f $COMPOSE_FILE restart nginx"

echo "[renew-cert] Running certbot renew for DOMAIN=$DOMAIN"
certbot renew --quiet --pre-hook "$PRE_HOOK" --deploy-hook "$DEPLOY_HOOK" --post-hook "$POST_HOOK"

echo "[renew-cert] Syncing fullchain after certbot (safety)"
sync_ssl_files || true

echo "[renew-cert] Done"


