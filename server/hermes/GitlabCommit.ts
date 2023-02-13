/*
import express from 'express';
import bodyParser from 'body-parser';
import { gitlabConfig } from './config';


class GitlabCommit {

  private app: express.Express

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.post(gitlabConfig.webhookUrl, this.handleCommit);
  }

  handleCommit(req, res) {
    if (req.headers['x-gitlab-token'] !== gitlabConfig.token) {
      return res.status(401).send('Invalid token');
    }
    const commit = req.body;
    console.log(`Commit data for ${commit.id}`);
    console.log(`SHA: ${commit.id}`);
    console.log(`Author: ${commit.author.name}`);
    console.log(`Author email: ${commit.author.email}`);
    console.log(`Message: ${commit.message}`);
    console.log(`Date: ${commit.created_at}`);
    return res.status(200).send('Commit data received');
  }

  listen(port) {
    this.app.listen(port);
  }
}

export default GitlabCommit;
*/
