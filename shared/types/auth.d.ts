declare module "#auth-utils" {
  interface User {
    name: string;
    role: "admin";
  }

  interface UserSession {
    expiresAt: string;
    loggedInAt: string;
  }
}

export {};
