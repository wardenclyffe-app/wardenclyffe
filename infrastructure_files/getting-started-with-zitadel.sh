#!/usr/bin/env bash

cat >&2 <<'EOF'
ERROR: This legacy installation script has been retired and no longer runs.

Zitadel support and existing Zitadel deployments are not deprecated.

For new deployments, use getting-started.sh:

https://docs.wardenclyffe.app/selfhosted/selfhosted-quickstart

The current installer includes WardenClyffe's embedded Dex-based identity provider.
Zitadel can be added as an external identity provider directly through the
WardenClyffe Dashboard:

https://docs.wardenclyffe.app/selfhosted/identity-providers/zitadel

Standalone Zitadel and other custom identity-provider deployments remain
supported through the advanced guide:

https://docs.wardenclyffe.app/selfhosted/selfhosted-guide

This compatibility notice will be removed in WardenClyffe v0.80.
EOF

exit 1
