#!/bin/bash

set -e
set -o pipefail

# WardenClyffe Enterprise — Getting Started
# Single-node bootstrap for a self-hosted WardenClyffe Enterprise stack with the
# embedded identity provider. Owner is created via first-login flow.

SED_STRIP_PADDING='s/=//g'

WARDENCLYFFE_EULA_URL="https://wardenclyffe.appself-hosted-EULA"

# Static IP for Traefik inside the compose bridge network. The management
# server trusts X-Forwarded-* headers from this address only.
TRAEFIK_IP="172.30.0.10"

LICENSE_VERDICT="unknown"
LICENSE_LOG_LINES=""

check_docker_compose() {
  if ! command -v docker &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "Docker is not installed or not in PATH. Please follow the steps from the official guide: https://docs.docker.com/engine/install/" > /dev/stderr
    exit 1
  fi

  if docker compose version &> /dev/null; then
    echo "docker compose"
    return
  fi
  if command -v docker-compose &> /dev/null && docker-compose version &> /dev/null; then
    echo "docker-compose"
    return
  fi

  echo "Docker Compose is not installed or not in PATH. Please follow the steps from the official guide: https://docs.docker.com/compose/install/" > /dev/stderr
  exit 1
}

check_openssl() {
  if ! command -v openssl &> /dev/null; then
    echo "openssl is not installed or not in PATH." > /dev/stderr
    exit 1
  fi
}

rand_secret() {
  openssl rand -base64 32 | sed "$SED_STRIP_PADDING"
}

rand_b64_key() {
  openssl rand -base64 32
}

check_nb_domain() {
  local domain="$1"
  if [[ -z "$domain" ]]; then
    echo "The domain cannot be empty." > /dev/stderr
    return 1
  fi
  if [[ "$domain" == "wardenclyffe.example.com" ]]; then
    echo "The domain cannot be wardenclyffe.example.com" > /dev/stderr
    return 1
  fi
  if [[ "$domain" =~ ^[0-9.]+$ ]]; then
    echo "An IP address is not allowed. A real DNS-resolvable domain is required for TLS and the embedded IdP issuer." > /dev/stderr
    return 1
  fi
  if [[ ! "$domain" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$ ]]; then
    echo "The value '$domain' is not a valid FQDN. A real DNS-resolvable domain is required for TLS and the embedded IdP issuer." > /dev/stderr
    return 1
  fi
  return 0
}

check_domain_resolves() {
  local domain="$1"
  if command -v getent &> /dev/null && getent hosts "$domain" &> /dev/null; then return 0; fi
  if command -v host &> /dev/null && host "$domain" &> /dev/null; then return 0; fi
  if command -v dig &> /dev/null && [[ -n "$(dig +short "$domain" 2>/dev/null)" ]]; then return 0; fi
  if command -v nslookup &> /dev/null && nslookup "$domain" &> /dev/null; then return 0; fi
  return 1
}

read_nb_domain() {
  local value=""
  echo -n "Enter the FQDN for WardenClyffe (must resolve via DNS, e.g. wardenclyffe.my-domain.com): " > /dev/stderr
  read -r value < /dev/tty
  if ! check_nb_domain "$value"; then
    read_nb_domain
    return
  fi
  if ! check_domain_resolves "$value"; then
    echo "" > /dev/stderr
    echo "Warning: '$value' does not resolve via DNS from this host." > /dev/stderr
    echo "Traefik will not be able to issue TLS certificates until it does." > /dev/stderr
    local confirm=""
    echo -n "Continue anyway? [y/N]: " > /dev/stderr
    read -r confirm < /dev/tty
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      read_nb_domain
      return
    fi
  fi
  echo "$value"
}

read_letsencrypt_email() {
  if [[ -n "${WARDENCLYFFE_LETSENCRYPT_EMAIL:-}" ]]; then
    echo "$WARDENCLYFFE_LETSENCRYPT_EMAIL"
    return
  fi
  local value=""
  echo "Enter your email for Let's Encrypt certificate notifications." > /dev/stderr
  echo -n "Email address: " > /dev/stderr
  read -r value < /dev/tty
  if [[ -z "$value" ]]; then
    echo "Email is required for Let's Encrypt." > /dev/stderr
    read_letsencrypt_email
    return
  fi
  echo "$value"
}

