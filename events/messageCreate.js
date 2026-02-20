const { solveTrivia, solveScramble } = require('../utils/autoSolvers');
const logger = require('../utils/logger');
const { doc, setDoc } = require('firebase/firestore');

const TARGET_BOT_ID = '493316754689359874'; // Lootcord bot
const VIP_ROLE_ID = 'YOUR_VIP_ROLE_ID_HERE'; // Configure this!

// In-memory map to track user requests for solvers (prevents bot from answering unprompted)
const pendingRequests = new Map();

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
        // Ignore DMs and messages from the bot itself
        if (!message.guild || message.author.id === client.user.id) return;

        const now = Date.now();

        // 1. USER MESSAGES - Triggering Solvers
        if (!message.author.bot) {
            const content = message.content.toLowerCase();
            if (content === 't-trivia' || content === 't-scramble') {
                // Optional: check for VIP roles or boosters to prevent spam
                const isVip = message.member.roles.cache.has(VIP_ROLE_ID) || message.member.premiumSince;
                if (!isVip) return; 

                pendingRequests.set(message.channel.id, { 
                    type: content === 't-trivia' ? 'trivia' : 'scramble', 
                    userId: message.author.id, 
                    expires: now + 15000 // 15 second window for Lootcord to post the embed
                });
                logger.debug(`Pending solver request from ${message.author.tag} in #${message.channel.name}`);
            }
            return; 
        }

        // 2. TARGET BOT MESSAGES (Lootcord)
        if (message.author.id === TARGET_BOT_ID && message.embeds.length > 0) {
            const embed = message.embeds[0];
            const title = embed.title || '';
            const description = embed.description || '';

            // --- A. STRENGTH LISTENER ---
            // Automatically scrape strength from profile embeds to help Damage Calculator
            if (isFirestoreReady && title.includes('Profile')) {
                const strengthMatch = description.match(/Strength:\s*\*{0,2}(\d+)\*{0,2}/i);
                const userMatch = description.match(/<@!?(\d+)>/); 

                if (strengthMatch?.[1] && userMatch?.[1]) {
                    const userId = userMatch[1];
                    const strengthValue = parseInt(strengthMatch[1], 10);

                    try {
                        const userRef = doc(db, `artifacts/${APP_ID_FOR_FIRESTORE}/users`, userId);
                        await setDoc(userRef, { strength: strengthValue, lastUpdated: new Date().toISOString() }, { merge: true });
                        logger.debug(`Scraped strength for ${userId}: ${strengthValue}`);
                    } catch (error) {
                        logger.error('Error saving scraped strength:', error);
                    }
                }
            }

            // --- B. AUTO SOLVER ROUTING ---
            const activeRequest = pendingRequests.get(message.channel.id);
            if (activeRequest && now < activeRequest.expires) {
                if (activeRequest.type === 'trivia' && title.endsWith('?') && description) {
                    pendingRequests.delete(message.channel.id);
                    await solveTrivia(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE);
                } 
                else if (activeRequest.type === 'scramble' && description.includes('Word:')) {
                    pendingRequests.delete(message.channel.id);
                    await solveScramble(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE);
                }
            }
        }
    }
};
