import { AillameAuthContext } from './api-key.types';
import { AillameProjectContext } from './project.types';

declare global {
  namespace Express {
    interface Request {
      aillameAuth?: AillameAuthContext;
      aillameProject?: AillameProjectContext;
    }
  }
}
