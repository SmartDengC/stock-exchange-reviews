import type { H3Event } from "h3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../db/schema";

type TradingDb = ReturnType<typeof drizzle<typeof schema>>;

let cachedUrl = "";
let cachedDb: TradingDb | null = null;

export function getTradingDb(event: H3Event) {
  const url = useRuntimeConfig(event).databaseUrl
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL;
  if (!url) {
    throw createError({
      statusCode: 503,
      message: "交易数据库尚未配置，请先连接 Neon Postgres",
    });
  }
  if (!cachedDb || cachedUrl !== url) {
    cachedUrl = url;
    cachedDb = drizzle(neon(url), { schema });
  }
  return cachedDb;
}