read_required() {
  local prompt="$1"
  local value=""
  while [[ -z "$value" ]]; do
    echo -n "$prompt: " > /dev/stderr
    read -r value < /dev/tty
    if [[ -z "$value" ]]; then
      echo "Value cannot be empty." > /dev/stderr
    fi
  done
  echo "$value"
}

read_secret() {
  local prompt="$1"
  local value=""
  while [[ -z "$value" ]]; do
    echo -n "$prompt: " > /dev/stderr
    read -rs value < /dev/tty
    echo "" > /dev/stderr
    if [[ -z "$value" ]]; then
      echo "Value cannot be empty." > /dev/stderr
    fi
  done
  echo "$value"
}

# read_yes_no "<prompt>" [<default y|n>]
read_yes_no() {
  local prompt="$1"
  local default="${2:-n}"
  local hint
  if [[ "$default" == "y" ]]; then
    hint="[Y/n]"
  else
    hint="[y/N]"
  fi
  echo -n "${prompt} ${hint}: " > /dev/stderr
  local ans=""
  read -r ans < /dev/tty
  if [[ -z "$ans" ]]; then
    ans="$default"
  fi
  case "$ans" in
    [Yy] | [Yy][Ee][Ss]) echo "yes" ;;
    *) echo "no" ;;
  esac
}

# Gate the install on explicit acceptance of the WardenClyffe On-Premise EULA.
require_eula_acceptance() {
  cat > /dev/stderr <<EOF

  ──────────────────────────────────────────────────────────────────────
   WardenClyffe On-Premise End User License Agreement
  ──────────────────────────────────────────────────────────────────────
  WardenClyffe's on-premise software is commercial software, licensed and not
  sold. Your installation, deployment and use are governed by the WardenClyffe
  On-Premise End User License Agreement (the "EULA"). Please read the EULA
  in full before continuing:

      ${WARDENCLYFFE_EULA_URL}

  By typing "accept" and continuing the installation, you confirm that you
  have read and agree to the EULA, that you are authorized to accept it on
  behalf of your organization (the "Customer"), and that the Software is
  used for business purposes only.
  ──────────────────────────────────────────────────────────────────────
EOF

  if [[ "${NB_ACCEPT_EULA:-}" == "yes" ]]; then
    echo "EULA accepted via NB_ACCEPT_EULA=yes." > /dev/stderr
    return 0
  fi

  local ans=""
  echo -n 'Type "accept" to agree, or anything else to abort: ' > /dev/stderr
  read -r ans < /dev/tty
  if [[ "$ans" != "accept" ]]; then
    echo "" > /dev/stderr
    echo "EULA not accepted. Aborting installation." > /dev/stderr
    exit 1
  fi
  echo "" > /dev/stderr
}

wait_postgres() {
  set +e
  echo -n "Waiting for postgres to become ready"
  local counter=1
  while true; do
    if $DOCKER_COMPOSE_COMMAND exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
      break
    fi
    if [[ $counter -eq 60 ]]; then
      echo ""
      echo "Postgres is taking too long. Recent logs:"
      $DOCKER_COMPOSE_COMMAND logs --tail=20 postgres
      exit 1
    fi
    echo -n " ."
    sleep 2
    counter=$((counter + 1))
  done
  echo " done"
  set -e
}

wait_for_license_verdict() {
  local counter=0
  local logs=""

  echo -n "Waiting for the server to validate the license"
  while [[ $counter -lt 60 ]]; do
    logs=$($DOCKER_COMPOSE_COMMAND logs --no-color --tail=all wardenclyffe-server 2>/dev/null || true)

    if grep -qi "license invalidated" <<< "$logs"; then
      echo " rejected"
      LICENSE_VERDICT="rejected"
      LICENSE_LOG_LINES=$(grep -i "license" <<< "$logs" | tail -n 5 || true)
      return 0
    fi

    if grep -qi "license validated" <<< "$logs"; then
      echo " ok"
      LICENSE_VERDICT="ok"
      return 0
    fi

    echo -n " ."
    sleep 2
    counter=$((counter + 1))
  done

  echo " no verdict in 120s"
  LICENSE_VERDICT="unknown"
  LICENSE_LOG_LINES=$(grep -iE "failed to validate license|error validating license" <<< "$logs" | tail -n 3 || true)
  return 0
}

