const { collection, getDocs } = require('firebase/firestore');
const { ChannelType } = require('discord.js');
const logger = require('./logger');

const TARGET_BOT_ID = '493316754689359874';

module.exports = {
    /**
     * Checks all configured channels on boot to see if names need reverting.
     */
    checkAndRenameChannelsOnStartup: async (db, isFirestoreReady, client) => {
        if (!isFirestoreReady) return;

        logger.info('Performing startup recovery checks...');

        for (const guild of client.guilds.cache.values()) {
            const channelsRef = collection(db, `Guilds/${guild.id}/channels`);
            const snapshot = await getDocs(channelsRef).catch(() => null);
            if (!snapshot || snapshot.empty) continue;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const channel = guild.channels.cache.get(data.channelId);

                if (channel && channel.type === ChannelType.GuildText) {
                    const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
                    const lastMsg = messages?.first();

                    // If the last message isn't from Lootcord or doesn't show a mob, 
                    // and the channel name is still modified, revert it.
                    if (channel.name !== data.originalChannelName) {
                        const isActiveMob = lastMsg?.author.id === TARGET_BOT_ID && 
                                          (lastMsg.embeds[0]?.title?.includes('spawned') || 
                                           lastMsg.embeds[0]?.title?.includes('Scientist'));
                        
                        if (!isActiveMob) {
                            await channel.setName(data.originalChannelName, 'Startup Recovery: No active mob found.');
                            logger.info(`Reverted #${channel.name} to ${data.originalChannelName} (Recovery)`);
                        }
                    }
                }
            }
        }
        logger.success('Startup checks completed.');
    }
};
