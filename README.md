
<div align="center">
  <p align="center">
    <img width="234" src="docs/media/logo-full.png" alt="WardenClyffe logo"/>
  </p>
  <p align="center">
    <a href="https://sonarcloud.io/dashboard?id=shippin_wardenclyffe">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=shippin_wardenclyffe&metric=alert_status" alt="SonarCloud alert status"/>
    </a>
    <a href="https://github.com/shippin/wardenclyffe/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-BSD--3-blue" alt="BSD-3 License"/>
    </a>
    <a href="https://docs.wardenclyffe.app/slack-url">
      <img src="https://img.shields.io/badge/slack-@wardenclyffe-red.svg?logo=slack" alt="WardenClyffe Slack"/>
    </a>
    <a href="https://forum.wardenclyffe.app">
      <img src="https://img.shields.io/badge/community%20forum-@wardenclyffe-red.svg?logo=discourse" alt="Community forum"/>
    </a>
    <a href="https://gurubase.io/g/wardenclyffe">
      <img src="https://img.shields.io/badge/Gurubase-Ask%20WardenClyffe%20Guru-006BFF" alt="Gurubase: Ask WardenClyffe Guru"/>
    </a>
  </p>
</div>

<p align="center">
  <strong>
    Start using WardenClyffe at <a href="https://wardenclyffe.apppricing">wardenclyffe.app</a>
    <br/>
    See <a href="https://docs.wardenclyffe.app/">Documentation</a>
    <br/>
    Join our <a href="https://docs.wardenclyffe.app/slack-url">Slack channel</a> or our <a href="https://forum.wardenclyffe.app">Community forum</a>
  </strong>
  <br/>
  <br/>
  <strong>
    ðŸš€ <a href="https://wardenclyffe.appcareers">We are hiring! Join us at https://wardenclyffe.appcareers</a>
  </strong>
</p>

