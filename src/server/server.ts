import ClientOAuth2 from 'client-oauth2';
import express, {
  Application,
  NextFunction,
  Response,
} from 'express';
import OAuthRoute from './routes/oauth';
import session from 'express-session';
import SelfRoute from './routes/self';
import CategoriesRoute from './routes/categories';
import { DatabaseManager } from 'modmail-database';
import { PoolConfig } from 'pg';
import { RequestWithSession } from '../common/models/types';
import { TEMP_WHITELIST } from '../globals';
import Config from '../common/config';

export default class ModmailServer {
  private readonly app: Application;

  private readonly oauth: ClientOAuth2;

  private static db: DatabaseManager | null = null;

  constructor(config: ClientOAuth2.Options) {
    this.app = express();
    this.oauth = new ClientOAuth2(config);
  }

  /**
   * This method must be called before all else can happen
   * @param {PoolConfig} config For the database
   * @param {number} port Port to listen on for the express server
   */
  public async start(config: Config) {
    ModmailServer.db = await DatabaseManager.getDB(config.database);
    const oauth = new OAuthRoute(this);
    const categories = new CategoriesRoute(this);
    const self = new SelfRoute(this);

    this.app.use(session({
      secret: config.sesPrivateKey,
      cookie: {
        secure: false,
      },
    }));
    this.app.use('/', oauth.getRouter());

    this.app.use('/api/self', this.authenticate.bind(this));
    this.app.use('/api/self', self.getRouter());

    this.app.use('/api/categories', this.authenticate.bind(this));
    this.app.use('/api/categories', categories.getRouter());

    this.app.listen(
      config.port,
      // TODO: proper logger
      () => console.debug(`Started listening on port ${config.port}`),
    );
  }

  /**
   * Check if they're logged in & attach their user data to the req object
   * @param {RequestWithSession} req
   * @param {Response} res
   * @returns {Promise<void>}
   */
  public authenticate(
    req: RequestWithSession,
    res: Response,
    next: NextFunction,
  ) {
    const { user } = req.session;

    console.debug(`Authentication ${user ? user.id : 'unknown'}`);
    console.debug(req.session);

    if (user === undefined || !TEMP_WHITELIST.includes(user.id)) {
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
}
