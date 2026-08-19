// 执行数据库索引迁移
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("缺少数据库 URL 配置");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  console.log("开始创建复合索引 trades_date_entry_idx...");
  
  try {
    await sql`
      CREATE INDEX CONCURRENTLY "trades_date_entry_idx" 
      ON "trades" USING btree ("trade_date" DESC, "entry_at" DESC);
    `;
    
    console.log("✓ 索引创建成功！");
    
    // 验证索引
    const result = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = 'trades_date_entry_idx';
    `;
    
    if (result.length > 0) {
      console.log("\n索引信息:");
      console.log(result[0].indexdef);
    }
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("already exists")) {
      console.log("✓ 索引已存在，无需重复创建");
    } else {
      console.error("索引创建失败:", errMsg);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

main();
