import axios from 'axios';
import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

// Configuration
const app = express();
const port = 5011;
const config = {
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '600000'),
  allowedUpdateFrom: process.env.ALLOWED_UPDATE_FROM || '00:00',
  allowedUpdateTo: process.env.ALLOWED_UPDATE_TO || '23:59',
  autoUpdate: process.env.AUTO_UPDATE === 'true',
};

// State
let currentVersion = readCurrentVersion();
let newVersion: string;
const metaFileUrl = 'https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json'
const ymlPath = '../../docker-compose.yml'

interface DockerCompose {
    services?: { [key: string]: any };
}

// Utility Functions
function readCurrentVersion(): string {
  const meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../meta.json'), 'utf8'));
  return meta.version;
}

function isTimeAllowed(): boolean {
  const now = new Date();
  const currentTime = `${now.getHours()}:${now.getMinutes()}`;
  return currentTime >= config.allowedUpdateFrom && currentTime <= config.allowedUpdateTo;
}

async function performUpdate(newVersion: string): Promise<void> {
  console.log('Performing update...');

  /*
  // Read docker-compose.yml and get service names
  const doc = yaml.load(fs.readFileSync(ymlPath, 'utf8')) as DockerCompose;
  const services = Object.keys(doc.services || {}).filter(service => service !== 'eos');

  // Stop services
  exec(`docker-compose stop ${services.join(' ')}`);

  // Pull the latest code and restart services
  exec('git pull');*/

  // Run SQL migrations
  const migrationFiles = fs.readdirSync('./migrations').filter(file => {
    const version = path.basename(file, '.sql').split('_')[0];
    return version > currentVersion;
  });

  console.log('mf', migrationFiles)

  //migrationFiles.forEach(file => exec(`mysql < ./migrations/${file}`));

  /*
  // Start all services
  exec(`docker-compose up -d ${services.join(' ')}`);
  
  currentVersion = newVersion;

  // Rebuild and restart the current service ('eos' in this case)
  exec('nohup sh -c "docker-compose build eos && docker-compose up -d eos" &');
  */
}

async function checkLastVersion(): Promise<any> {
    try {
      const response = await axios.get(`${metaFileUrl}?nocache=${new Date().getTime()}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      console.log(response.data)
      newVersion = response.data.version;
      if (newVersion !== currentVersion) {
        console.log(`New version ${newVersion} available.`);
        return {
            version: newVersion,
            message: `New version ${newVersion} available. current version is ${currentVersion}`,
            new: true
        }
      }
      else{
        return {
            version: currentVersion,
            message: `You version is up to date`,
            new: false
        }
      }
    } catch (error) {
      console.error('Failed to check git:', error);
      return null;
    }
  }

async function auto(): Promise<void> {
    if (!config.autoUpdate) return;
    if(!isTimeAllowed()) return;

    let result = await checkLastVersion();
    if (result.new) {
        performUpdate(result.version);
    }
}

// REST API Endpoints
app.get('/check', async (_, res) => {
  let result = await checkLastVersion();
  res.send(result);
});

app.get('/update', async (_, res) => {
    let result = await checkLastVersion();
    if (result.new) {
        await performUpdate(result.version);
    }
    res.send(result);
});

// Initialization
app.listen(port, () => console.log(`Server running on port ${port}`));
setInterval(auto, config.checkInterval);
