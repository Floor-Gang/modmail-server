import ClientOAuth2 from 'client-oauth2';
import express, {
  Application,
} from 'express';
import OAuthRoute, { OAuthData } from './routes/oauth';
import session from 'express-session';
import SelfRoute from './routes/self';


export default class ModmailServer {
  private readonly app: Application;

  private readonly oauth: ClientOAuth2;

  constructor(config: ClientOAuth2.Options) {
    this.app = express();
    this.oauth = new ClientOAuth2(config);
  }

  public async start(port: number) {
    const oauth = new OAuthRoute(this);
    const self = new SelfRoute(this);

    this.app.use(session({
      secret: 'qwerty',
      cookie: {
        secure: false,
      },
    }));
    this.app.use('/api/', oauth.getRouter());
    this.app.use('/api/self', self.getRouter());

    this.app.listen(port);
  }

  public getOAuth(): ClientOAuth2 {
    return this.oauth;
  }
}
