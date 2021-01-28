import ModmailServer from '../server';
import { Guild, RequestWithSession } from '../../common/models/types';
import { Category } from 'modmail-types';
import Route from './route';
import {
  NextFunction,
  Response,
  Router,
} from 'express';
import got from 'got/dist/source';
import { CategoryResolvable } from 'modmail-database';

export default class CategoriesRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    this.router.use('/', this.getGuilds.bind(this));
    this.router.get('/', this.getCategories.bind(this));
    this.router.get('/:categoryID/threads', this.getThreads.bind(this));
    this.router.get(
      '/:categoryID}/threads/:threadID',
      this.getThread.bind(this),
    );
    return this.router;
  }

  /**
   * Middle ware for getting a user's guilds
   */
  private async getGuilds(
    req: RequestWithSession,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { user } = req.session;

    if (user === undefined) {
      this.failUnknown(res);
      return;
    }

    try {
      const gotRes = await got(
        'https://discord.com/api/v8/users/@me/guild',
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        }
      );
      const data: Guild[] = JSON.parse(gotRes.body);
      req.session.guilds = data;
      // TODO: add proper logger
      req.session.save(console.error);
      next();
    } catch (e) {
      this.failError(res, e);
    }
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
    const { guilds } = req.session;

    if (guilds === undefined) {
      this.failUnknown(res);
      return;
    }

    const db = this.modmail.getDB();
    const fetchTasks: Promise<Category | null>[] = [];

    for (let i = 0; i < guilds.length; i++) {
      const guild = guilds[i];
      const fetchTask = db.categories.fetch(
        CategoryResolvable.guild,
        guild.id
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

  /**
   * GET /api/categories/{category ID} -> Thread[]
   * @param {RequestWithSession} req
   * @param {Response} res
   * @param {string} categoryID
   * @returns {Promise<void>}
   */
  private async getThreads(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
    const { guilds } = req.session;
    const { categoryID } = req.params;

    if (guilds === undefined) {
      this.failUnknown(res);
      return;
    }

    const guildIDs = guilds.map((g) => g.id);
    const db = this.modmail.getDB();
    const category = await db.categories.fetch(
      CategoryResolvable.id,
      categoryID,
    );

    if (category === null || !guildIDs.includes(category.guildID)) {
      this.failBadReq(
        res,
        "The category requested doesn't exist or the user isn't in it",
      );
      return;
    }

    const resData = await db.threads.getByCategory(categoryID);
    res.json(resData);
    res.end();
  }

  /**
   * GET /categories/{category ID}/{thread ID} -> Thread
   * @param {RequestWithSession} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  private async getThread(
    req: RequestWithSession,
    res: Response,
  ): Promise<void> {
    const { categoryID } = req.params;
    const { threadID } = req.params;
    const { guilds } = req.session;

    if (guilds === undefined) {
      this.failUnknown(res);
      return;
    }

    const db = this.modmail.getDB();
    const guildIDs = guilds.map((g) => g.id);
    const category = await db.categories.fetch(
      CategoryResolvable.id,
      categoryID,
    );

    if (category === null || !guildIDs.includes(category.guildID)) {
      this.failBadReq(
        res,
        "The category requested doesn't exist or the user isn't in it",
      );
      return;
    }
    const resData = await db.threads.getByID(threadID);

    if (resData !== null) {
      res.json(resData);
      res.end();
      return;
    }
    res.status(404);
    res.end();
  }
}
