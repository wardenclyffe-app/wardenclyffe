#!/bin/bash
set -e

if ! which curl >/dev/null 2>&1; then
  echo "This script uses curl fetch OpenID configuration from IDP."
  echo "Please install curl and re-run the script https://curl.se/"
  echo ""
  exit 1
fi

if ! which jq >/dev/null 2>&1; then
  echo "This script uses jq to load OpenID configuration from IDP."
  echo "Please install jq and re-run the script https://stedolan.github.io/jq/"
  echo ""
  exit 1
fi

source setup.env
source base.setup.env

if ! which envsubst >/dev/null 2>&1; then
  echo "envsubst is needed to run this script"
  if [[ $(uname) == "Darwin" ]]; then
    echo "you can install it with homebrew (https://brew.sh):"
    echo "brew install gettext"
  else
    if which apt-get >/dev/null 2>&1; then
      echo "you can install it by running"
      echo "apt-get update && apt-get install gettext-base"
    else
      echo "you can install it by installing the package gettext with your package manager"
    fi
  fi
  exit 1
fi

if [[ "x-$WARDENCLYFFE_DOMAIN" == "x-" ]]; then
  echo WARDENCLYFFE_DOMAIN is not set, please update your setup.env file
  echo If you are migrating from old versions, update legacy variable prefixes to WARDENCLYFFE_
  exit 1
fi

# Check if PostgreSQL is set as the store engine
if [[ "$WARDENCLYFFE_STORE_CONFIG_ENGINE" == "postgres" ]]; then
  # Exit if 'WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN' is not set
  if [[ -z "$WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN" ]]; then
    echo "Warning: WARDENCLYFFE_STORE_CONFIG_ENGINE=postgres but WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN is not set."
    echo "Please add the following line to your setup.env file:"
    echo 'WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN="host=<PG_HOST> user=<PG_USER> password=<PG_PASSWORD> dbname=<PG_DB_NAME> port=<PG_PORT>"'
    exit 1
  fi
  export WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN
fi

# Check if MySQL is set as the store engine
if [[ "$WARDENCLYFFE_STORE_CONFIG_ENGINE" == "mysql" ]]; then
  # Exit if 'WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN' is not set
  if [[ -z "$WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN" ]]; then
    echo "Warning: WARDENCLYFFE_STORE_CONFIG_ENGINE=mysql but WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN is not set."
    echo "Please add the following line to your setup.env file:"
    echo 'WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN="<username>:<password>@tcp(127.0.0.1:3306)/<database>"'
    exit 1
  fi
  export WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN
fi

# local development or tests
if [[ $WARDENCLYFFE_DOMAIN == "localhost" || $WARDENCLYFFE_DOMAIN == "127.0.0.1" ]]; then
  export WARDENCLYFFE_MGMT_SINGLE_ACCOUNT_MODE_DOMAIN="wardenclyffe.selfhosted"
  export WARDENCLYFFE_MGMT_API_ENDPOINT=http://$WARDENCLYFFE_DOMAIN:$WARDENCLYFFE_MGMT_API_PORT
  unset WARDENCLYFFE_MGMT_API_CERT_FILE
  unset WARDENCLYFFE_MGMT_API_CERT_KEY_FILE
fi

# if not provided, we generate a turn password
if [[ "x-$TURN_PASSWORD" == "x-" ]]; then
  export TURN_PASSWORD=$(openssl rand -base64 32 | sed 's/=//g')
fi

TURN_EXTERNAL_IP_CONFIG="#"

