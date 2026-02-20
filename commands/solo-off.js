const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { doc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const logger = require('../utils/logger');
const { removeSoloSticky } = require('../utils/stickyMessageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solo-off')
        .setDescription('Manually remove a solo claim and sticky message from this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, db, client, isFirestoreReady) {
        if (!isFirestoreReady) return interaction.reply({ content: 'Database connecting...', ephemeral: true });

        await interaction.deferReply();

        try {
            const channelId = interaction.channel.id;
            
            // 1. Remove Sticky via Manager
            const userId = await removeSoloSticky(channelId, client, db);

            if (userId) {
                // 2. Clear User Cooldown/Active Status
                const userRef = doc(db, 'SoloCooldowns', userId);
                await updateDoc(userRef, { activeChannelId: null, lastUsedTimestamp: 0 });
                
                logger.info(`Solo manually cleared in #${interaction.channel.name} by ${interaction.user.tag}`);
                await interaction.editReply({ content: '✅ Solo claim and sticky message have been removed.' });
            } else {
                await interaction.editReply({ content: 'ℹ️ No active solo claim found in this channel.' });
            }

        } catch (error) {
            logger.error('Solo-Off Error:', error);
            await interaction.editReply({ content: '❌ Failed to remove the solo claim.' });
        }
    }
};
