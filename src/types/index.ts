export type JwtUser = {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
};

export type AppBindings = {
  Variables: {
    user: JwtUser;
  };
};