import { JwtPayload } from './common/decorators/current-user.decorator';

declare global {
  namespace Express {
    interface User extends JwtPayload {
      id: string;
      name: string | null;
      avatar: string | null;
    }
  }
}

export {};
