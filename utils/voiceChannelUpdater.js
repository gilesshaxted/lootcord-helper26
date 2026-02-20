const logger = require('./logger');

module.exports = {
    /**
     * Updates voice channel names based on current guild stats.
     */
    updateVoiceChannelNameOnDemand: async (client) => {
        // Example: Renaming a "Total Members" VC
        const GUILD_ID = process.env.MAIN_GUILD_ID;
        const VC_ID = process.env.STATS_VC_ID;

        if (!GUILD_ID || !VC_ID) return;

        const guild = client.guilds.cache.get(GUILD_ID);
        const channel = guild?.channels.cache.get(VC_ID);

        if (channel) {
            const memberCount = guild.memberCount;
            const newName = `👥 Members: ${memberCount}`;
            if (channel.name !== newName) {
                await channel.setName(newName).catch(err => logger.error('VC Update Error:', err));
                logger.info(`Updated VC name to: ${newName}`);
            }
        }
    }
};
