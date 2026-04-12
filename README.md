# ISS Tracker — Live Dashboard

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-orange?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/chadohman)

Real-time International Space Station tracking dashboard at [iss.cdnspace.ca](https://iss.cdnspace.ca). Live orbital telemetry, crew schedules, space weather, pass predictions, and systems data from NASA Lightstreamer.

## Features

**Telemetry & Tracking**
- Real-time orbital position via SGP4 propagation from CelesTrak TLEs
- Ground track map (2D Leaflet + 3D Three.js globe toggle)
- Orbital parameters: altitude, speed, apoapsis, periapsis, inclination, eccentricity, period
- Day/night cycle indicator (ISS crosses the terminator every ~45 minutes)
- Visible pass predictions based on your location

**ISS Systems**
- Live telemetry from NASA Lightstreamer (~297 channels): power, thermal, attitude, atmosphere
- Crew timeline with color-coded activities (sleep, science, exercise, EVA)
- Current expedition crew roster with agency flags

**Event Mode**
- Auto-detects EVAs, dockings, reboosts from schedule data
- Dashboard transforms to spotlight active events (larger video, event timer, crew/vehicle details)
- Admin override for manual event management

**Additional Pages**
- `/track` — Full-page ground track map
- `/live` — Full-page NASA ISS live stream with event context
- `/stats` — Cumulative ISS statistics (orbits, distance, years in orbit)
- `/admin` — Protected event management panel
- `/api-docs` — REST & SSE endpoint documentation

**Customization**
- Bilingual (English / French)
- LIVE / SIM mode with 0–100× playback
- Dark command-center aesthetic (matching [artemis.cdnspace.ca](https://artemis.cdnspace.ca))

## Tech Stack

Next.js 16, TypeScript, React 19, Tailwind CSS 4, Three.js, Leaflet, MySQL, Server-Sent Events

## Data Sources

| Source | Data | Update Interval |
|--------|------|-----------------|
| NASA Lightstreamer (`ISSLIVE`) | ~297 ISS telemetry channels | Real-time push |
| CelesTrak | ISS TLEs (NORAD 25544) | 2 hours |
| SGP4 propagation | Position, velocity, ground track | 1 second |
| NOAA SWPC | Kp index, X-ray flux, proton flux | 60 seconds |
| NASA ISS schedule | Crew activities, EVA/docking events | 15 minutes |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telemetry/stream` | SSE | Real-time telemetry firehose |
| `/api/orbit` | GET | Current orbital state |
| `/api/systems` | GET | Latest ISS systems telemetry |
| `/api/passes?lat=X&lon=Y` | GET | Visible pass predictions |
| `/api/events` | GET | Upcoming and active events |
| `/api/weather` | GET | Space weather |
| `/api/history?metric=X&hours=Y` | GET | Historical time-series |
| `/api/snapshot?timestamp=X` | GET | Point-in-time for SIM mode |
| `/api/admin/events` | POST/PUT | Event management (token auth) |

## Quick Start

```bash
git clone https://github.com/ChadOhman/cdnspace-iss-tracker.git
cd cdnspace-iss-tracker
cp .env.example .env    # configure MySQL URL and admin token
npm install
npm run dev
```

> **Note:** The dashboard works without MySQL — orbital tracking, space weather, and Lightstreamer telemetry run independently. MySQL is needed for history, SIM mode replay, and event persistence.

## Deploy to Proxmox LXC

### Option A: External MySQL (recommended)

If you already have a MySQL/MariaDB server on your network, the LXC only needs Node.js:

```bash
CTID=201 bash -c '
pct create $CTID local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname iss-tracker \
  --memory 2048 --cores 4 --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 --features nesting=1 \
  --start 1 && sleep 5 && \
pct exec $CTID -- bash -c "
  apt-get update && apt-get install -y curl git ca-certificates && \
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \

  # Clone and build
  git clone https://github.com/ChadOhman/cdnspace-iss-tracker.git /opt/iss-tracker && \
  cd /opt/iss-tracker && \
  npm ci && npm run build && \

  # Systemd service
  cat > /etc/systemd/system/iss-tracker.service <<EOF
[Unit]
Description=ISS Tracker
After=network.target

[Service]
WorkingDirectory=/opt/iss-tracker
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=MYSQL_URL=mysql://iss:changeme@10.0.0.X:3306/iss_tracker
Environment=ADMIN_TOKEN=$(openssl rand -hex 16)

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload && \
  systemctl enable --now iss-tracker
"
'
```

On your external MySQL server, create the database and user:

```sql
CREATE DATABASE iss_tracker;
CREATE USER 'iss'@'%' IDENTIFIED BY 'changeme';
GRANT ALL ON iss_tracker.* TO 'iss'@'%';
FLUSH PRIVILEGES;
```

Replace `10.0.0.X` in the `MYSQL_URL` with your database server's IP. Make sure MySQL is listening on the network interface (not just localhost) — check `bind-address` in your MySQL config.

### Option B: Self-contained (MySQL inside the LXC)

If you prefer everything in one container:

```bash
CTID=201 bash -c '
pct create $CTID local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname iss-tracker \
  --memory 2048 --cores 4 --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 --features nesting=1 \
  --start 1 && sleep 5 && \
pct exec $CTID -- bash -c "
  apt-get update && apt-get install -y curl git ca-certificates mariadb-server && \
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \

  # Set up MariaDB
  systemctl enable --now mariadb && \
  mysql -e \"CREATE DATABASE IF NOT EXISTS iss_tracker; \
             CREATE USER IF NOT EXISTS '"'"'iss'"'"'@'"'"'localhost'"'"' IDENTIFIED BY '"'"'changeme'"'"'; \
             GRANT ALL ON iss_tracker.* TO '"'"'iss'"'"'@'"'"'localhost'"'"'; \
             FLUSH PRIVILEGES;\" && \

  # Clone and build
  git clone https://github.com/ChadOhman/cdnspace-iss-tracker.git /opt/iss-tracker && \
  cd /opt/iss-tracker && \
  npm ci && npm run build && \

  # Systemd service
  cat > /etc/systemd/system/iss-tracker.service <<EOF
[Unit]
Description=ISS Tracker
After=network.target mariadb.service

[Service]
WorkingDirectory=/opt/iss-tracker
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=MYSQL_URL=mysql://iss:changeme@localhost:3306/iss_tracker
Environment=ADMIN_TOKEN=$(openssl rand -hex 16)

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload && \
  systemctl enable --now iss-tracker
"
'
```

### Update existing deployment

```bash
cd /opt/iss-tracker && git pull && rm -rf .next node_modules && npm ci && npm run build && systemctl restart iss-tracker
```

### Cloudflare Tunnel

If proxying through Cloudflare Tunnel, set SSE keepalives in your tunnel config:

```yaml
ingress:
  - hostname: iss.cdnspace.ca
    service: http://localhost:3000
    originRequest:
      keepAliveTimeout: 30s
```

## License

MIT

## Acknowledgements

Built with data from NASA, NOAA, and CelesTrak. Companion project to the [Artemis II Tracker](https://artemis.cdnspace.ca).
