import { CommandoClient } from 'discord.js-commando';
import path from 'path';
import config from '../config.json';
import { addUncachedMessageReactionHandler } from './helper/reaction';
import permissions from './helper/permissions';

var myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);

if(config.tokens)
  config.tokens.forEach(startClient);
else
  startClient(config.token);

function startClient(token: string) {
  token = token.trim();
  if(!token)
    return;
  const client = new CommandoClient({
      commandPrefix: config.prefix,
      owner: config.owners
  });

  client.once('ready', async () => {
      if (!client.user) return;
      console.log(`Ready! Logged in as ${client.user.username}#${client.user.discriminator}.`);

      console.log(await client.generateInvite(permissions));
      addUncachedMessageReactionHandler(client);
      client.user.setPresence({ activity: { name: '-help', type:'LISTENING' }});
  });

  client.registry
      .registerGroups([
          ['gw', 'Guild Wars-related commands']
      ])
      .registerDefaultTypes()
      .registerDefaultGroups()
      .registerDefaultCommands({
          eval: false,
          unknownCommand: false,
          commandState: false
      })
      .registerCommandsIn({
          dirname: path.join(__dirname, 'commands'),
          filter: /(.+)\.(js|ts)$/,
      });

  // Bot token should always be placed in config.json and never committed to repo
  console.log("Bot token is "+token);
  client.login(token);

  setInterval(function() {
    try {
      if (global.gc) {global.gc();}
    } catch(e) { }
  },60000);

}
