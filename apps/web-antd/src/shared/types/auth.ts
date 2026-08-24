export type SessionUser = {
  role: "user";
  username: string;
};

export type SessionResponse = {
  loggedIn: boolean;
  user: null | SessionUser;
};
