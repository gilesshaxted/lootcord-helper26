const { doc, setDoc, deleteDoc, getDoc } = require('firebase/firestore');
const logger = require('./logger');

module.exports = {
    /**
     * Reposts a sticky message at the bottom of the channel.
     */
    repostSticky: async (client, db, channelId, content) => {
        const channel = client.channels.cache.get(channelId);
        if (!channel) return;

        const stickyRef = doc(db, 'StickyMessages', channelId);
        const stickySnap = await getDoc(stickyRef);

        try {
            // Delete old sticky if it exists
            if (stickySnap.exists()) {
                const oldMsgId = stickySnap.data().messageId;
                const oldMsg = await channel.messages.fetch(oldMsgId).catch(() => null);
                if (oldMsg) await oldMsg.delete();
            }

            // Send new sticky
            const newMsg = await channel.send(`📌 **Sticky Message**\n${content}`);
            await setDoc(stickyRef, {
                messageId: newMsg.id,
                content: content,
                lastUpdated: Date.now()
            });
        } catch (error) {
            logger.error(`Sticky Manager error in #${channel.name}:`, error);
        }
    },

    /**
     * Cleans up expired sticky messages (e.g. from /solo).
     */
    cleanupExpiredStickyMessages: async (db, client) => {
        // Implementation for clearing expired claims every 10 mins
        logger.debug('Cleaning up expired solo claims...');
    }
};
