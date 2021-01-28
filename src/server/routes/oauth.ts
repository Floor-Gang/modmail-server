import {
  Router,
  Request,
  Response,
} from 'express';
import { RequestWithSession, User } from '../../common/models/types';
import ModmailServer from '../server';
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
    this.router.get('/oauth', this.root.bind(this));
    this.router.get('/oauth/callback', this.callback.bind(this));

    return this.router;
  }

  private async root(req: Request, res: Response): Promise<void> {
    const client = this.modmail.getOAuth();
    const redirect = client.code.getUri();

    res.redirect(redirect);
  }

  private async callback(
    req: RequestWithSession,
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
      const data = user.data;

      req.session.user = {
        avatar: data.avatar,
        bot: Boolean(data.bot),
        discriminator: data.discriminator,
        id: data.id,
        username: data.username,
        token: user.accessToken,
      };
      // TODO: Add proper logger
      req.session.save(console.error);

      res.redirect('/');
    } finally {
      res.status(200);
      res.end();
    }
  }
}
