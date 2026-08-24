export type SessionUser = {
  username: string;
  role: "user";
};

export type SessionResponse = {
  loggedIn: boolean;
  user: SessionUser | null;
};