report_license_verdict() {
  if [[ "$LICENSE_VERDICT" == "ok" ]]; then
    return 0
  fi

  if [[ "$LICENSE_VERDICT" == "unknown" ]]; then
    echo ""
    echo "  ⚠  The server logged no license verdict within 120s."
    if [[ -n "$LICENSE_LOG_LINES" ]]; then
      echo "     It was still reporting validation errors:"
      while IFS= read -r line; do
        [[ -n "$line" ]] && echo "     $line"
      done <<< "$LICENSE_LOG_LINES"
    fi
    echo ""
    echo "     Check the verdict with:"
    echo ""
    echo "       $DOCKER_COMPOSE_COMMAND logs wardenclyffe-server | grep -i license"
    return 0
  fi

  local unreachable="false"
  if grep -qi "couldn't be validated with the license server" <<< "$LICENSE_LOG_LINES"; then
    unreachable="true"
  fi

  echo ""
  if [[ "$unreachable" == "true" ]]; then
    echo "  ⚠  The server could not validate the license:"
  else
    echo "  ⚠  The server rejected the license key:"
  fi
  while IFS= read -r line; do
    [[ -n "$line" ]] && echo "     $line"
  done <<< "$LICENSE_LOG_LINES"
  echo ""
  echo "     The stack is up, and only the license check did not pass."
  echo ""
  if [[ "$unreachable" == "true" ]]; then
    echo "     The license server could not be reached, so the key itself was"
    echo "     never checked. Confirm this host has outbound access to the"
    echo "     license server, then restart:"
  else
    echo "     Check the reason the server gave above, verify that"
    echo "     WARDENCLYFFE_LICENSE_KEY in .env matches the key you were issued,"
    echo "     then restart:"
  fi
  echo ""
  echo "       $DOCKER_COMPOSE_COMMAND up -d"
  return 0
}

