import { Router } from 'express';
import ModmailServer from '../server';

export default class Route {
  protected readonly name: string;

  protected readonly modmail: ModmailServer;

  protected readonly router: Router;

  constructor(mm: ModmailServer, name: string, router: Router) {
    this.name = name;
    this.modmail = mm;
    this.router = router;
  }

  public getRouter(): Router {
    return this.router;
  }
}
