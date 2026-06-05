declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      roleId: number;
      roleName: string;
      employeeId: number | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