init_environment() {
  check_openssl
  DOCKER_COMPOSE_COMMAND=$(check_docker_compose)

  if [[ -f .env ]] || [[ -f docker-compose.yml ]] || [[ -f config.yaml ]]; then
    echo "Generated files already exist in $(pwd)."
    echo "If you want to reinitialize the environment, please remove them first:"
    echo "  $DOCKER_COMPOSE_COMMAND down --volumes # removes all containers and volumes"
    echo "  rm -f .env docker-compose.yml config.yaml"
    echo "Be aware this will remove all data from the database."
    exit 1
  fi

  require_eula_acceptance
  WARDENCLYFFE_EULA_ACCEPTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  echo "WardenClyffe Enterprise bootstrap"
  echo ""
  echo "Traffic flow:"
  echo "  Enables traffic events logging on the management server."
  echo "  When enabled, the WardenClyffe stack also runs NATS along with two"
  echo "  additional containers: wardenclyffe-receiver (the traffic log receiver"
  echo "  service) and wardenclyffe-enricher (the traffic log enricher service)."
  echo "  It still has to be turned on from the dashboard settings afterwards."
  echo "  See https://docs.wardenclyffe.app/manage/activity/traffic-events-logging"
  WARDENCLYFFE_TRAFFIC_FLOW=$(read_yes_no "Enable traffic flow" "n")

  echo ""
  WARDENCLYFFE_DOMAIN=$(read_nb_domain)

  echo ""
  WARDENCLYFFE_LETSENCRYPT_EMAIL=$(read_letsencrypt_email)

  echo ""

  WARDENCLYFFE_LICENSE_KEY=$(read_secret "Enter license key (input hidden)")

  POSTGRES_USER="wardenclyffe"
  POSTGRES_DB="wardenclyffe"
  POSTGRES_PASSWORD=$(rand_secret)
  WARDENCLYFFE_ENCRYPTION_KEY=$(rand_b64_key)
  WARDENCLYFFE_SESSION_COOKIE_ENCRYPTION_KEY=$(rand_b64_key)
  WARDENCLYFFE_RELAY_AUTH_SECRET=$(rand_secret)

  POSTGRES_DSN="host=postgres user=${POSTGRES_USER} password=${POSTGRES_PASSWORD} dbname=${POSTGRES_DB} port=5432 sslmode=disable TimeZone=UTC"
  WARDENCLYFFE_RELAY_ENDPOINT="rels://${WARDENCLYFFE_DOMAIN}:443"

  echo ""
  echo "Selected:"
  echo "  Traffic flow: ${WARDENCLYFFE_TRAFFIC_FLOW}"
  echo "  Domain:       ${WARDENCLYFFE_DOMAIN}"
  echo "  ACME email:   ${WARDENCLYFFE_LETSENCRYPT_EMAIL}"
  echo ""
  echo "Rendering files into $(pwd) ..."
  install -m 600 /dev/null .env
  render_env >> .env
  render_docker_compose > docker-compose.yml

  if [[ -z "${WARDENCLYFFE_LICENSE_SERVER_BASE_URL:-}" ]]; then
    sed -i.bak '/WARDENCLYFFE_LICENSE_SERVER_BASE_URL/d' docker-compose.yml && rm -f docker-compose.yml.bak
  fi
  install -m 600 /dev/null config.yaml
  render_config_yaml >> config.yaml

  echo ""
  echo "Pulling images ..."
  $DOCKER_COMPOSE_COMMAND pull

  echo ""
  echo "Starting postgres ..."
  $DOCKER_COMPOSE_COMMAND up -d postgres
  sleep 2
  wait_postgres

  echo ""
  echo "Starting remaining services ..."
  $DOCKER_COMPOSE_COMMAND up -d

  echo ""
  wait_for_license_verdict

  echo ""
  echo "Done."
  echo ""
  echo "Dashboard: https://${WARDENCLYFFE_DOMAIN}"
  echo ""
  echo "Open the dashboard in a browser to complete the first-login owner setup."
  echo "All configuration and secrets are stored (mode 600) in $(pwd)/.env"
  echo ""
  echo "Tail logs:"
  echo "  cd $(pwd) && $DOCKER_COMPOSE_COMMAND logs -f wardenclyffe-server traefik"

  report_license_verdict

  if [[ "$LICENSE_VERDICT" == "rejected" ]]; then
    exit 1
  fi
}

# ------------------------------------------------------------------
# Renderers
# ------------------------------------------------------------------

render_env() {
  cat <<EOF
# Generated by getting-started-enterprise.sh
# Holds all configuration and secrets for the stack. Mode 600.

# WardenClyffe On-Premise EULA acceptance
WARDENCLYFFE_EULA_ACCEPTED=yes
WARDENCLYFFE_EULA_ACCEPTED_AT=${WARDENCLYFFE_EULA_ACCEPTED_AT}
WARDENCLYFFE_EULA_URL=${WARDENCLYFFE_EULA_URL}

# Features (set by the script; don't edit without re-running)
WARDENCLYFFE_TRAFFIC_FLOW_ENABLED=${WARDENCLYFFE_TRAFFIC_FLOW}

# Domain
WARDENCLYFFE_DOMAIN=${WARDENCLYFFE_DOMAIN}

# Reverse proxy (Traefik)
WARDENCLYFFE_LETSENCRYPT_EMAIL=${WARDENCLYFFE_LETSENCRYPT_EMAIL}
WARDENCLYFFE_TRAEFIK_TAG=${WARDENCLYFFE_TRAEFIK_TAG:-v3.7.17}
WARDENCLYFFE_TRAEFIK_IP=${TRAEFIK_IP}

# Image tags. Default to "latest"
WARDENCLYFFE_DASHBOARD_TAG=${WARDENCLYFFE_DASHBOARD_TAG:-latest}
WARDENCLYFFE_SERVER_TAG=${WARDENCLYFFE_SERVER_TAG:-latest}
EOF

  if [[ "$WARDENCLYFFE_TRAFFIC_FLOW" == "yes" ]]; then
    cat <<EOF
WARDENCLYFFE_ENRICHER_TAG=${WARDENCLYFFE_ENRICHER_TAG:-latest}
WARDENCLYFFE_RECEIVER_TAG=${WARDENCLYFFE_RECEIVER_TAG:-latest}
EOF
  fi

  cat <<EOF

# License keys
EOF
  if [[ -n "${WARDENCLYFFE_LICENSE_SERVER_BASE_URL:-}" ]]; then
    cat <<EOF
WARDENCLYFFE_LICENSE_SERVER_BASE_URL=${WARDENCLYFFE_LICENSE_SERVER_BASE_URL}
EOF
  fi
  cat <<EOF
WARDENCLYFFE_LICENSE_KEY=${WARDENCLYFFE_LICENSE_KEY}
EOF

  cat <<EOF

# Postgres
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN=${POSTGRES_DSN}

# Relay
WARDENCLYFFE_RELAY_ENDPOINT=${WARDENCLYFFE_RELAY_ENDPOINT}
WARDENCLYFFE_RELAY_AUTH_SECRET=${WARDENCLYFFE_RELAY_AUTH_SECRET}

# Datastore encryption
WARDENCLYFFE_ENCRYPTION_KEY=${WARDENCLYFFE_ENCRYPTION_KEY}

# Dashboard OIDC scopes
WARDENCLYFFE_AUTH_SUPPORTED_SCOPES=${WARDENCLYFFE_AUTH_SUPPORTED_SCOPES:-openid profile email groups}
EOF
}

