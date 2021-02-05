import { Response, Router } from 'express';
import { RequestWithSession } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';

export default class MembersRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    return this.router;
  }

  public async getMember(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
  }

  public async getMembers(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {

  }
}
