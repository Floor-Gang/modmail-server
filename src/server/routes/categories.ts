import ModmailServer from '../server';
import { Guild, RequestWithSession } from '../../common/models/types';
import { Category, Message } from 'modmail-types';
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
    this.router.get('/', this.getCategories.bind(this));
    this.router.get('/:categoryID/threads', this.getThreads.bind(this));
    this.router.get(
      '/:categoryID/threads/:threadID',
      this.getThread.bind(this),
    );
    return this.router;
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
    const { guildIDs } = req.session;
    const { categoryID } = req.params;

    if (guildIDs === undefined) {
      this.failUnknown(res);
      return;
    }

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
    const msgTasks: Promise<Message[]>[] = [];

    for (let i = 0; i < resData.length; i++) {
      const thread = resData[i];
      const task = db.messages.fetchAll(thread.id);
      msgTasks.push(task);
      task.then((msgs: Message[]) => resData[i].messages = msgs);
    }

    await Promise.all(msgTasks);

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
    const { guildIDs } = req.session;

    if (guildIDs === undefined) {
      this.failUnknown(res);
      return;
    }

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
    const resData = await db.threads.getByID(threadID);

    if (resData !== null) {
      resData.messages = await db.messages.fetchAll(threadID);
      res.json(resData);
      res.end();
      return;
    }
    res.status(404);
    res.end();
  }
}
