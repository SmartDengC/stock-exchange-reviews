declare module "#auth-utils" {
  interface User {
    name: string;
    role: "admin";
  }

  interface UserSession {
    expiresAt: string;
    lastActivityAt: string;
    loggedInAt: string;
  }
}

export {};
