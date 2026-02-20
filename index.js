const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import Firebase
const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously, onAuthStateChanged } = require('firebase/auth');
const { getFirestore, doc, setDoc, onSnapshot, collection } = require('firebase/firestore');

// Import Utilities
const logger = require('./utils/logger');
const startupChecks = require('./utils/startupChecks');

require('dotenv').config({ path: path.resolve(__dirname, 'lootcord-helper.env') });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const PORT = process.env.PORT || 3000;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const APP_ID_FOR_FIRESTORE = process.env.RENDER_SERVICE_ID || 'my-discord-bot-app';

// Validate Env variables
if (!TOKEN || !CLIENT_ID || !firebaseConfig.apiKey) {
    logger.error('Missing required environment variables. Please check your .env file.');
    process.exit(1);
}

// Firebase State
let firebaseApp, db, auth, userId = 'unknown', isFirestoreReady = false;

async function initializeFirebase() {
    try {
        firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);

        onAuthStateChanged(auth, async (user) => {
            userId = user ? user.uid : crypto.randomUUID();
            isFirestoreReady = true;
            logger.success(`Firebase connected. User ID: ${userId}`);
        });

        await signInAnonymously(auth);
    } catch (error) {
        logger.error('Firebase Initialization Error:', error);
        process.exit(1);
    }
}

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
const slashCommandsToRegister = [];

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            slashCommandsToRegister.push(command.data.toJSON());
        } else {
            logger.warn(`Command ${file} missing "data" or "execute" property.`);
        }
    } catch (error) {
        logger.error(`Failed to load command ${file}:`, error);
    }
}

// Load Events Dynamically
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    // We pass our specific variables into every event
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE));
    } else {
        client.on(event.name, (...args) => event.execute(...args, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE));
    }
}
logger.info(`Loaded ${eventFiles.length} event listeners.`);


// On Ready
client.once('clientReady', async () => {
    logger.success(`Logged in as ${client.user.tag}!`);
    await initializeFirebase();

    // Register Slash commands
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        logger.info(`Refreshing ${slashCommandsToRegister.length} slash commands.`);
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommandsToRegister });
        logger.success('Successfully reloaded slash commands.');
    } catch (error) {
        logger.error('Failed to register slash commands:', error);
    }
});

// Start Bot and Web Server
client.login(TOKEN);

const app = express();
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => logger.info(`Web server listening on port ${PORT}`));