render_docker_compose() {
  render_compose_header
  render_compose_common
  render_compose_server
  if [[ "$WARDENCLYFFE_TRAFFIC_FLOW" == "yes" ]]; then
    render_compose_flow
  fi
  render_compose_postgres
  render_compose_footer
}

render_compose_header() {
  cat <<'EOF'
x-default: &default
  restart: unless-stopped
  logging:
    driver: json-file
    options:
      max-size: '500m'
      max-file: '2'

services:
EOF
}

render_compose_common() {
  cat <<'EOF'
  # Reverse proxy with automatic TLS via Let's Encrypt. Routes are declared as
  # labels on the services below and picked up through the Docker provider.
  traefik:
    <<: *default
    image: traefik:${WARDENCLYFFE_TRAEFIK_TAG}
    container_name: wardenclyffe-traefik
    networks:
      wardenclyffe:
        ipv4_address: ${WARDENCLYFFE_TRAEFIK_IP}
    command:
      # Logging
      - "--log.level=INFO"
      - "--accesslog=true"
      # Docker provider
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=wardenclyffe"
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.websecure.allowACMEByPass=true"
      # readTimeout bounds the whole request, and gRPC streams / relay WebSockets
      # never end one; idleTimeout would close the keep-alive connection they
      # are reused over. Entrypoint-wide is the only scope Traefik offers here.
      # writeTimeout is left alone: it already defaults to 0.
      - "--entrypoints.websecure.transport.respondingTimeouts.readTimeout=0"
      - "--entrypoints.websecure.transport.respondingTimeouts.idleTimeout=0"
      # HTTP to HTTPS redirect
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      # Let's Encrypt ACME
      - "--certificatesresolvers.letsencrypt.acme.email=${WARDENCLYFFE_LETSENCRYPT_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    ports:
      - '443:443'
      - '80:80'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - wardenclyffe_traefik_letsencrypt:/letsencrypt
    labels:
      - traefik.enable=true
      # Shared security headers, referenced by every WardenClyffe router below. A
      # label-declared middleware only exists while its container runs, so this
      # lives on Traefik itself: declaring it on an app container would drop
      # every router referencing it whenever that container restarts.
      - traefik.http.middlewares.nb-security.headers.stsSeconds=3600
      - traefik.http.middlewares.nb-security.headers.stsIncludeSubdomains=true
      - traefik.http.middlewares.nb-security.headers.contentTypeNosniff=true
      - traefik.http.middlewares.nb-security.headers.browserXssFilter=true
      - traefik.http.middlewares.nb-security.headers.referrerPolicy=strict-origin-when-cross-origin
      - traefik.http.middlewares.nb-security.headers.customResponseHeaders.X-Frame-Options=SAMEORIGIN
      # Empty value strips the header. Only the dashboard's nginx sets one; the
      # server emits none. Do not quote it — "" would send a literal Server: "".
      - traefik.http.middlewares.nb-security.headers.customResponseHeaders.Server=

  dashboard:
    <<: *default
    image: ghcr.io/shippin/wardenclyffe/dashboard-cloud:${WARDENCLYFFE_DASHBOARD_TAG}
    container_name: wardenclyffe-dashboard
    networks: [wardenclyffe]
    labels:
      - traefik.enable=true
      # Dashboard catch-all: lowest priority so every route below wins
      - traefik.http.routers.wardenclyffe-dashboard.rule=Host(`${WARDENCLYFFE_DOMAIN}`)
      - traefik.http.routers.wardenclyffe-dashboard.entrypoints=websecure
      - traefik.http.routers.wardenclyffe-dashboard.tls=true
      - traefik.http.routers.wardenclyffe-dashboard.tls.certresolver=letsencrypt
      - traefik.http.routers.wardenclyffe-dashboard.middlewares=nb-security@docker
      - traefik.http.routers.wardenclyffe-dashboard.service=dashboard
      - traefik.http.routers.wardenclyffe-dashboard.priority=1
      - traefik.http.services.dashboard.loadbalancer.server.port=80
    environment:
      - WARDENCLYFFE_MGMT_API_ENDPOINT=https://${WARDENCLYFFE_DOMAIN}
      - WARDENCLYFFE_MGMT_GRPC_API_ENDPOINT=https://${WARDENCLYFFE_DOMAIN}
      - AUTH_AUDIENCE=wardenclyffe-dashboard
      - AUTH_CLIENT_ID=wardenclyffe-dashboard
      - AUTH_CLIENT_SECRET=
      - AUTH_AUTHORITY=https://${WARDENCLYFFE_DOMAIN}/oauth2
      - USE_AUTH0=false
      - AUTH_SUPPORTED_SCOPES=${WARDENCLYFFE_AUTH_SUPPORTED_SCOPES}
      - AUTH_REDIRECT_URI=/nb-auth
      - AUTH_SILENT_REDIRECT_URI=/nb-silent-auth
      - WARDENCLYFFE_TOKEN_SOURCE=accessToken
      - NGINX_SSL_PORT=443
      - LETSENCRYPT_DOMAIN=
      - LETSENCRYPT_EMAIL=

EOF
}

