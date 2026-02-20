const { solveTrivia, solveScramble } = require('../utils/autoSolvers');
const logger = require('../utils/logger');

const TARGET_BOT_ID = '493316754689359874'; 
const VIP_ROLE_ID = 'YOUR_VIP_ROLE_ID_HERE'; // <--- REPLACE THIS
const BOOSTER_ROLE_ID = 'YOUR_BOOSTER_ROLE_ID_HERE'; // <--- REPLACE THIS (Optional)

// Cache to store pending requests (Expires after 15 seconds)
const pendingRequests = new Map();

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
        if (!message.guild || message.author.id === client.user.id) return;

        const now = Date.now();

        // 1. Cleanup expired pending requests
        for (const [channelId, req] of pendingRequests.entries()) {
            if (now > req.expires) {
                pendingRequests.delete(channelId);
                logger.debug(`Cleared expired request in channel ${channelId}`);
            }
        }

        // 2. Listen for USER commands to trigger the solvers
        if (!message.author.bot) {
            const content = message.content.toLowerCase();
            
            if (content === 't-trivia' || content === 't-scramble') {
                // VIP / Booster Check
                const isVip = message.member.roles.cache.has(VIP_ROLE_ID) || 
                              message.member.roles.cache.has(BOOSTER_ROLE_ID) || 
                              message.member.premiumSince;
                
                if (!isVip) {
                    logger.info(`User ${message.author.tag} denied solver access (No VIP).`);
                    return; 
                }

                const type = content === 't-trivia' ? 'trivia' : 'scramble';
                
                // Register pending request for this channel
                pendingRequests.set(message.channel.id, {
                    type: type,
                    userId: message.author.id,
                    expires: now + 15000 // 15 seconds to wait for bot response
                });
                
                logger.info(`Queued ${type} solver request for ${message.author.tag}`);
            }
            return; 
        }

        // 3. Listen for the TARGET BOT's response
        if (message.author.bot && message.author.id === TARGET_BOT_ID) {
            const activeRequest = pendingRequests.get(message.channel.id);
            if (!activeRequest) return; 

            // Handle Trivia
            if (activeRequest.type === 'trivia' && message.embeds.length > 0) {
                const embed = message.embeds[0];
                if (embed.title && embed.title.endsWith('?') && embed.description) {
                    pendingRequests.delete(message.channel.id); // Clear queue
                    logger.info(`Executing trivia solver in ${message.channel.name}`);
                    await solveTrivia(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE);
                }
            } 
            
            // Handle Scramble
            else if (activeRequest.type === 'scramble' && message.embeds.length > 0) {
                const embedDescription = message.embeds[0].description;
                if (embedDescription && embedDescription.includes('Word:')) {
                    pendingRequests.delete(message.channel.id); // Clear queue
                    logger.info(`Executing scramble solver in ${message.channel.name}`);
                    await solveScramble(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE);
                }
            }
        }
    }
};
