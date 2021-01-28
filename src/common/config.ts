import fs from 'fs';
import { load } from 'js-yaml';

export type OAuthConfig = {
  readonly accessTokenUri: string;

  readonly authorizationUri: string;

  readonly redirectUri: string;

  readonly clientId: string;

  readonly clientSecret: string;

  readonly scopes: string[];
}

export type DBConfig = {
  readonly username: string;
  readonly password: string;
  readonly address: string;
  readonly port: number;
  readonly database: string;
}

export default class Config {
  public readonly oauth: OAuthConfig;

  public readonly database: DBConfig;

  public readonly port: number;

  private static LOCATION = './config.yml';

  constructor() {
    this.port = 80;
    this.oauth = {
      accessTokenUri: 'https://discord.com/api/oauth2/token',
      authorizationUri: 'https://discord.com/api/oauth2/authorize',
      redirectUri: 'http://127.0.0.1/oauth/callback',
      clientId: '',
      clientSecret: '',
      scopes: [''],
    };
    this.database = {
      username: '',
      password: '',
      address: '',
      port: 5432,
      database: 'postgres',
    }
  }

  /**
   * Call getConfig instead of constructor
   */
  public static getConfig(): Config {
    if (!fs.existsSync(Config.LOCATION)) {
      throw new Error('Please create a config.yml');
    }
    const fileContents = fs.readFileSync(
      Config.LOCATION,
      'utf-8',
    );
    const casted = load(fileContents) as Config;

    return casted;
  }
}