render_compose_server() {
  cat <<'EOF'
  wardenclyffe-server:
    <<: *default
    image: ghcr.io/shippin/wardenclyffe-server-cloud:${WARDENCLYFFE_SERVER_TAG}
    container_name: wardenclyffe-server
    networks: [wardenclyffe]
    depends_on:
      dashboard:
        condition: service_started
      postgres:
        condition: service_healthy
    ports:
      - '3478:3478/udp'
    volumes:
      - wardenclyffe_data:/var/lib/wardenclyffe
      - ./config.yaml:/etc/wardenclyffe/config.yaml
    command: ["--config", "/etc/wardenclyffe/config.yaml"]
    labels:
      - traefik.enable=true
      # Signal + Management gRPC (needs an h2c backend for HTTP/2 cleartext)
      - traefik.http.routers.wardenclyffe-grpc.rule=Host(`${WARDENCLYFFE_DOMAIN}`) && (PathPrefix(`/signalexchange.SignalExchange/`) || PathPrefix(`/management.ManagementService/`) || PathPrefix(`/management.ProxyService/`))
      - traefik.http.routers.wardenclyffe-grpc.entrypoints=websecure
      - traefik.http.routers.wardenclyffe-grpc.tls=true
      - traefik.http.routers.wardenclyffe-grpc.tls.certresolver=letsencrypt
      - traefik.http.routers.wardenclyffe-grpc.middlewares=nb-security@docker
      - traefik.http.routers.wardenclyffe-grpc.service=wardenclyffe-server-h2c
      - traefik.http.routers.wardenclyffe-grpc.priority=100
      # Relay WebSocket, management API, and the embedded IdP
      - traefik.http.routers.wardenclyffe-backend.rule=Host(`${WARDENCLYFFE_DOMAIN}`) && (PathPrefix(`/relay`) || PathPrefix(`/ws-proxy/`) || PathPrefix(`/api`) || PathPrefix(`/oauth2`))
      - traefik.http.routers.wardenclyffe-backend.entrypoints=websecure
      - traefik.http.routers.wardenclyffe-backend.tls=true
      - traefik.http.routers.wardenclyffe-backend.tls.certresolver=letsencrypt
      - traefik.http.routers.wardenclyffe-backend.middlewares=nb-security@docker
      - traefik.http.routers.wardenclyffe-backend.service=wardenclyffe-server
      - traefik.http.routers.wardenclyffe-backend.priority=100
      # Services
      - traefik.http.services.wardenclyffe-server.loadbalancer.server.port=80
      - traefik.http.services.wardenclyffe-server-h2c.loadbalancer.server.port=80
      - traefik.http.services.wardenclyffe-server-h2c.loadbalancer.server.scheme=h2c
    environment:
      - NB_LICENSE_KEY=${WARDENCLYFFE_LICENSE_KEY}
      - WARDENCLYFFE_LICENSE_SERVER_BASE_URL=${WARDENCLYFFE_LICENSE_SERVER_BASE_URL}

EOF
}