if [[ "x-$WARDENCLYFFE_TURN_EXTERNAL_IP" == "x-" ]]; then
  echo "discovering server's public IP"
  IP=$(curl -s -4 https://jsonip.com | jq -r '.ip')
  if [[ "x-$IP" != "x-" ]]; then
    TURN_EXTERNAL_IP_CONFIG="external-ip=$IP"
  else
    echo "unable to discover server's public IP"
  fi
else
  echo "${WARDENCLYFFE_TURN_EXTERNAL_IP}"| egrep '([0-9]{1,3}\.){3}[0-9]{1,3}$' > /dev/null
  if [[ $? -eq 0 ]]; then
    echo "using provided server's public IP"
    TURN_EXTERNAL_IP_CONFIG="external-ip=$WARDENCLYFFE_TURN_EXTERNAL_IP"
  else
    echo "provided WARDENCLYFFE_TURN_EXTERNAL_IP $WARDENCLYFFE_TURN_EXTERNAL_IP is invalid, please correct it and try again"
    exit 1
  fi
fi

export TURN_EXTERNAL_IP_CONFIG

# if not provided, we generate a relay auth secret
if [[ "x-$WARDENCLYFFE_RELAY_AUTH_SECRET" == "x-" ]]; then
  export WARDENCLYFFE_RELAY_AUTH_SECRET=$(openssl rand -base64 32 | sed 's/=//g')
fi

artifacts_path="./artifacts"
mkdir -p $artifacts_path

MGMT_VOLUMENAME="${VOLUME_PREFIX}${MGMT_VOLUMESUFFIX}"
SIGNAL_VOLUMENAME="${VOLUME_PREFIX}${SIGNAL_VOLUMESUFFIX}"
LETSENCRYPT_VOLUMENAME="${VOLUME_PREFIX}${LETSENCRYPT_VOLUMESUFFIX}"

export MGMT_VOLUMENAME
export SIGNAL_VOLUMENAME
export LETSENCRYPT_VOLUMENAME

#backwards compatibility after migrating to generic OIDC with Auth0
if [[ -z "${WARDENCLYFFE_AUTH_OIDC_CONFIGURATION_ENDPOINT}" ]]; then

  if [[ -z "${WARDENCLYFFE_AUTH0_DOMAIN}" ]]; then
    # not a backward compatible state
    echo "WARDENCLYFFE_AUTH_OIDC_CONFIGURATION_ENDPOINT property must be set in the setup.env file"
    exit 1
  fi

  echo "It seems like you provided an old setup.env file."
  echo "Since the release of v0.8.10, we introduced a new set of properties."
  echo "The script is backward compatible and will continue automatically."
  echo "In the future versions it will be deprecated. Please refer to the documentation to learn about the changes https://docs.wardenclyffe.app/self-hosting/selfhosting-with-identity-provider"

  export WARDENCLYFFE_AUTH_OIDC_CONFIGURATION_ENDPOINT="https://${WARDENCLYFFE_AUTH0_DOMAIN}/.well-known/openid-configuration"
  export WARDENCLYFFE_USE_AUTH0="true"
  export WARDENCLYFFE_AUTH_AUDIENCE=${WARDENCLYFFE_AUTH0_AUDIENCE}
  export WARDENCLYFFE_AUTH_CLIENT_ID=${WARDENCLYFFE_AUTH0_CLIENT_ID}
fi

echo "loading OpenID configuration from ${WARDENCLYFFE_AUTH_OIDC_CONFIGURATION_ENDPOINT} to the openid-configuration.json file"
curl "${WARDENCLYFFE_AUTH_OIDC_CONFIGURATION_ENDPOINT}" -q -o ${artifacts_path}/openid-configuration.json

export WARDENCLYFFE_AUTH_AUTHORITY=$(jq -r '.issuer' ${artifacts_path}/openid-configuration.json)
export WARDENCLYFFE_AUTH_JWT_CERTS=$(jq -r '.jwks_uri' ${artifacts_path}/openid-configuration.json)
export WARDENCLYFFE_AUTH_TOKEN_ENDPOINT=$(jq -r '.token_endpoint' ${artifacts_path}/openid-configuration.json)
export WARDENCLYFFE_AUTH_DEVICE_AUTH_ENDPOINT=$(jq -r '.device_authorization_endpoint' ${artifacts_path}/openid-configuration.json)
export WARDENCLYFFE_AUTH_PKCE_AUTHORIZATION_ENDPOINT=$(jq -r '.authorization_endpoint' ${artifacts_path}/openid-configuration.json)

if [[ ! -z "${WARDENCLYFFE_AUTH_DEVICE_AUTH_CLIENT_ID}" ]]; then
  # user enabled Device Authorization Grant feature
  export WARDENCLYFFE_AUTH_DEVICE_AUTH_PROVIDER="hosted"
fi

if [ "$WARDENCLYFFE_TOKEN_SOURCE" = "idToken" ]; then
    export WARDENCLYFFE_AUTH_PKCE_USE_ID_TOKEN=true
fi

# Check if letsencrypt was disabled
if [[ "$WARDENCLYFFE_DISABLE_LETSENCRYPT" == "true" ]]; then
  export WARDENCLYFFE_DASHBOARD_ENDPOINT="https://$WARDENCLYFFE_DOMAIN:443"
  export WARDENCLYFFE_SIGNAL_ENDPOINT="https://$WARDENCLYFFE_DOMAIN:$WARDENCLYFFE_SIGNAL_PORT"
  export WARDENCLYFFE_RELAY_ENDPOINT="rels://$WARDENCLYFFE_DOMAIN:$WARDENCLYFFE_RELAY_PORT/relay"

  echo "Letsencrypt was disabled, the Https-endpoints cannot be used anymore"
  echo " and a reverse-proxy with Https needs to be placed in front of wardenclyffe!"
  echo "The following forwards have to be setup:"
  echo "- $WARDENCLYFFE_DASHBOARD_ENDPOINT -http-> dashboard:80"
  echo "- $WARDENCLYFFE_MGMT_API_ENDPOINT/api -http-> management:$WARDENCLYFFE_MGMT_API_PORT"
  echo "- $WARDENCLYFFE_MGMT_API_ENDPOINT/management.ManagementService/ -grpc-> management:$WARDENCLYFFE_MGMT_API_PORT"
  echo "- $WARDENCLYFFE_SIGNAL_ENDPOINT/signalexchange.SignalExchange/ -grpc-> signal:80"
  echo "- $WARDENCLYFFE_RELAY_ENDPOINT/ -http-> relay:33080"
  echo "You most likely also have to change WARDENCLYFFE_MGMT_API_ENDPOINT in base.setup.env and port-mappings in docker-compose.yml.tmpl and rerun this script."
  echo " The target of the forwards depends on your setup. Beware of the gRPC protocol instead of http for management and signal!"
  echo "You are also free to remove any occurrences of the Letsencrypt-volume $LETSENCRYPT_VOLUMENAME"
  echo ""

  unset WARDENCLYFFE_LETSENCRYPT_DOMAIN
  unset WARDENCLYFFE_MGMT_API_CERT_FILE
  unset WARDENCLYFFE_MGMT_API_CERT_KEY_FILE
fi

if [[ -n "$WARDENCLYFFE_MGMT_API_CERT_FILE" && -n "$WARDENCLYFFE_MGMT_API_CERT_KEY_FILE" ]]; then
  export WARDENCLYFFE_SIGNAL_PROTOCOL="https"
fi

# Check if management identity provider is set
if [ -n "$WARDENCLYFFE_MGMT_IDP" ]; then
  EXTRA_CONFIG={}

  # extract extra config from all env prefixed with WARDENCLYFFE_IDP_MGMT_EXTRA_
  for var in ${!WARDENCLYFFE_IDP_MGMT_EXTRA_*}; do
    # convert key snake case to camel case
    key=$(
      echo "${var#WARDENCLYFFE_IDP_MGMT_EXTRA_}" | awk -F "_" \
        '{for (i=1; i<=NF; i++) {output=output substr($i,1,1) tolower(substr($i,2))} print output}'
    )
    value="${!var}"

   echo "$var"
    EXTRA_CONFIG=$(jq --arg k "$key" --arg v "$value" '.[$k] = $v' <<<"$EXTRA_CONFIG")
  done

  export WARDENCLYFFE_MGMT_IDP
  export WARDENCLYFFE_IDP_MGMT_CLIENT_ID
  export WARDENCLYFFE_IDP_MGMT_CLIENT_SECRET
  export WARDENCLYFFE_IDP_MGMT_EXTRA_CONFIG=$EXTRA_CONFIG
else
  export WARDENCLYFFE_IDP_MGMT_EXTRA_CONFIG={}
fi

IFS=',' read -r -a REDIRECT_URL_PORTS <<< "$WARDENCLYFFE_AUTH_PKCE_REDIRECT_URL_PORTS"
REDIRECT_URLS=""
for port in "${REDIRECT_URL_PORTS[@]}"; do
    REDIRECT_URLS+="\"http://localhost:${port}\","
done

export WARDENCLYFFE_AUTH_PKCE_REDIRECT_URLS=${REDIRECT_URLS%,}

# Remove audience for providers that do not support it
if [ "$WARDENCLYFFE_DASH_AUTH_USE_AUDIENCE" = "false" ]; then
    export WARDENCLYFFE_DASH_AUTH_AUDIENCE=none
    export WARDENCLYFFE_AUTH_PKCE_AUDIENCE=
fi

# Read the encryption key
if test -f 'management.json'; then
    encKey=$(jq -r  ".DataStoreEncryptionKey" management.json)
    if [[ "$encKey" != "null" ]]; then
        export WARDENCLYFFE_DATASTORE_ENC_KEY=$encKey

    fi
fi

env | grep WARDENCLYFFE

bkp_postfix="$(date +%s)"
if test -f "${artifacts_path}/docker-compose.yml"; then
    cp $artifacts_path/docker-compose.yml "${artifacts_path}/docker-compose.yml.bkp.${bkp_postfix}"
fi

if test -f "${artifacts_path}/management.json"; then
    cp $artifacts_path/management.json "${artifacts_path}/management.json.bkp.${bkp_postfix}"
fi

if test -f "${artifacts_path}/turnserver.conf"; then
    cp ${artifacts_path}/turnserver.conf "${artifacts_path}/turnserver.conf.bkp.${bkp_postfix}"
fi
envsubst <docker-compose.yml.tmpl >$artifacts_path/docker-compose.yml
envsubst <management.json.tmpl | jq . >$artifacts_path/management.json
envsubst <turnserver.conf.tmpl >$artifacts_path/turnserver.conf
