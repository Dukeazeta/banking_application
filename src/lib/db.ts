import "server-only";

import mysql, {
  type FieldPacket,
  type ExecuteValues,
  type Pool,
  type PoolConnection,
  type QueryOptions,
  type QueryResult,
  type QueryValues,
  type RowDataPacket,
} from "mysql2/promise";

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: {
    ca?: string;
    rejectUnauthorized: boolean;
  };
};

type ProcedureResult<T extends QueryResult = RowDataPacket[]> = [
  T,
  FieldPacket[],
];

let pool: Pool | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDbConfig(): DbConfig {
  const port = Number(requireEnv("DB_PORT"));

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DB_PORT must be a positive integer");
  }

  const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n").trim();
  const sslMode = process.env.DB_SSL?.trim().toLowerCase();
  const sslEnabled = Boolean(sslCa) || sslMode === "true" || sslMode === "1" || sslMode === "required";
  const rejectUnauthorized =
    process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
      ? Boolean(sslCa)
      : process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

  return {
    host: requireEnv("DB_HOST"),
    port,
    user: requireEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requireEnv("DB_NAME"),
    ...(sslEnabled
      ? {
          ssl: {
            ...(sslCa ? { ca: sslCa } : {}),
            rejectUnauthorized,
          },
        }
      : {}),
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...getDbConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false,
    });
  }

  return pool;
}

export async function query<T extends QueryResult = RowDataPacket[]>(
  sql: string,
  params: ExecuteValues[] = [],
): Promise<[T, FieldPacket[]]> {
  return getPool().execute<T>(sql, params);
}

export async function callProcedure<T extends QueryResult = RowDataPacket[]>(
  procedureName: string,
  params: QueryValues[] = [],
): Promise<ProcedureResult<T>> {
  if (!/^[A-Za-z0-9_]+$/.test(procedureName)) {
    throw new Error("Invalid stored procedure name");
  }

  const placeholders = params.map(() => "?").join(", ");
  const sql = `CALL ${procedureName}(${placeholders})`;

  return getPool().query<T>(sql, params);
}

export async function withConnection<T>(
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getPool().getConnection();

  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

export async function rawQuery<T extends QueryResult = RowDataPacket[]>(
  options: string | QueryOptions,
  params: QueryValues[] = [],
): Promise<[T, FieldPacket[]]> {
  if (typeof options === "string") {
    return getPool().query<T>(options, params);
  }

  return getPool().query<T>(options, params);
}
