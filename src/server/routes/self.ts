import {
  Request,
  Response,
  Router,
} from 'express';
import ModmailServer from '../server';
import Route from './route';
import got from 'got';
import { OAuthData } from './oauth';


export default class SelfRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'self', router);
  }

  public getRouter(): Router {
    this.router.get('/', this.root.bind(this));

    return this.router;
  }

  private async root(req: Request, res: Response) {
    // @ts-ignore
    const optUser = req.session.user;

    if (!optUser) {
      res.send('you are nobody');
      res.end();
      return;
    }

    try {
      const user = optUser as OAuthData;
      const data = await got('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        }
      });
      console.log(data.body);
      res.json(JSON.parse(data.body));
    } catch (err) {
      console.error(err);
      res.send('you are nobody');
    } finally {
      res.end();
    }

  }
}
