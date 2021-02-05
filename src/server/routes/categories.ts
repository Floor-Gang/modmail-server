import ModmailServer from '../../server';
import MembersRoute from './categories/members';
import ThreadsRoute from './categories/threads';
import { RequestWithSession } from '../../common/models/types';
import { Category, Message } from 'modmail-types';
import Route from './route';
import {
  NextFunction,
  Response,
  Router,
} from 'express';
import { CategoryResolvable } from 'modmail-database';
import { userInfo } from 'os';

export default class CategoriesRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    const members = new MembersRoute(this.modmail);
    const threads = new ThreadsRoute(this.modmail);

    this.router.get('/', this.getCategories.bind(this));
    this.router.use('/:categoryID', this.authenticate.bind(this));
    this.router.use('/:categoryID/members', members.getRouter());
    this.router.get('/:categoryID/threads', threads.getRouter());
    return this.router;
  }

  private async authenticate(
    req: RequestWithSession,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.session.user === undefined) {
      // TODO: add proper logger
      console.error('How did we get here?');
      this.failUnknown(res);
      return;
    }

    const { categoryID } = req.params;
    const bot = this.modmail.getBot();
    const pool = this.modmail.getDB();
    const cat = await pool.categories.fetch(
      CategoryResolvable.id,
      categoryID,
    );

    if (cat === null) {
      this.failBadReq(res, "This category ID doesn't exist");
      return;
    }
    const member = await bot.getMember(
      cat.guildID,
      req.session.user.id,
    );

    if (member.role !== 'mod' && member.role !== 'admin') {
      res.status(401);
      res.end();
      return;
    }

    next();
  }

  /**
   * GET /categories -> Category[]
   * @param {RequestWithSession} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  private async getCategories(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
    const { guildIDs } = req.session;

    if (guildIDs === undefined) {
      this.failUnknown(res);
      return;
    }

    const db = this.modmail.getDB();
    const fetchTasks: Promise<Category | null>[] = [];

    for (let i = 0; i < guildIDs.length; i++) {
      const guildID = guildIDs[i];
      const fetchTask = db.categories.fetch(
        CategoryResolvable.guild,
        guildID,
      );
      fetchTasks.push(fetchTask);
    }

    const categories = await Promise.all(fetchTasks);
    const resData: Category[] = [];
    categories.forEach((data) => {
      if (data !== null) {
        resData.push(data);
      }
    });

    res.json(resData);
    res.end();
  }
}
