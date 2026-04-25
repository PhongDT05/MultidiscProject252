
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

  Frontend now uses SQL-backed API mode by default. To persist app data in SQL Server:

  1. Start SQL Server Docker container and load schema + seed scripts (see [database/DOCKER_DBEAVER_SETUP.md](database/DOCKER_DBEAVER_SETUP.md)).
  2. Set in `.env`:
     - `VITE_USE_BACKEND_API=true` (default; set `false` only for offline demo mode)
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
     - `tech / tech123`
     - `student / student123` (student role)
      - `instructor1 / instructor123` (instructor role)

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

    ## MQTT Command Bridge (Dashboard -> Gateway PC)

    The dashboard can publish control commands to MQTT through the backend API.

    Backend environment variables:

    - `API_MQTT_BROKER_URL` (required for command publishing)
    - `API_MQTT_USERNAME` (optional)
    - `API_MQTT_PASSWORD` (optional)
    - `API_MQTT_COMMAND_TOPIC` (optional, default: `esp32SLG4/commands`)
    - `API_MQTT_CLIENT_ID` (optional)

    Gateway PC setup:

    1. Copy this repo (or only `tools/mqtt-command-gateway.js`) to the gateway computer.
    2. Set gateway environment variables as needed:
      - `GATEWAY_MQTT_BROKER_URL` (default: `mqtt://localhost:1883`)
      - `GATEWAY_MQTT_SUBSCRIBE_TOPIC` (default: `esp32SLG4/commands`)
      - `GATEWAY_MQTT_ACK_TOPIC` (default: `esp32SLG4/ack`)
      - `GATEWAY_MQTT_USERNAME` / `GATEWAY_MQTT_PASSWORD` (optional)
    3. Run `npm run gateway:commands`.

    The gateway script is at `tools/mqtt-command-gateway.js`. Replace `executeDeviceCommand` with the real local device integration logic.

  ## Documentation

  - Quick start and demo accounts: [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
  - System architecture and module details: [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)
  - Authentication and RBAC details: [RBAC_DOCUMENTATION.md](RBAC_DOCUMENTATION.md)
  - Third-party attributions: [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
