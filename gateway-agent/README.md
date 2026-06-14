# School Gateway Agent

This folder is reserved for the future school mini-PC gateway agent.

The gateway agent will run on a small on-premises device (e.g. a Raspberry Pi or mini-PC) at each school. Its role is to bridge the school's private NVR/camera LAN to the cloud `stream-worker` over a secure VPN tunnel (Tailscale or WireGuard), without ever exposing RTSP or NVR admin ports to the public internet.

**Not implemented yet.** See `school/docs/school-connectivity.md` for the current VPN connectivity approach used in the pilot phase.