render_compose_flow() {
  cat <<'EOF'
  nats:
    <<: *default
    image: nats:2
    container_name: wardenclyffe-nats
    networks: [wardenclyffe]
    volumes:
      - wardenclyffe_nats_data:/data
    command: ["-m", "8222", "--jetstream", "--store_dir", "/data"]

  enricher:
    <<: *default
    image: ghcr.io/shippin/wardenclyffe/flow-enricher-cloud:${WARDENCLYFFE_ENRICHER_TAG}
    container_name: wardenclyffe-enricher
    networks: [wardenclyffe]
    depends_on:
      postgres:
        condition: service_healthy
      nats:
        condition: service_started
    volumes:
      - wardenclyffe_enricher:/var/lib/wardenclyffe
    environment:
      - NB_LICENSE_KEY=${WARDENCLYFFE_LICENSE_KEY}
      - WARDENCLYFFE_LICENSE_SERVER_BASE_URL=${WARDENCLYFFE_LICENSE_SERVER_BASE_URL}
      - NB_DATADIR=/var/lib/wardenclyffe
      - NB_MANAGEMENT_STORE_ENGINE=postgres
      - NB_MANAGEMENT_POSTGRES_DSN=${WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN}
      - WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN=${WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN}
      - NB_TRAFFIC_EVENT_POSTGRES_DSN=${WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN}
      - NB_TRAFFIC_EVENT_STORE_ENGINE=postgres
      - NB_MANAGEMENT_STORE_KEY=${WARDENCLYFFE_ENCRYPTION_KEY}
      - NB_FLOW_ADAPTER_TYPE=nats
      - NB_FLOW_NATS_ENDPOINTS=nats://nats:4222
      - NB_FLOW_NATS_STREAM=traffic-events
      - NB_METRICS_PORT=9091
      - NB_PERSISTENCE_RETENTION_PERIOD=168h

  receiver:
    <<: *default
    image: ghcr.io/shippin/wardenclyffe/flow-receiver-cloud:${WARDENCLYFFE_RECEIVER_TAG}
    container_name: wardenclyffe-receiver
    networks: [wardenclyffe]
    depends_on:
      nats:
        condition: service_started
    environment:
      - NB_LICENSE_KEY=${WARDENCLYFFE_LICENSE_KEY}
      - WARDENCLYFFE_LICENSE_SERVER_BASE_URL=${WARDENCLYFFE_LICENSE_SERVER_BASE_URL}
      - NB_FLOW_LISTEN_PORT=80
      - NB_FLOW_ADAPTER_TYPE=nats
      - NB_FLOW_NATS_ENDPOINTS=nats://nats:4222
      - NB_FLOW_NATS_STREAM=traffic-events
      - NB_FLOW_AUTH_SECRET=${WARDENCLYFFE_RELAY_AUTH_SECRET}
    labels:
      - traefik.enable=true
      # Flow receiver gRPC (h2c backend)
      - traefik.http.routers.wardenclyffe-flow.rule=Host(`${WARDENCLYFFE_DOMAIN}`) && PathPrefix(`/flow.FlowService/`)
      - traefik.http.routers.wardenclyffe-flow.entrypoints=websecure
      - traefik.http.routers.wardenclyffe-flow.tls=true
      - traefik.http.routers.wardenclyffe-flow.tls.certresolver=letsencrypt
      - traefik.http.routers.wardenclyffe-flow.middlewares=nb-security@docker
      - traefik.http.routers.wardenclyffe-flow.service=wardenclyffe-flow-h2c
      - traefik.http.routers.wardenclyffe-flow.priority=100
      - traefik.http.services.wardenclyffe-flow-h2c.loadbalancer.server.port=80
      - traefik.http.services.wardenclyffe-flow-h2c.loadbalancer.server.scheme=h2c

EOF
}

