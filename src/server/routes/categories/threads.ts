import { Response, Router } from 'express';
import { CategoryResolvable } from '@Floor-Gang/modmail-database';
import { RequestWithUser } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { Message } from '@Floor-Gang/modmail-types';

export default class ThreadsRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * GET /categories/:categoryID/:threadID -> Thread
   * @param {RequestWithUser} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  public async getThread(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    const { categoryID, threadID } = req.params;
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

  /**
   * GET /api/categories/:categoryID -> Thread[]
   * @param {RequestWithUser} req
   * @param {Response} res
   * @param {string} categoryID
   * @returns {Promise<void>}
   */
  public async getThreads(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    console.log('test');
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
    const msgTasks: Promise<Message | null>[] = [];

    for (let i = 0; i < resData.length; i++) {
      const thread = resData[i];
      const task = db.messages.fetchLast(thread.id);
      msgTasks.push(task);
    }

    const msgs = await Promise.all(msgTasks);

    for (let i = 0; i < resData.length; i++) {
      const msg = msgs[i];
      if (msg !== null) {
        resData[i].messages.push(msg);
      }
    }

    res.json(resData);
    res.end();
  }
}
