#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source <(sed 's/\r$//' "$script_dir/../getting-started.sh" | sed '/^init_environment$/d')

WARDENCLYFFE_HTTP_PROTOCOL=https
WARDENCLYFFE_DOMAIN=wardenclyffe.example.test
DOCKER_COMPOSE_COMMAND="docker compose"
stub_discovery='{"issuer":"https://wardenclyffe.example.test/oauth2","authorization_endpoint":"https://wardenclyffe.example.test/oauth2/auth","token_endpoint":"https://wardenclyffe.example.test/oauth2/token","jwks_uri":"https://wardenclyffe.example.test/oauth2/keys"}'
stub_instance='{"setup_required":true}'
curl_failure=false

curl() {
  for arg in "$@"; do
    case "$arg" in
      --insecure|-k|-sk) echo "TLS verification must not be bypassed" >&2; return 1 ;;
    esac
  done
  if [[ "$curl_failure" == true ]]; then
    echo "curl: certificate verification failed (test)" >&2
    return 60
  fi
  case "${!#}" in
    */openid-configuration) printf '%s\n' "$stub_discovery" ;;
    */api/instance) printf '%s\n' "$stub_instance" ;;
    *) echo "Unexpected readiness endpoint: ${!#}" >&2; return 1 ;;
  esac
}

expect_rejected() {
  if check_management_ready "https://$WARDENCLYFFE_DOMAIN"; then
    echo "Readiness incorrectly accepted: $1" >&2
    exit 1
  fi
}

check_management_ready "https://$WARDENCLYFFE_DOMAIN"
stub_instance='{"setup_required":false}'
check_management_ready "https://$WARDENCLYFFE_DOMAIN"
stub_instance='<html>catch-all HTTP 200</html>'
expect_rejected "HTML catch-all"
stub_instance='{"setup_required":"false"}'
expect_rejected "incorrect instance schema"
stub_instance='{"setup_required":false}'
saved_discovery="$stub_discovery"
stub_discovery="${stub_discovery/wardenclyffe.example.test/wrong.example.test}"
expect_rejected "unexpected issuer"
stub_discovery="$saved_discovery"
curl_failure=true
expect_rejected "untrusted certificate"
if wait_management_ready "https://$WARDENCLYFFE_DOMAIN" 1; then
  echo "Readiness timeout incorrectly returned success" >&2
  exit 1
fi
echo "Installer readiness tests passed."