render_compose_postgres() {
  cat <<'EOF'
  postgres:
    <<: *default
    image: postgres:18
    container_name: wardenclyffe-postgres
    networks: [wardenclyffe]
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - wardenclyffe_postgres:/var/lib/postgresql/data

EOF
}

render_compose_footer() {
  cat <<'EOF'
volumes:
  wardenclyffe_data:
EOF
  if [[ "$WARDENCLYFFE_TRAFFIC_FLOW" == "yes" ]]; then
    cat <<'EOF'
  wardenclyffe_nats_data:
  wardenclyffe_enricher:
EOF
  fi
  cat <<'EOF'
  wardenclyffe_postgres:
  wardenclyffe_traefik_letsencrypt:

networks:
  wardenclyffe:
    name: wardenclyffe
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24
          gateway: 172.30.0.1
EOF
}

render_config_yaml() {
  cat <<EOF
# WardenClyffe Enterprise server configuration.
# Generated by getting-started-enterprise.sh. Mode 600.

server:
  listenAddress: ":80"
  exposedAddress: "https://${WARDENCLYFFE_DOMAIN}:443"

  metricsPort: 9090
  healthcheckAddress: ":9000"

  logLevel: "info"
  logFile: "console"

  # TLS is terminated by Traefik in front; leave this block empty.
  tls:
    certFile: ""
    keyFile: ""
    letsencrypt:
      enabled: false

  authSecret: "${WARDENCLYFFE_RELAY_AUTH_SECRET}"
  dataDir: "/var/lib/wardenclyffe/"

  disableAnonymousMetrics: false
  disableGeoliteUpdate: false

  auth:
    issuer: "https://${WARDENCLYFFE_DOMAIN}/oauth2"
    localAuthDisabled: false
    signKeyRefreshEnabled: false
    sessionCookieEncryptionKey: "${WARDENCLYFFE_SESSION_COOKIE_ENCRYPTION_KEY}"
    dashboardRedirectURIs:
      - "https://${WARDENCLYFFE_DOMAIN}/nb-auth"
      - "https://${WARDENCLYFFE_DOMAIN}/nb-silent-auth"
    cliRedirectURIs:
      - "http://localhost:53000/"

  # Trust X-Forwarded-* only from the Traefik container's static address. Both
  # keys must stay in step with the ipv4_address pinned in docker-compose.yml:
  # trustedPeers restricts which sources may supply forwarded headers. Leaving
  # it unset trusts all IPv4 and IPv6 sources.
  reverseProxy:
    trustedPeers:
      - "${TRAEFIK_IP}/32"
    trustedHTTPProxies:
      - "${TRAEFIK_IP}/32"

  store:
    engine: "postgres"
    dsn: "${POSTGRES_DSN}"
    encryptionKey: "${WARDENCLYFFE_ENCRYPTION_KEY}"

  activityStore:
    engine: "postgres"
    dsn: "${POSTGRES_DSN}"
EOF

  if [[ "$WARDENCLYFFE_TRAFFIC_FLOW" == "yes" ]]; then
    cat <<EOF

  trafficFlow:
    enabled: true
    address: "https://${WARDENCLYFFE_DOMAIN}:443"
    interval: "60s"
EOF
  fi
}

init_environment
