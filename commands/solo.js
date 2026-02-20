const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const logger = require('../utils/logger');
const { createSoloSticky } = require('../utils/stickyMessageManager');

const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 Hours

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solo')
        .setDescription('Claim a mob solo in the current channel and activate a sticky message.'),

    async execute(interaction, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
        if (!isFirestoreReady) return interaction.reply({ content: 'Database connecting...', ephemeral: true });

        await interaction.deferReply();

        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        const now = Date.now();

        try {
            // 1. Check Channel Config
            const channelRef = doc(db, `Guilds/${interaction.guild.id}/channels`, channelId);
            const channelSnap = await getDoc(channelRef);

            if (!channelSnap.exists()) {
                return interaction.editReply({ content: '❌ This channel is not configured for mob tracking. Use `/channel-set` first.' });
            }

            const originalName = channelSnap.data().originalChannelName;

            // 2. Check Cooldowns & Active Solos
            const userRef = doc(db, 'SoloCooldowns', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.activeChannelId && data.activeChannelId !== channelId) {
                    return interaction.editReply({ content: `🚫 You already have an active solo claim in <#${data.activeChannelId}>.` });
                }
                if (data.lastUsedTimestamp + COOLDOWN_MS > now) {
                    const remaining = Math.ceil((data.lastUsedTimestamp + COOLDOWN_MS - now) / 60000);
                    return interaction.editReply({ content: `⏳ You are on cooldown. You can claim another solo in ${remaining} minutes.` });
                }
            }

            // 3. Check if channel is already claimed
            const stickyRef = doc(db, 'SoloStickyMessages', channelId);
            const stickySnap = await getDoc(stickyRef);
            if (stickySnap.exists() && stickySnap.data().isActive) {
                return interaction.editReply({ content: `⚠️ This channel is already claimed by <@${stickySnap.data().userId}>.` });
            }

            // 4. Activate Solo & Sticky
            const stickyMsgId = await createSoloSticky(interaction.channel, interaction.user, originalName, db);
            
            await setDoc(userRef, {
                lastUsedTimestamp: now,
                activeChannelId: channelId,
                userId: userId
            }, { merge: true });

            logger.info(`${interaction.user.tag} claimed solo in #${interaction.channel.name}`);
            await interaction.editReply({ content: `✅ Solo claim activated! A sticky message has been posted to follow chat activity.` });

        } catch (error) {
            logger.error('Solo Command Error:', error);
            await interaction.editReply({ content: '❌ An error occurred while processing your solo claim.' });
        }
    }
};
