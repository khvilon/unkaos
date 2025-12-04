/*
import express from 'express';
import bodyParser from 'body-parser';
import { gitlabConfig } from './config';
import { sql } from "./Sql";
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:gitlab');

class GitlabCommit {

  private app: express.Express

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.post(gitlabConfig.webhookUrl, this.handleCommit);
  }

  async handleCommit(req, res) {
    if (req.headers['x-gitlab-token'] !== gitlabConfig.token) {
      return res.status(401).send('Invalid token');
    }
    const commit = req.body;
    await this.logCommit(commit);
    return res.status(200).send('Commit data received');
  }

  async logCommit(commit: any) {
    logger.info({
      msg: 'New commit',
      id: commit.id,
      author: commit.author.name,
      email: commit.author.email,
      message: commit.message,
      date: commit.created_at
    });
  }

  listen(port) {
    this.app.listen(port);
  }
}

export default GitlabCommit;
*/
