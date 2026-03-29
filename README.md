
  # Smart Lab Dashboard

  Smart Lab Dashboard is a React + TypeScript application for monitoring and controlling laboratory environments with role-based access control.

  ## Run Locally

  1. Install dependencies:

    ```bash
    npm i
    ```

  2. Start the dev server:

    ```bash
    npm run dev
    ```

  3. Open http://localhost:5173/

  ## SQL-Backed App Mode (Actual DB Persistence)

  By default, frontend uses localStorage demo mode. To persist app data in SQL Server:

  1. Start SQL Server Docker container and load schema + seed scripts (see [database/DOCKER_DBEAVER_SETUP.md](database/DOCKER_DBEAVER_SETUP.md)).
  2. Set in `.env`:
     - `VITE_USE_BACKEND_API=true`
     - `VITE_API_BASE_URL=http://localhost:4000`
  3. Start API server:

    ```bash
    npm run dev:api
    ```

  4. In another terminal start frontend:

    ```bash
    npm run dev
    ```

  5. Login with seeded accounts (for now plaintext demo passwords):
     - `admin / admin123`
     - `manager / manager123`
     - `manager2 / manager123`
     - `tech / tech123`

  ## Live MQTT Integration (ESP32)

  This project now supports live MQTT ingestion from your ESP32 topics:

  - `esp32SLG4/presence`
  - `esp32SLG4/mode`
  - `esp32SLG4/temperate`
  - `esp32SLG4/humidity`
  - `esp32SLG4/light`
  - `esp32SLG4/air`
  - `esp32SLG4/counter`
  - `esp32SLG4/alertst`, `esp32SLG4/alertsh`, `esp32SLG4/alertsl`, `esp32SLG4/alertsa`
  - `esp32SLG4/commands`
  - `esp32SLG4/status/oled`, `esp32SLG4/status/dht`, `esp32SLG4/status/bh1750`, `esp32SLG4/status/radar`, `esp32SLG4/status/mq135`

  Setup:

  1. Copy `.env.example` to `.env`.
  2. Set `VITE_MQTT_BROKER_URL` to your broker WebSocket URL (for example `ws://localhost:9001`).
  3. Start app with `npm run dev`.

  Notes:

  - Browser clients require MQTT over WebSocket.
  - When `VITE_ENABLE_MQTT=true`, the demo data simulator is disabled automatically to prevent overwriting live telemetry.

  ## Documentation

  - Quick start and demo accounts: [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
  - System architecture and module details: [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)
  - Authentication and RBAC details: [RBAC_DOCUMENTATION.md](RBAC_DOCUMENTATION.md)
  - Third-party attributions: [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
