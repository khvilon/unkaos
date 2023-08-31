import axios from 'axios';
import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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
let metaFileUrl = 'https://raw.githubusercontent.com/khvilon/unkaos/dev/meta.json'

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
  return
  exec('docker-compose down');
  exec('git pull');
  const migrationFiles = fs.readdirSync('./migrations').filter(file => {
    const version = path.basename(file, '.sql').split('_')[0];
    return version > currentVersion;
  });
  migrationFiles.forEach(file => exec(`mysql < ./migrations/${file}`));
  exec('docker-compose up');
  currentVersion = newVersion;
}

async function checkLastVersion(): Promise<any> {
    try {
      const response = await axios.get(metaFileUrl);
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
