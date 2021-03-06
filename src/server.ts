import ClientOAuth2 from 'client-oauth2';
import express, {
  Application,
  NextFunction,
  Response,
} from 'express';
import OAuthRoute from './server/routes/oauth';
import session from 'express-session';
import SelfRoute from './server/routes/self';
import CategoriesRoute from './server/routes/categories';
import { DatabaseManager } from '@Floor-Gang/modmail-database';
import { RequestWithUser } from './common/models/types';
import Config from './common/config';
import BotController from './bot';
import { Message, Thread, UserState, UserStateCache } from '@Floor-Gang/modmail-types';
import LogoutRoute from './server/routes/logout';

export default class ModmailServer {
  private readonly bot: BotController;

  private readonly app: Application;

  private readonly oauth: ClientOAuth2;

  private readonly config: Config;

  private static db: DatabaseManager | null = null;

  constructor(config: Config) {
    this.app = express();
    this.bot = new BotController(config.modmail);
    this.oauth = new ClientOAuth2(config.oauth);
    this.config = config;
  }

  /**
   * This method must be called before all else can happen
   */
  public async start() {
    ModmailServer.db = await DatabaseManager.getDB(this.config.database);
    const oauth = new OAuthRoute(this);
    const categories = new CategoriesRoute(this);
    const self = new SelfRoute(this);
    const logout = new LogoutRoute(this);

    this.app.use(session({
      secret: this.config.sesPrivateKey,
      cookie: {
        secure: false,
      },
    }));
    this.app.use('/', oauth.getRouter());

    this.app.use('/api/logout', logout.getRouter());
    this.app.use('/api/self', this.authenticate.bind(this));
    this.app.use('/api/self', self.getRouter());

    this.app.use('/api/categories', this.authenticate.bind(this));
    this.app.use('/api/categories', categories.getRouter());

    this.app.listen(
      this.config.port,
      // TODO: proper logger
      () => console.debug(`Started listening on port ${this.config.port}`),
    );
  }

  /**
   * Check if they're logged in & attach their user data to the req object
   * @param {RequestWithUser} req
   * @param {Response} res
   * @param next
   * @returns {Promise<void>}
   */
  public authenticate(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    const { user } = req.session;

    if (user === undefined) {
      res.status(401);
      res.end();
      return;
    }
    next();
  }

  public getOAuth(): ClientOAuth2 {
    return this.oauth;
  }

  public getDB(): DatabaseManager {
    if (ModmailServer.db !== null) {
      return ModmailServer.db;
    }
    throw new Error('getDB was called before starting ModmailServer');
  }

  public async getUserCache(targets: Iterator<string>): Promise<UserStateCache> {
    const bot = this.getBot();
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

  public async getLastMessages(threads: Thread[]): Promise<Thread[]> {
    const msgTasks: Promise<Message | null>[] = [];
    const pool = this.getDB();

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const task = pool.messages.fetchLast(thread.id);
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

  public getBot(): BotController {
    return this.bot;
  }
}
