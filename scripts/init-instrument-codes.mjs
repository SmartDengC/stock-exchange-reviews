// 初始化证券代码选项
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.NUXT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("缺少数据库 URL 配置");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  console.log("开始插入证券代码选项...");

  const codes = [
    { code: "MUUSDT", order: 10 },
    { code: "SKHYNIXUSDT", order: 20 },
    { code: "BTCUSDT", order: 30 },
    { code: "ETHUSDT", order: 40 },
    { code: "510300", order: 50 },
    { code: "518880", order: 60 },
    { code: "399006", order: 70 },
    { code: "159316", order: 80 },
  ];

  try {
    for (const { code, order } of codes) {
      await sql`
        INSERT INTO trading_options (kind, label, sort_order)
        VALUES ('instrument_code', ${code}, ${order})
        ON CONFLICT (kind, label) DO NOTHING
      `;
      console.log(`✓ 已插入：${code}`);
    }

    console.log("\n完成！证券代码选项已初始化。");

    // 验证插入结果
    const result = await sql`
      SELECT label, sort_order 
      FROM trading_options 
      WHERE kind = 'instrument_code' 
      ORDER BY sort_order
    `;

    console.log("\n当前数据库中的证券代码:");
    result.forEach((row) =>
      console.log(`  - ${row.label} (排序：${row.sort_order})`)
    );
  } catch (error) {
    console.error("插入失败:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
