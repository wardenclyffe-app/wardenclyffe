# WardenClyffe data and identity inventory

This is an inventory of what the tree does today. It is not a design for
merging WardenClyffe with Nomen or Vaultix. A later "Nomen identity bundle"
is expected to share one Postgres, one ClickHouse, and one Dragonfly, with
table and key names prefixed per product. Nothing here implements that share.

The isolation boundary inside WardenClyffe is the **account**. Peers, users,
groups, policies, routes, DNS, and proxy services are rows keyed by
`account_id`. A self-hosted install usually has one account. The management
process can store many accounts in one database; that is how the hosted
product works, and it is not a per-tenant network product of its own.

## Components

| Process | Path | Role |
| --- | --- | --- |
| Agent | `client/` | Privileged daemon. Brings up the overlay interface, routes, firewall, and DNS. Talks to management over gRPC and to signal for handshakes. |
| Management | `management/` | Control plane. REST under `/api` and the management gRPC service. Owns accounts, peers, policies, and the network map. |
| Signal | `signal/` | Forwards peer handshake messages. No account database. |
| Relay | `relay/` | Carries overlay traffic when a direct path is impossible. Authenticates with a shared secret, not the account store. |
| Combined | `combined/` | One binary that runs management, signal, and relay for the self-hosted installer and the container e2e. |
| Proxy | `proxy/` | Identity-aware proxy in front of Agent Network and published services. OIDC for users; the account store for policy. |
| Dashboard | `dashboard/` | Next.js console. Talks to management's REST API. It does not have its own database. |
| Upload server | `upload-server/` | Accepts debug bundles. Default URL `https://upload.debug.wardenclyffe.app/upload-url`. Local disk under `/var/lib/wardenclyffe` when self-hosted. |
| Embedded IdP | `idp/dex/` | Dex, compiled into management, served at `/oauth2/` when `EmbeddedIdP` is enabled. This is what `wardenclyffe up` uses out of the box. |

The agent has three packet paths. Kernel mode programs the in-kernel
interface and iptables or nftables. Userspace mode uses a TUN and forwards
routed traffic in process. Netstack mode has no TUN; the embedded and WASM
builds use it. Firewall, routing, and DNS code is not specific to WireGuard.

## What is stored, and where

There is no ClickHouse client and no Dragonfly client in this repository.
Analytics and the activity log are SQL. The only cache is optional Redis.

### Account database

Configured by `StoreConfig.Engine` in the management config. Supported
engines are `sqlite` (default), `postgres`, and `mysql`.

| Engine | How it is selected |
| --- | --- |
| SQLite | Default. File `store.db` under the data directory (`/var/lib/wardenclyffe` in the installer). |
| Postgres | `NB_STORE_ENGINE_POSTGRES_DSN`, or legacy `WARDENCLYFFE_STORE_ENGINE_POSTGRES_DSN`. |
| MySQL | `NB_STORE_ENGINE_MYSQL_DSN`, or legacy `WARDENCLYFFE_STORE_ENGINE_MYSQL_DSN`. |

`WARDENCLYFFE_STORE_ENGINE` overrides the engine in tests. The installer
compose file runs Postgres 18 for the account store. SQLite remains the
default when no DSN is set.

GORM's naming strategy and the pgx account loader both read and write the
**prefixed** names in `management/server/schema/table_naming_plan.go`. The
unprefixed names are a compatibility copy created at startup from an older
database. A fresh database created by AutoMigrate only has the prefixed
tables. `users`, `accounts`, and `groups` in that list are not the live
names.

Live account-store tables:

