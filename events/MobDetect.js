const logger = require('../utils/logger');
const { doc, getDoc, collection } = require('firebase/firestore');

const TARGET_BOT_ID = '493316754689359874';
const MOB_PING_ROLE_ID = 'YOUR_ROLE_ID'; // Role to notify when mobs appear

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, db, client, isFirestoreReady) {
        if (!message.guild || message.author.id !== TARGET_BOT_ID) return;

        const embed = message.embeds[0];
        if (!embed) return;

        const title = embed.title || '';
        const desc = embed.description || '';
        
        let newName = null;

        // 1. IDENTIFY THE MOB
        if (title.includes('Heavy Scientist')) newName = '🐻╏heavy';
        else if (title.includes('Scientist')) newName = '🥼╏scientist';
        else if (title.includes('Tunnel Dweller')) newName = '🧟╏dweller';
        else if (title.includes('Patrol Helicopter')) newName = '🚁╏heli';
        else if (title.includes('Bradley APC')) newName = '🚨╏brad';

        // 2. RENAME & PING IF MOB DETECTED
        if (newName) {
            try {
                // Ping the hunters
                await message.channel.send(`<@&${MOB_PING_ROLE_ID}> ⚔️ **${title}** has been spotted!`);
                
                // Rename channel to show active mob
                if (message.channel.name !== newName) {
                    await message.channel.setName(newName);
                    logger.info(`Mob Spawn: Renamed #${message.channel.id} to ${newName}`);
                }
            } catch (error) {
                logger.error('Mob Detector rename failed:', error);
            }
            return;
        }

        // 3. REVERT ON DEATH/DESPAWN
        const isRevert = title.includes('left...') || desc.includes('killed a mob') || message.content.includes('DIED!');
        if (isRevert && isFirestoreReady) {
            try {
                const channelRef = doc(db, `Guilds/${message.guild.id}/channels`, message.channel.id);
                const channelSnap = await getDoc(channelRef);
                
                if (channelSnap.exists()) {
                    const originalName = channelSnap.data().originalChannelName;
                    if (message.channel.name !== originalName) {
                        await message.channel.setName(originalName);
                        logger.success(`Mob Cleared: Reverted #${message.channel.id} to ${originalName}`);
                    }
                }
            } catch (error) {
                logger.error('Mob Detector revert failed:', error);
            }
        }
    }
};
