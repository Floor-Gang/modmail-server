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
    this.router.get('/:categoryID/members', this.getMembers.bind(this));
    this.router.get('/:memberID', this.getMember.bind(this));
    return this.router;
  }

  private async getMember(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
    res.json({});
    res.end();
  }

  private async getMembers(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
    res.json({});
    res.end();
  }
}
