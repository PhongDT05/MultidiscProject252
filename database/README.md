# Smart Lab Database Setup

Complete SQL Server Docker + DBeaver integration kit for the Smart Lab Dashboard.

## Quick Start (30 seconds)

### Windows Users

1. Open Command Prompt or PowerShell in project root.
2. Run: `cd database && setup.bat`
3. Choose option **7** (Full reset) to start fresh.
4. Follow DBeaver setup in [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md) → Step 2.

### Mac/Linux Users

1. From project root, run: `make -C database docker-up`
2. Then: `make -C database db-reset`
3. Open DBeaver and follow [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md) → Step 2.

## Files

| File | Purpose |
|------|---------|
| [docker-compose.yml](../docker-compose.yml) | Docker Compose configuration (SQL Server 2022 + volumes). |
| [.env.example](.env.example) | Template credentials and connection strings. |
| [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md) | Complete step-by-step setup guide with troubleshooting. |
| [Makefile](Makefile) | Automated commands for Mac/Linux (docker-up, db-reset, test-connection, etc.). |
| [setup.bat](setup.bat) | Interactive menu for Windows (start, stop, load schema, seed, reset). |
| [001_schema.sql](sqlserver/001_schema.sql) | SQL Server relational schema (tables, constraints, indexes). |
| [002_seed_demo.sql](sqlserver/002_seed_demo.sql) | Demo data (demo users, labs, assignments). |

## Architecture

```
┌─────────────────────────────────────┐
│     Docker (localhost:11433)        │
├─────────────────────────────────────┤
│    SQL Server 2022 (sa user)        │
│    ├─ SmartLabDb                    │
│    │  ├─ smartlab.[Role]            │
│    │  ├─ smartlab.[User]            │
│    │  ├─ smartlab.Lab               │
│    │  ├─ smartlab.Equipment         │
│    │  ├─ smartlab.IoTDevice         │
│    │  ├─ smartlab.TelemetryReading  │
│    │  ├─ smartlab.Alert             │
│    │  └─ ... (core operational tables) │
│    └─ sqlserver-data (volume)       │
└─────────────────────────────────────┘
         │
         ├─ DBeaver GUI (read/write)
         │
         └─ Application Backend (read/write)
```

## Credentials

**Default credentials** (from `docker-compose.yml`):

```
Host: localhost
Port: 11433
User: sa
Password: SmartLab@2026!
Database: SmartLabDb
```

⚠️ **For production**, change password before deployment and store securely in secrets manager (Azure Key Vault, AWS Secrets Manager, etc.).

## Common Tasks

### Start Fresh

```bash
# Windows
database\setup.bat  # Choose option 7

# Mac/Linux
make -C database db-reset
```

### Load Schema Only

```bash
# Windows
database\setup.bat  # Choose option 5

# Mac/Linux
make -C database db-schema
```

### Check Data

```bash
# Windows
database\setup.bat  # Choose option 8

# Mac/Linux
make -C database test-connection
```

### View Logs

```bash
# Windows
database\setup.bat  # Choose option 3

# Mac/Linux
make -C database docker-logs
```

## Troubleshooting

**"Connection refused"**
- Container not running: `docker-compose up -d`
- Wait 30 seconds for healthcheck.

**"Port 1433 already in use"**
- Edit `docker-compose.yml` line 12: `- "11433:1433"`
- In DBeaver, use port 11433.

**"Login failed for user 'sa'"**
- Check password in `docker-compose.yml` matches DBeaver connection.

**"TLS/SSL error"**
- In DBeaver, check **Trust server certificate** in SSL tab.

For full troubleshooting, see [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md) → Common Issues & Fixes.

## Next Steps

1. ✅ Start container and load schema (see Quick Start above).
2. ✅ Connect DBeaver (follow [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md)).
3. ✅ Query data to verify: `SELECT TOP 10 * FROM smartlab.Lab;`
4. 📋 Review [../../SYSTEM_DOCUMENTATION.md](../../SYSTEM_DOCUMENTATION.md) → Database Design & Implementation.
5. 🔗 Integrate with backend (Node.js/C# app via connection string from [.env.example](.env.example)).
6. 📦 Plan production deployment (Azure SQL Database or AWS RDS).

## Support

- **Questions?** Check [DOCKER_DBEAVER_SETUP.md](DOCKER_DBEAVER_SETUP.md).
- **Schema changes?** Edit [sqlserver/001_schema.sql](sqlserver/001_schema.sql), then reset: `make -C database db-reset`.
