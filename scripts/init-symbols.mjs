// 初始化标的选项
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
  console.log("开始插入标的选项...");

  const symbols = [
    { name: "MUUSDT", order: 10 },
    { name: "SKHYNIXUSDT", order: 20 },
    { name: "比特币", order: 30 },
    { name: "以太坊", order: 40 },
    { name: "沪深300", order: 50 },
    { name: "5G通信", order: 60 },
    { name: "创业板指", order: 70 },
    { name: "华夏创新药ETF", order: 80 },
  ];

  try {
    for (const { name, order } of symbols) {
      await sql`
        INSERT INTO trading_options (kind, label, sort_order)
        VALUES ('symbol', ${name}, ${order})
        ON CONFLICT (kind, label) DO NOTHING
      `;
      console.log(`✓ 已插入：${name}`);
    }

    console.log("\n完成！标的选项已初始化。");

    // 验证插入结果
    const result = await sql`
      SELECT label, sort_order 
      FROM trading_options 
      WHERE kind = 'symbol' 
      ORDER BY sort_order
    `;

    console.log("\n当前数据库中的标的:");
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
