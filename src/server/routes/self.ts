import {
  Request,
  Response,
  Router,
} from 'express';
import ModmailServer from '../server';
import Route from './route';
import { RequestWithSession } from '../../common/models/types';


export default class SelfRoute extends Route {
  constructor(mm: ModmailServer) {
    const router = Router();
    super(mm, 'self', router);
  }

  public getRouter(): Router {
    this.router.get('/', this.root.bind(this));

    return this.router;
  }

  private async root(req: RequestWithSession, res: Response) {
    let { user } = req.session;

    if (!user) {
      res.status(403);
      res.end();
      return;
    }

    try {
      // @ts-ignore
      delete user.token
      console.log(user);
      res.json(user);
    } catch (err) {
      // TODO: proper logger
      console.error(err);
      res.status(403);
    } finally {
      res.end();
    }
  }
}
