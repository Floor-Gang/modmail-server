import { Response, Router } from 'express';
import { RequestWithCategory } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { Message, RoleLevel, UserState } from '@Floor-Gang/modmail-types';
import ThreadsRoute from './threads';

export default class UsersRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'users', router);
  }

  public async getUser(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { userID } = req.params;
    const bot = this.modmail.getBot();
    const user = await bot.getUser(userID);

    await this.sendState<UserState>(res, user);
  }

  public async getHistory(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { member } = req.session;

    if (member === undefined) {
      this.failUnknown(res);
      return;
    }

    const { categoryID, userID } = req.params;
    const pool = this.modmail.getDB();
    let threads = await pool.threads.history(userID, categoryID);

    threads = threads.filter((th) => {
      return (th.isAdminOnly && member.role === RoleLevel.Admin)
        || (!th.isAdminOnly);
    });
    threads = await ThreadsRoute.getLastMessages(pool, threads);

    res.json(threads);
    res.end();
  }
}