| Domain | Live table |
| --- | --- |
| Core | `wardenclyffe_core_accounts`, `wardenclyffe_core_users`, `wardenclyffe_core_groups`, `wardenclyffe_core_group_peers`, `wardenclyffe_core_policies`, `wardenclyffe_core_policy_rules`, `wardenclyffe_core_peers`, `wardenclyffe_core_routes`, `wardenclyffe_core_setup_keys`, `wardenclyffe_core_personal_access_tokens`, `wardenclyffe_core_proxy_access_tokens`, `wardenclyffe_core_installations`, `wardenclyffe_core_jobs`, `wardenclyffe_core_extra_settings`, `wardenclyffe_core_ui_events` |
| Profile | `wardenclyffe_profile_account_onboardings`, `wardenclyffe_profile_user_invites` |
| Network | `wardenclyffe_networks`, `wardenclyffe_network_resources`, `wardenclyffe_network_routers`, `wardenclyffe_network_addresses` |
| DNS | `wardenclyffe_dns_name_server_groups`, `wardenclyffe_dns_zones`, `wardenclyffe_dns_records` |
| Posture | `wardenclyffe_posture_checks` |
| Proxy | `wardenclyffe_proxy_services`, `wardenclyffe_proxy_targets`, `wardenclyffe_proxy_domains`, `wardenclyffe_proxy_proxies`, `wardenclyffe_proxy_access_log_entries` |
| Agent Network | `wardenclyffe_agent_network_providers`, `wardenclyffe_agent_network_policies`, `wardenclyffe_agent_network_guardrails`, `wardenclyffe_agent_network_settings`, `wardenclyffe_agent_network_consumption`, `wardenclyffe_agent_network_budget_rules`, `wardenclyffe_agent_network_access_log`, `wardenclyffe_agent_network_access_log_group`, `wardenclyffe_agent_network_request_usage`, `wardenclyffe_agent_network_request_usage_group` |

`wardenclyffe_core_accounts` is the tenant row: id, domain, domain category,
embedded network prefix, and embedded settings. `wardenclyffe_core_users.id`
is the IdP subject (`sub`) and is the primary key for the whole database, so
one subject belongs to one account. Email and name on that row are encrypted
when `DataStoreEncryptionKey` is set.

A "network" inside an account (`wardenclyffe_networks`) is a named set of
resources and routing peers. It is not a separate tenant.

### Activity log

Separate from the account database. SQLite file `events.db` in the data
directory, or Postgres when `NB_ACTIVITY_EVENT_STORE_ENGINE=postgres` and
`NB_ACTIVITY_EVENT_POSTGRES_DSN` are set.

Tables are **not** prefixed: `events` and `deleted_users`. `events` holds
`account_id`, initiator, target, activity code, and a JSON meta column.
`deleted_users` keeps a name and email after a user row is removed so the
log can still be read.

### Embedded IdP

Dex storage is its own database, configured under `EmbeddedIdP.Storage`.
`sqlite3` needs `file`. `postgres` needs `dsn`. Dex creates its own tables
(users, clients, connectors, auth requests, and so on) with Dex's names.
Those names are not in the `wardenclyffe_*` plan. Putting Dex in the same
Postgres database as the account store will collide with a stock Dex or
Zitadel schema unless Dex is given its own schema.

### Cache

`NB_CACHE_REDIS_ADDRESS` (legacy `NB_IDP_CACHE_REDIS_ADDRESS`) selects Redis.
If it is unset, the cache is in-process. Keys are account ids and IdP user
ids from gocache. There is no key prefix. A shared Dragonfly would mix
WardenClyffe keys with anything else written at the root.

Redis is not required for self-host. The container e2e does not start one.

### What is not stored here

- No ClickHouse. Traffic and proxy logs are the SQL tables above.
- No Dragonfly and no Redis key layout designed to share a server.
- No Vaultix or OpenBao server. `github.com/openbao/openbao/api/v2` is only
  pulled in by the embedded Dex module. Setup keys and WireGuard private
  keys are columns in the account store and in the agent config file.
- Signal and relay keep no account tables. Relay state is the handshake and
  the shared credential.

## Identity

Authentication of the management API is in
`management/server/http/middleware/auth_middleware.go` and
`management/server/auth`. Two credentials are accepted:

- A JWT from the configured issuer. The validator uses `HttpConfig.AuthIssuer`,
  `AuthAudience`, and `AuthKeysLocation` (JWKS). `AuthUserIDClaim` defaults
  to `sub`.
- A personal access token (`nbp_...`), stored hashed in
  `wardenclyffe_core_personal_access_tokens`.

`shared/auth/jwt/extractor.go` copies email, name, and audience-scoped
claims (`wt_account_id`, `wt_account_domain`, `nb_last_login`, `nb_invited`)
onto `auth.UserAuth`. It does not read a Nomen org claim. Account placement
is `GetAccountIDFromUserAuth`: a new subject with no row gets a new account,
unless single-account mode or a private email domain joins them to an
existing one. JWT group sync is per account (`JWTGroupsEnabled`,
`JWTGroupsClaimName`) and only adds groups inside the account the user
already belongs to.

