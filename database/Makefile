.PHONY: help docker-up docker-down docker-logs db-create db-schema db-seed db-reset db-query test-connection

help:
	@echo "Smart Lab Database Management Commands"
	@echo "======================================"
	@echo "Docker Commands:"
	@echo "  make docker-up           - Start SQL Server container"
	@echo "  make docker-down         - Stop container"
	@echo "  make docker-logs         - View container logs"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-create           - Create SmartLabDb database"
	@echo "  make db-schema           - Load schema (001_schema.sql)"
	@echo "  make db-seed             - Load demo data (002_seed_demo.sql)"
	@echo "  make db-reset            - Full reset (create + schema + seed)"
	@echo ""
	@echo "Testing:"
	@echo "  make test-connection     - Test DB connection with sqlcmd"
	@echo ""

docker-up:
	docker-compose -f docker-compose.yml up -d
	@echo "✓ SQL Server container started. Waiting for health check..."
	@sleep 5
	docker-compose logs sqlserver | grep "ready to accept"

docker-down:
	docker-compose -f docker-compose.yml down

docker-logs:
	docker-compose logs -f sqlserver

db-create:
	docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
		-S localhost \
		-U sa \
		-P 'SmartLab@2026!' \
		-Q "CREATE DATABASE SmartLabDb;"
	@echo "✓ Database SmartLabDb created"

db-schema:
	docker cp ./database/sqlserver/001_schema.sql smartlab-sqlserver:/schema.sql
	docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
		-S localhost \
		-U sa \
		-P 'SmartLab@2026!' \
		-d SmartLabDb \
		-i /schema.sql
	@echo "✓ Schema loaded"

db-seed:
	docker cp ./database/sqlserver/002_seed_demo.sql smartlab-sqlserver:/seed.sql
	docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
		-S localhost \
		-U sa \
		-P 'SmartLab@2026!' \
		-d SmartLabDb \
		-i /seed.sql
	@echo "✓ Demo data seeded"

db-reset: docker-down docker-up db-create db-schema db-seed
	@echo "✓ Database fully reset"

test-connection:
	docker exec smartlab-sqlserver /opt/mssql-tools18/bin/sqlcmd \
		-S localhost \
		-U sa \
		-P 'SmartLab@2026!' \
		-d SmartLabDb \
		-Q "SELECT 'Connection OK' AS Status; SELECT COUNT(*) AS UserCount FROM smartlab.[User]; SELECT COUNT(*) AS LabCount FROM smartlab.Lab;"
	@echo "✓ Connection test passed"
