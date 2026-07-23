import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashAdminPassword } from "../server/utils/admin-password.ts";

const prompt = createInterface({ input: stdin, output: stdout });

try {
  const password = await prompt.question("请输入至少 12 个字符的管理员密码：");
  const hash = await hashAdminPassword(password);
  stdout.write(`\n将以下值保存为 NUXT_ADMIN_PASSWORD_HASH：\n${hash}\n`);
} finally {
  prompt.close();
}
