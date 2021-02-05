import { Response, Router } from 'express';
import { RequestWithCategory, RequestWithUser } from '../../../common/models/types';
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
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { memberID } = req.params;
    const { category } = req.session;

    if (category === undefined) {
      this.failBadReq(res);
      return;
    }

    try {
      const bot = this.modmail.getBot();
      const member = await bot.getMember(category.guildID, memberID);

      res.json(member);
      res.end();
    } catch (e) {
      this.failBadReq(res, e);
    }
  }

  public async getMembers(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { category } = req.session;

    if (category === undefined) {
      this.failBadReq(res);
      return;
    }

    try {
      const bot = this.modmail.getBot();
      const members = await bot.getMembers(category.guildID);

      res.json(members);
      res.end();
    } catch (e) {
      this.failBadReq(res, e);
    }
  }
}
