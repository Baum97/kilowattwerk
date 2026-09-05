import { bootstrapApplication } from '@angular/platform-browser';
import { initBotId } from 'botid/client/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Muss vor dem Bootstrap laufen: BotID haengt die Pruefheader nur an Requests
// auf die hier gelisteten Pfade. Fehlt ein Pfad, schlaegt checkBotId() serverseitig fehl.
initBotId({
  protect: [{ path: '/api/contact', method: 'POST' }],
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
