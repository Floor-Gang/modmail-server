import { Response, Router } from 'express';
import { RequestWithCategory, RequestWithUser } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { Message, RoleLevel, Thread, UserState, UserStateCache, } from '@Floor-Gang/modmail-types';

export default class ThreadsRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'threads', router);
  }

  /**
   * GET /categories/:categoryID/:threadID -> ThreadResponse
   * @param {RequestWithUser} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  public async getThread(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { category } = req.session;
    const { member } = req.session;
    const { threadID } = req.params;
    if (member === undefined || category === undefined) {
      res.status(500);
      res.end();
      return;
    }

    if (category === null) {
      return;
    }

    const db = this.modmail.getDB();
    const thread = await db.threads.getByID(threadID);

    if (thread === null) {
      res.status(404);
      res.end();
      return;
    }

    if (thread.isAdminOnly && member.role !== RoleLevel.Admin) {
      this.failBadReq(res, 'Not an admin');
      return;
    }

    thread.messages = await db.messages.fetchAll(threadID);

    // get user cache
    const targets = new Set<string>();

    for (let i = 0; i < thread.messages.length; ++i) {
      const msg = thread.messages[i];

      targets.add(msg.sender);
    }

    const users = await this.getUserCache(targets.values());

    res.json({
      ...thread,
      users,
    });
    res.end();
  }

  /**
   * GET /api/categories/:categoryID -> ThreadsResponse
   * @param {RequestWithUser} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  public async getThreads(
    req: RequestWithCategory,
    res: Response,
  ): Promise<void> {
    const { category } = req.session;
    const { member } = req.session;
    if (category === undefined || member === undefined) {
      res.status(500);
      res.end();
      return;
    }

    const db = this.modmail.getDB();

    let threads = await db.threads.getByCategory(category.id);
    threads = threads.filter((thr) => {
      return (thr.isAdminOnly && member.role === RoleLevel.Admin)
        || (!thr.isAdminOnly);
    })
    threads = await this.getLastMessages(threads);
    let targets = new Set<string>();

    // get user cache
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      targets.add(thread.author.id);

      // get last message author
      if (thread.messages.length > 0) {
        const message = thread.messages[0];
        targets.add(message.sender);
      }
    }

    let users = await this.getUserCache(targets.values());

    res.json({
      threads,
      users,
    });
    res.end();
  }

  private async getUserCache(targets: Iterator<string>): Promise<UserStateCache> {
    const bot = this.modmail.getBot();
    const usrTasks: Promise<UserState | null>[] = [];

    let userID = targets.next();
    while (!userID.done) {
      const task = bot.getUser(userID.value, true);
      usrTasks.push(task);
      userID = targets.next();
    }

    const users = await Promise.all(usrTasks);
    let res: UserStateCache = {};

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (user !== null) {
        res[user.id] = user;
      }
    }

    return res;
  }

  private async getLastMessages(threads: Thread[]): Promise<Thread[]> {
    const db = this.modmail.getDB();
    const msgTasks: Promise<Message | null>[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const task = db.messages.fetchLast(thread.id);
      msgTasks.push(task);
    }

    const msgs = await Promise.all(msgTasks);

    for (let i = 0; i < threads.length; i++) {
      const msg = msgs[i];
      if (msg !== null) {
        threads[i].messages.push(msg);
      }
    }

    return threads;
  }
}
