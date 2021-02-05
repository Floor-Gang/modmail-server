import {
  Router,
  Request,
  Response,
} from 'express';
import got from 'got/dist/source';
import { Guild, RequestWithUser, User } from '../../common/models/types';
import ModmailServer from '../../server';
import Route from './route';

export interface OAuthData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export default class OAuthRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'oauth', router);
  }

  public getRouter(): Router {
    this.router.get('/api/oauth', this.root.bind(this));
    this.router.get('/api/oauth/callback', this.callback.bind(this));

    return this.router;
  }

  private async root(req: Request, res: Response): Promise<void> {
    const client = this.modmail.getOAuth();
    const redirect = client.code.getUri();

    res.redirect(redirect);
  }

  private async callback(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    const { code } = req.query;

    if (!code) {
      res.status(400);
      res.end();
      return;
    }

    try {
      const client = this.modmail.getOAuth();
      const user = await client.code.getToken(req.url);
      const userRes = await got(
        'https://discord.com/api/v8/users/@me',
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      // TODO: add caching
      const guildRes = await got(
        'https://discord.com/api/v8/users/@me/guilds',
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          }
        }
      );
      const guildData: Guild[] = JSON.parse(guildRes.body);
      const userData: User = JSON.parse(userRes.body);

      req.session.guildIDs = guildData.map((guild) => guild.id);
      req.session.user = {
        ...userData,
        token: user.accessToken,
      };
      // TODO: Add proper logger
      req.session.save(console.error);
      res.redirect('/');
    } catch (e) {
      this.failError(res, e);
    } finally {
      res.end();
    }
  }
}
