// Oracle Autonomous DB 연결 (node-oracledb Thin 모드 + 지갑)
// 필요한 환경변수: ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING,
//                 ORACLE_WALLET_DIR, ORACLE_WALLET_PASSWORD
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb
      .createPool({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
        configDir: process.env.ORACLE_WALLET_DIR,
        walletLocation: process.env.ORACLE_WALLET_DIR,
        walletPassword: process.env.ORACLE_WALLET_PASSWORD,
        poolMin: 0,
        poolMax: 4,
        poolTimeout: 60,
      })
      .catch((err) => {
        // 실패하면 다음 호출에서 다시 만들 수 있게 비운다
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

async function query(sql, binds = {}, opts = {}) {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    return await conn.execute(sql, binds, opts);
  } finally {
    await conn.close();
  }
}

async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = null;
  await pool.close(10);
}

module.exports = { getPool, query, closePool };
