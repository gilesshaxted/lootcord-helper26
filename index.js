const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { checkEnvironment } = require('./utils/startupChecks');
const { db } = require('./utils/firebase');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        logger.warn(`[Command Load] The command at ${file} is missing required properties.`);
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, db, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, db, client));
    }
}

client.login(process.env.DISCORD_TOKEN).catch(err => {
    logger.error('Failed to login to Discord:', err);
});
