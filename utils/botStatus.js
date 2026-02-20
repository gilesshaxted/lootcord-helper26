const { ActivityType } = require('discord.js');
const logger = require('./logger');

module.exports = {
    /**
     * Updates the bot's Discord presence with dynamic stats.
     */
    updateBotPresence: (client, { totalHelps, uniqueActiveUsers }) => {
        if (!client.user) return;

        try {
            const statusText = `Helping ${uniqueActiveUsers} players (${totalHelps} solves)`;
            client.user.setActivity(statusText, { type: ActivityType.Watching });
            logger.debug(`Presence updated: ${statusText}`);
        } catch (error) {
            logger.error('Failed to update bot presence:', error);
        }
    }
};
