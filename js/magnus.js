// Third party imports
const { Client, Events, GatewayIntentBits, Collection, Embed } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

// Local imports
const Utils = require("./utils");
const MSG = require("../json/messages.json");
const config = require("../json/config.json");
const discordToken = require("../json/secrets.json").discord.auth.token;

// Setup command handlers
const _COMMANDS_LIST = [
  // For help, we want to import all the other commands to list them here.
  require("./commands/chill"),
  require("./commands/cointoss"),
  require("./commands/memeCreate"),
  require("./commands/memeList"),
  require("./commands/help"),
  require("./commands/movie"),
  require("./commands/series"),
  require("./commands/music"),
  require("./commands/random"),
  require("./commands/speak"),
  require("./commands/stop"),
  require("./commands/embed"),
];
const COMMAND_HANDLERS = {};
for (let _command of _COMMANDS_LIST) {
  // Add handler to point to the Command object/export based on name
  // and all aliases for the command
  COMMAND_HANDLERS[_command.name] = _command;
  for (let alias of _command.aliases) {
    COMMAND_HANDLERS[alias] = _command;
  }
}
// console.log(COMMAND_HANDLERS);

// // Slash Commands

// Main function
function main() {
  Utils.log(MSG.MAGNUS_INIT);
  const client = new Client({ 
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });
  
  client.on("clientReady", onReady.bind(null, client));
  client.on("messageCreate", onMessage);

  // Log Magnus into the discord
  client.login(discordToken);

  registerSlashCommands(client);   
}

// Register slash commands
function registerSlashCommands(client) {
  client.commands = new Collection();

  const foldersPath = path.join(__dirname, './commands/utility');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`Registering command: ${command.data.name}`)
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    try {
      console.log(`handling slash command ${interaction.commandName}`)
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      }
    }
  });
}

// Function that runs after Magnus is initialized
// and is logged into Discord
function onReady(client) {
  Utils.log(MSG.MAGNUS_ONLINE, { user: client.user.tag });
}

// Function that cleans a message to be sent to an appropriate handler function
function onMessage(message) {
  // Get up to first space in message
  const end = message.content.indexOf(" ");
  const messagePrefix = message.content.slice(0, end === -1 ? undefined : end);

  // Check if the first characters up to the command prefix are in fact the command prefix.
  if (
    messagePrefix.slice(0, config.commandPrefix.length) === config.commandPrefix
  ) {
    // if so, remove the prefix and get the actual command issued to us
    const command = messagePrefix
      .slice(config.commandPrefix.length)
      .toLowerCase();

    // If we have a handler defined, execute it with the message and reply with the result
    if (COMMAND_HANDLERS[command] !== undefined) {
      COMMAND_HANDLERS[command]
        .handleMessage(message)
        .then((data) => {
          // All handlers should resolve with data that can be replied with.
          Utils.log(MSG.SUCCESSFUL_COMMAND, {
            user: message.author.tag,
            command: command,
          });
          // If object, treat as Embed
          if (typeof data == 'object') {
            message.reply({embeds: [data]});
          } else {
            message.reply(data);
          }          
        })
        .catch((msg, data, sendToDiscord) => {
          // All handlers should reject with a MSG object, any data to fill in with it,
          // and a boolean to indicate if there's a message to send to discord with it.
          if (msg.console) {
            Utils.log(msg, data, sendToDiscord ? message : null);
          } else {
            // If the reject didn't conform to this "standard", it's likely a reject that happened in an "unexpected" situation
            const situation = {
              command: command,
              // args: "".join(arguments.map((x, i) => `arg[${i}]: ${x}`)),
              // args: arguments, // I guess args is an object rather than array now?
              args: arguments.map((k, v) => `${k}: ${v}`, []).join("\n"),
            };
            Utils.log(MSG.FAILURE_COMMAND, situation, message);
          }
        });
    } else {
      // Otherwise, we got a message that started with the command prefix but has no handler defined
      const situation = { user: message.author.tag, command: command };
      Utils.log(MSG.UNKNOWN_COMMAND, situation, message);
    }
  }
}

// Run our main function
main();
