import { Response, Router } from 'express';
import { CategoryResolvable } from 'modmail-database';
import { RequestWithSession } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { Message } from 'modmail-types';

export default class ThreadsRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    this.router.get('/:categoryID/threads', this.getThreads.bind(this));
    this.router.get('/:categoryID/:threadID', this.getThread.bind(this));
    return this.router;
  }

  /**
   * GET /categories/:categoryID/:threadID -> Thread
   * @param {RequestWithSession} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  private async getThread(
    req: RequestWithSession,
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
}
