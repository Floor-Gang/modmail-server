import { Response, Router } from 'express';
import { RequestWithCategory } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';

export default class UsersRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public async getUser(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { userID } = req.params;

    try {
      const bot = this.modmail.getBot();
      const user = await bot.getUser(userID);

      res.json(user);
      res.end();
    } catch (e) {
      this.failError(res, e);
    }
  }
}
