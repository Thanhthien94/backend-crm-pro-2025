import { IApiKey } from '../models/ApiKey';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      apiKey?: IApiKey;
    }
  }
}