export interface User {
  id: number;
  username: string;
  role: "admin" | "teknik";
  name: string;
  password: string;
}
