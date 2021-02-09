import { Response, Router } from 'express';
import { CategoryResolvable } from '@Floor-Gang/modmail-database';
import { RequestWithUser } from '../../../common/models/types';
import ModmailServer from '../../../server';
import Route from '../route';
import { 
  Category,
  Message,
  Thread,
  UserState,
  UserStateCache,
} from '@Floor-Gang/modmail-types';

export default class ThreadsRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'categories', router);
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * GET /categories/:categoryID/:threadID -> ThreadResponse
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

    const category = await this.getCat(req, res);

    if (category === null) {
      return;
    }

    const db = this.modmail.getDB();
    const bot = this.modmail.getBot();
    const thread = await db.threads.getByID(threadID);

    if (thread === null) {
      res.status(404);
      res.end();
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
   * @param {string} categoryID
   * @returns {Promise<void>}
   */
  public async getThreads(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    const { categoryID } = req.params;
    const db = this.modmail.getDB();
    const category = await this.getCat(req, res);

    if (category === null) {
      return;
    }

    let threads = await db.threads.getByCategory(categoryID);
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

    let user = targets.next();
    while (!user.done) {
      const task = bot.getUser(user.value);
      usrTasks.push(task);
      user = targets.next();
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

  private async getCat(
    req: RequestWithUser,
    res: Response,
  ): Promise<Category | null> {
    const { guildIDs } = req.session;
    const { categoryID } = req.params;

    if (guildIDs === undefined) {
      this.failUnknown(res);
      return null;
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
      return null;
    }

    return category;
  }
}
