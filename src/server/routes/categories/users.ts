import { Response, Router } from 'express';
import { RequestWithCategory } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { UserState } from '@Floor-Gang/modmail-types';

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
}
