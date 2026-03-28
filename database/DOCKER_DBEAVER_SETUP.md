# SQL Server Docker + DBeaver Setup Guide

## Step 1: Start SQL Server in Docker

### Prerequisites
- Docker Desktop installed and running
- 2GB+ RAM available

### Launch Container

From the project root, run:

```bash
docker compose up -d sqlserver
```

Verify container is running:

```bash
docker ps | grep smartlab-sqlserver
```

Optional (only if you need a helper tools container):

```bash
docker compose --profile tools up -d
```

Wait for healthcheck to pass (30-60 seconds):

```bash
docker compose logs sqlserver
```

Look for: `Server is ready to accept connections`

---

## Step 2: Connect DBeaver to SQL Server

### Open DBeaver

1. Launch DBeaver (Community or Pro edition).
2. **File** → **New Database Connection** (or click the plug icon in Database view).
3. Choose **SQL Server** from the database list.
4. Click **Next**.

### Connection Settings

**Main Tab:**

| Field | Value |
|-------|-------|
| Server Host | `localhost` |
| Port | `11433` |
| Database | `master` (for first connection) |
| Username | `sa` |
| Password | `SmartLab@2026!` |
| Save password | ✓ Checked |

**SSL Tab:**

| Field | Value |
|-------|-------|
| Require SSL | ✓ Checked |
| Allow public key retrieval | ✓ Checked |
| Use system certificate store | ☐ Unchecked |
| Verify server certificate | ☐ Unchecked |
| **Trust server certificate** | ✓ **CHECKED** |

**Driver Properties Tab (Optional):**

| Key | Value |
|-----|-------|
| encrypt | true |
| trustServerCertificate | true |

### Test Connection

Click **Test Connection** button.

**If successful:** Green checkmark, "Connected [SQL Server version]"

**If failed:**
- Error: `Login failed for user 'sa'`
  - Password is wrong; check `docker-compose.yml` SA_PASSWORD.
  - Container not ready; wait 30 seconds and retry.
- Error: `Cannot connect to localhost:11433`
  - Docker not running; start Docker Desktop.
  - Port already in use; choose another host port in `docker-compose.yml` and use the same value in DBeaver.
- Error: `SSL handshake failed`
  - Ensure **Trust server certificate** is checked.

### Finish Connection

Click **Finish**. DBeaver saves the connection and displays it in the Database Navigator on the left.

---

## Step 3: Create SmartLabDb Database

### In DBeaver SQL Editor

1. Right-click the connection → **SQL Editor** → **New SQL Script**.
2. Paste and execute:

```sql
CREATE DATABASE SmartLabDb;
GO
```

3. Refresh (press F5) and verify `SmartLabDb` appears under the server.

---

## Step 4: Load Schema & Seed Data

### Option A: Direct SQL Execution in DBeaver

1. Right-click `SmartLabDb` → **SQL Editor** → **New SQL Script**.
2. Open `database/sqlserver/001_schema.sql`:
   - Copy entire contents into the SQL editor.
   - Execute (Ctrl+Enter or click play icon).
   - Wait for completion (should see "Commands completed successfully").
3. Repeat for `database/sqlserver/002_seed_demo.sql`.

### Option B: Via Docker Shell (Advanced)

```bash
# Copy schema into container
docker cp database/sqlserver/001_schema.sql smartlab-sqlserver:/schema.sql

# Execute in container using sqlcmd
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P 'SmartLab@2026!' \
  -d SmartLabDb \
  -i /schema.sql

# Repeat for seed
docker cp database/sqlserver/002_seed_demo.sql smartlab-sqlserver:/seed.sql
docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P 'SmartLab@2026!' \
  -d SmartLabDb \
  -i /seed.sql
```

---

## Step 5: Verify Data

### In DBeaver

1. Right-click `SmartLabDb` → Expand → **Tables**.
2. Verify `smartlab.Lab`, `smartlab.User`, `smartlab.Equipment`, etc. appear.
3. Right-click `smartlab.Lab` → **Select All** or paste:

```sql
SELECT TOP 20 * FROM smartlab.Lab;
SELECT TOP 20 * FROM smartlab.[User];
SELECT TOP 20 FROM smartlab.Alert ORDER BY CreatedAt DESC;
```

Execute and verify data is populated.

---

## Common Issues & Fixes

### Issue: "Connection timeout"

**Cause:** Container not running or not ready.

**Fix:**

```bash
docker compose logs sqlserver
docker compose restart sqlserver
# Wait 30 seconds
```

### Issue: "Login failed for user 'sa'"

**Cause:** Wrong password or SA_PASSWORD not set correctly.

**Fix:**
1. Check `docker-compose.yml` — password must be `SmartLab@2026!`
2. If changed, stop and remove container:
   ```bash
  docker compose down
   docker volume rm smartlab-sqlserver_sqlserver-data
  docker compose up -d sqlserver
   ```

### Issue: "Port 1433 already in use"

**Cause:** Another SQL Server instance or service on port 1433.

**Fix:**
1. Edit `docker-compose.yml`:
   ```yaml
   ports:
    - "11433:1433"  # Use an unoccupied host port
   ```
2. In DBeaver, use Port: `11433`

### Issue: "Login failed for user 'sa'" but sqlcmd in container succeeds

**Cause:** DBeaver is connecting to a different SQL Server instance on host `1433`.

**Fix:**
1. Use DBeaver Host `localhost`, Port `11433`.
2. Recreate the connection in DBeaver to clear cached endpoint/auth settings.
3. Verify Docker mapping:
  ```bash
  docker compose ps
  ```
  Look for: `0.0.0.0:11433->1433/tcp`

### Issue: "TLS handshake error" or "SSL: CERTIFICATE_VERIFY_FAILED"

**Cause:** SSL/TLS certificate trust issue.

**Fix:** In DBeaver connection SSL tab, ensure:
- ✓ Require SSL
- ✓ Trust server certificate (most important for Docker)

### Issue: "Database doesn't exist after restart"

**Cause:** Volume not persisting data.

**Fix:**
1. Verify volume exists:
   ```bash
   docker volume ls | grep smartlab
   ```
2. Ensure `volumes:` section in `docker-compose.yml` is present:
   ```yaml
   volumes:
     sqlserver-data:
       driver: local
   ```
3. If lost, recreate schema/seed (step 4).

---

## Useful Docker Commands

```bash
# View logs
docker compose logs -f sqlserver

# Stop containers
docker compose down

# Remove volumes (CAUTION: deletes data)
docker compose down -v

# Restart containers
docker compose restart sqlserver

# Execute shell in container
docker exec -it smartlab-sqlserver /bin/bash

# Check container health
docker compose ps
```

---

## Next Steps

- **Backend Integration**: Use connection string from `.env.example` in your Node.js/C# app.
- **Backup**: Set up regular backups (see `SYSTEM_DOCUMENTATION.md` > Database > Backup & Recovery).
- **Production Deployment**: Use managed SQL Server (Azure SQL Database or AWS RDS) instead of Docker.

---

## DBeaver Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Execute SQL |
| F5 | Refresh Database Navigator |
| Ctrl+N | New SQL Script |
| Ctrl+Shift+D | Format SQL |
| Ctrl+Alt+R | Execute & Show Results |