> ### ðŸ¤– WardenClyffe Agent Network (Beta)
> Identity-aware access control for AI agents â€” keyless access to LLM APIs and private
> resources over the encrypted WardenClyffe tunnel. See [`agent-network/`](agent-network/) or
> read the docs at **[wardenclyffe.ai](https://wardenclyffe.ai)**.

**WardenClyffe combines a configuration-free peer-to-peer private network and a centralized access control system in a single platform, making it easy to create secure private networks for your organization or home.**

**Connect.** WardenClyffe creates a WireGuard-based overlay network that automatically connects your machines over an encrypted tunnel, leaving behind the hassle of opening ports, complex firewall rules, VPN gateways, and so forth.

**Secure.** WardenClyffe enables secure remote access by applying granular access policies while allowing you to manage them intuitively from a single place. Works universally on any infrastructure.

https://github.com/user-attachments/assets/10cec749-bb56-4ab3-97af-4e38850108d2

### Release target

The WardenClyffe release target is **0.5.0**, recorded in
[`RELEASE_VERSION`](RELEASE_VERSION).
This is WardenClyffe's product version, not a claim of NetBird release parity.
Development builds remain marked as development until release acceptance passes.
No `v0.5.0` release has been published by setting this target.

Before publishing, verify self-hosted installation, trusted HTTPS, initial setup
and login, direct and relayed peer connectivity, policy enforcement, persistence,
backup/restore, and supported upgrades. MCPL acceptance is separate and remains
incomplete.

Client versions currently participate in capability and posture checks.
Do not substitute `0.5.0` into those checks or lower inherited minimum versions
without a tested product-version and compatibility design.

See the [0.5.0 execution plan and acceptance gates](docs/release-0.5.0.md)
for verified behavior, upstream differences and remaining release blockers.

### Self-host WardenClyffe (video)

[![Watch the video](https://img.youtube.com/vi/bZAgpT6nzaQ/0.jpg)](https://youtu.be/bZAgpT6nzaQ)

### Key features

| Connectivity | Management | Security | Automation | Platforms |
|---|---|---|---|---|
| âœ“ [Kernel WireGuard](https://docs.wardenclyffe.app/about-wardenclyffe/why-wireguard-with-wardenclyffe) | âœ“ [Admin Web UI](https://github.com/shippin/wardenclyffe/dashboard) | âœ“ [SSO & MFA support](https://docs.wardenclyffe.app/how-to/installation#running-wardenclyffe-with-sso-login) | âœ“ [Public API](https://docs.wardenclyffe.app/api) | âœ“ [Linux](https://docs.wardenclyffe.app/get-started/install/linux) |
| âœ“ [Peer-to-peer connections](https://docs.wardenclyffe.app/about-wardenclyffe/how-wardenclyffe-works) | âœ“ Auto peer discovery and configuration | âœ“ [Access control: groups & rules](https://docs.wardenclyffe.app/how-to/manage-network-access) | âœ“ [Setup keys for bulk provisioning](https://docs.wardenclyffe.app/how-to/register-machines-using-setup-keys) | âœ“ [macOS](https://docs.wardenclyffe.app/get-started/install/macos) |
| âœ“ Connection relay fallback | âœ“ [IdP integrations](https://docs.wardenclyffe.app/selfhosted/identity-providers) | âœ“ [Activity logging](https://docs.wardenclyffe.app/how-to/audit-events-logging) | âœ“ [Self-hosting quickstart script](https://docs.wardenclyffe.app/selfhosted/selfhosted-quickstart) | âœ“ [Windows](https://docs.wardenclyffe.app/get-started/install/windows) |
| âœ“ [Routes to external networks](https://docs.wardenclyffe.app/how-to/routing-traffic-to-private-networks) | âœ“ [Private DNS](https://docs.wardenclyffe.app/how-to/manage-dns-in-your-network) | âœ“ [Traffic events](https://docs.wardenclyffe.app/manage/activity/traffic-events-logging) | âœ“ [IdP groups sync with JWT](https://docs.wardenclyffe.app/manage/team/idp-sync) | âœ“ [Android](https://docs.wardenclyffe.app/get-started/install/android) |
| âœ“ [Domain-based DNS routes](https://docs.wardenclyffe.app/manage/dns/dns-aliases-for-routed-networks) | âœ“ [Custom DNS zones](https://docs.wardenclyffe.app/manage/dns/custom-zones) | âœ“ [Device posture checks](https://docs.wardenclyffe.app/how-to/manage-posture-checks) | âœ“ [Terraform provider](https://registry.terraform.io/providers/shippin/wardenclyffe/latest) | âœ“ [Android TV](https://docs.wardenclyffe.app/get-started/install/android-tv) |
| âœ“ [Exit nodes](https://docs.wardenclyffe.app/manage/network-routes/use-cases/exit-nodes) | âœ“ [Multiuser support](https://docs.wardenclyffe.app/how-to/add-users-to-your-network) | âœ“ Peer-to-peer encryption | âœ“ [Ansible collection](https://github.com/shippin/wardenclyffe/ansible-wardenclyffe) | âœ“ [iOS](https://docs.wardenclyffe.app/get-started/install/ios) |
| âœ“ [IPv6 dual-stack overlay](https://docs.wardenclyffe.app/manage/settings/ipv6) | âœ“ [Multi-account profile switching](https://docs.wardenclyffe.app/client/profiles) | âœ“ [SSH with central access policies](https://docs.wardenclyffe.app/manage/peers/ssh) | | âœ“ [Apple TV](https://docs.wardenclyffe.app/get-started/install/tvos) |
| âœ“ [Browser SSH & RDP](https://docs.wardenclyffe.app/manage/peers/browser-client) | | âœ“ [Quantum-resistance with Rosenpass](https://wardenclyffe.appknowledge-hub/the-first-quantum-resistant-mesh-vpn) | | âœ“ FreeBSD |
| âœ“ [Reverse proxy with auto-TLS](https://docs.wardenclyffe.app/manage/reverse-proxy) | | âœ“ [Periodic re-authentication](https://docs.wardenclyffe.app/how-to/enforce-periodic-user-authentication) | | âœ“ [pfSense](https://docs.wardenclyffe.app/get-started/install/pfsense) |
| | | | | âœ“ [OPNsense](https://docs.wardenclyffe.app/get-started/install/opnsense) |
| | | | | âœ“ [MikroTik RouterOS](https://docs.wardenclyffe.app/use-cases/homelab/client-on-mikrotik-router) |
| | | | | âœ“ OpenWRT |
| | | | | âœ“ [Synology](https://docs.wardenclyffe.app/get-started/install/synology) |
| | | | | âœ“ [TrueNAS](https://docs.wardenclyffe.app/get-started/install/truenas) |
| | | | | âœ“ [Proxmox](https://docs.wardenclyffe.app/get-started/install/proxmox-ve) |
| | | | | âœ“ [Raspberry Pi](https://docs.wardenclyffe.app/get-started/install/raspberrypi) |
| | | | | âœ“ [Serverless](https://docs.wardenclyffe.app/how-to/wardenclyffe-on-faas) |
| | | | | âœ“ [Container](https://docs.wardenclyffe.app/get-started/install/docker) |

### Quickstart with WardenClyffe Cloud

- Download and install WardenClyffe at [https://app.wardenclyffe.app/install](https://app.wardenclyffe.app/install).
- Follow the steps to sign up with Google, Microsoft, GitHub or your email address.
- Check the WardenClyffe [admin UI](https://app.wardenclyffe.app/).

### Quickstart with self-hosted WardenClyffe

Build the server and dashboard images from this checkout before running the
self-hosted installer. The previously documented release download is currently
unavailable; these steps use local images.

**Infrastructure requirements:**
- A Linux VM with at least **1 CPU** and **2 GB** of memory.
- The VM should be publicly accessible on TCP ports **80** and **443** and UDP port **3478**.
- A **public domain** name pointing to the VM.

**Software requirements:**
- Docker with the Compose plugin (Compose v2 or higher), Node.js 24 or newer,
  npm, jq, and OpenSSL. See the [Docker installation guide](https://docs.docker.com/engine/install/).

**Steps**
- From the repository root, build the images:
```bash
project_dir="$(pwd)"
docker build -f combined/Dockerfile.multistage -t wardenclyffe-server:local .
(cd dashboard && npm ci && npm run build && docker build -f docker/Dockerfile -t wardenclyffe-dashboard:local .)
```

- Run the installer from a separate deployment directory, replacing the example
  domain with your public domain:
```bash
mkdir -p "$HOME/wardenclyffe-deployment"
cd "$HOME/wardenclyffe-deployment"
export WARDENCLYFFE_DOMAIN=wardenclyffe.example.com
export WARDENCLYFFE_SERVER_IMAGE=wardenclyffe-server:local
export DASHBOARD_IMAGE=wardenclyffe-dashboard:local
bash "$project_dir/infrastructure_files/getting-started.sh"
```

The installer creates configuration and a persistent Docker volume in this
deployment. Keep those files and the volume when upgrading an existing instance.

### A bit on WardenClyffe internals
- Every machine in the network runs the [WardenClyffe agent](client/), which manages WireGuard.
- Every agent connects to the [Management Service](management/), which holds network state, manages peer IPs, and distributes updates to agents.
- Agents use ICE (via [pion/ice](https://github.com/pion/ice)) to discover connection candidates for peer-to-peer connections.
- Candidates are discovered with the help of [STUN](https://en.wikipedia.org/wiki/STUN) servers.
- Agents negotiate a connection through the [Signal Service](signal/), exchanging end-to-end encrypted messages with candidates.
- When NAT traversal fails (e.g. mobile carrier-grade NAT) and a direct p2p connection isn't possible, the system falls back to a [Relay Service](relay/) and a secure WireGuard tunnel is established through it.

<p float="left" align="middle">
  <img src="https://docs.wardenclyffe.app/docs-static/img/about-wardenclyffe/high-level-dia.png" width="700" alt="WardenClyffe high-level architecture diagram"/>
</p>

See a complete [architecture overview](https://docs.wardenclyffe.app/about-wardenclyffe/how-wardenclyffe-works#architecture) for details.

### Community projects
- [WardenClyffe installer script](https://github.com/physk/wardenclyffe-installer)
- [wardenclyffe-tui](https://github.com/n0pashkov/wardenclyffe-tui) - terminal UI for managing WardenClyffe peers, routes, and settings
- [caddy-wardenclyffe](https://github.com/lixmal/caddy-wardenclyffe) - Caddy plugin that embeds a WardenClyffe client for proxying HTTP and TCP/UDP traffic through WardenClyffe networks

**Note**: The `main` branch may be in an *unstable or even broken state* during development.
For stable versions, see [releases](https://github.com/shippin/wardenclyffe/releases).

### Support acknowledgement

In November 2022, WardenClyffe joined the [StartUpSecure program](https://www.forschung-it-sicherheit-kommunikationssysteme.de/foerderung/bekanntmachungen/startup-secure) sponsored by the Federal Ministry of Education and Research of the Federal Republic of Germany. Together with the [CISPA Helmholtz Center for Information Security](https://cispa.de/en), WardenClyffe brings security best practices and simplicity to private networking.

![CISPA_Logo_BLACK_EN_RZ_RGB (1)](https://user-images.githubusercontent.com/700848/203091324-c6d311a0-22b5-4b05-a288-91cbc6cdcc46.png)

### Acknowledgements
We build on open source technologies like [WireGuardÂ®](https://www.wireguard.com/), [Pion ICE](https://github.com/pion/ice), and [Rosenpass](https://rosenpass.eu). We greatly appreciate the work these projects are doing, and we'd love it if you could support them too (e.g., by starring or contributing).

### Legal
This repository is licensed under the debating/thinking/bsl license, which applies to all parts of the repository except for the directories management/, signal/ and relay/.
Those directories are licensed under the GNU Affero General Public License version 3.0 (AGPLv3). See the respective LICENSE files inside each directory.

_WireGuard_ and the _WireGuard_ logo are [registered trademarks](https://www.wireguard.com/trademark-policy/) of Jason A. Donenfeld.
 