External IdP user lookup is optional and separate from JWT validation.
`IdpManagerConfig.ManagerType` selects a management-API client: `auth0`,
`azure`, `keycloak`, `zitadel`, `authentik`, `okta`, `google`, `jumpcloud`,
`pocketid`, `dex`, or empty. Those clients store `wt_account_id` in the
IdP's app metadata where the IdP allows it. Nomen's discovery document at
`https://id.shippin.cloud/.well-known/openid-configuration` is a Zitadel-shaped
issuer (device code, PKCE, `urn` claims that are not in `claims_supported`).
The built-in Zitadel manager speaks Zitadel's management API, not Nomen's
`urn:nomen:iam:` claims, and it is not wired as the account selector.

The agent logs in with the device authorization flow or PKCE. The management
config's `DeviceAuthorizationFlow` and `PKCEAuthorizationFlow` tell the
client the issuer endpoints and scopes. The default scope is `openid`.

The dashboard and the proxy have their own OIDC client settings (dashboard
env, proxy flags `NB_PROXY_OIDC_*`). They are not the same config block as
the management `HttpConfig`, and they do not create accounts.

## Config surface

Management JSON (`management.json` / the installer's generated file):

- `Datadir`, `DataStoreEncryptionKey`
- `StoreConfig.Engine`
- `HttpConfig`: `AuthIssuer`, `AuthAudience`, `AuthUserIDClaim`,
  `AuthKeysLocation`, `OIDCConfigEndpoint`, TLS files or `LetsEncryptDomain`
- `IdpManagerConfig` when an external user directory is used
- `EmbeddedIdP` when Dex is in-process (the self-hosted default)
- `DeviceAuthorizationFlow`, `PKCEAuthorizationFlow`
- `Signal`, `Relay`, `Stuns`, `TURNConfig`
- `ReverseProxy.TrustedHTTPProxies` for the real client IP behind Traefik

Installer images, as of this tree: Traefik `v3.7.17`, Postgres `18`,
Ubuntu 24.04 for the service runtime, Alpine 3.24 for the agent image,
Go `1.27.3` for image builds. The installer does not refuse an older
Traefik tag; the image default is the only pin.

Agent config is a JSON file per profile (default directory
`/var/lib/wardenclyffe` for the daemon). It holds the management URL, the
interface name, and the peer's private key. It is not the account database.

## Overlap with a shared Nomen bundle

Nomen (the IdP behind `https://id.shippin.cloud`) already owns users, orgs,
and project roles. The shippin console creates an org with
`POST /v2/organizations` and treats that org id as the tenant. WardenClyffe
does not read that id. Its user primary key is the OIDC `sub`, and the
account is created from that subject, not from the org.

If the three products share one Postgres database in `public`:

- The live WardenClyffe account tables are already prefixed `wardenclyffe_`.
  They do not use the bare names `users` or `accounts` at runtime.
- The activity log is not prefixed (`events`, `deleted_users`). Those names
  will collide with anything else that creates `events`.
- Dex, if pointed at the same database, creates an unprefixed OIDC schema
  on top of Nomen's. Dex should keep its own schema, or stay on its own
  SQLite file, until that is deliberate.
- Unprefixed compatibility copies (`accounts`, `users`, `groups`, ...) are
  still created when an old database is opened. A shared database that
  already has those names for another product must not be opened by a
  management process that still runs `CreatePrefixedTableCopies`.

If they share one Dragonfly:

- Set `NB_CACHE_REDIS_ADDRESS` only behind a key prefix that no other
  product writes. Today the cache does not add one.

ClickHouse is unused. A shared ClickHouse cluster does not require a
WardenClyffe schema change until someone chooses to put flow or audit
events there. The SQL `events` table is the audit log now.

Identity for that bundle is Nomen's job. WardenClyffe should keep treating
the JWT as an untrusted credential and should keep resolving the account
inside management, not from a claim alone. Mapping a Nomen org to one
WardenClyffe account is not implemented. The `sub` primary key means one
person who is in two orgs cannot be two accounts without a different user
id. That is the constraint a later mapping has to respect.
