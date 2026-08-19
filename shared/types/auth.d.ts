declare module "#auth-utils" {
  interface User {
    username: string;
    role: "user";
  }

  interface UserSession {
    // 简化，不再需要时间戳字段
  }
}

export {};
