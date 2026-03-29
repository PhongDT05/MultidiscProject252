import sql from 'mssql';

const connectionString =
  process.env.SQLSERVER_CONNECTION_STRING ||
  'Server=localhost,11433;Database=SmartLabDb;User Id=sa;Password=SmartLab@2026!;Encrypt=true;TrustServerCertificate=true;Connection Timeout=30;';

const pool = new sql.ConnectionPool(connectionString);
const poolConnect = pool.connect();

export async function query(text, bind = {}) {
  await poolConnect;
  const request = pool.request();
  Object.entries(bind).forEach(([key, value]) => {
    request.input(key, value);
  });
  const result = await request.query(text);
  return result.recordset;
}

export async function executeInTransaction(handler) {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const requestFactory = () => new sql.Request(transaction);
    const result = await handler(requestFactory);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export { sql };
