const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { doc, collection, getDoc } = require('firebase/firestore');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notify')
        .setDescription('Manage your personal notification preferences for Lootcord Helper.'),

    async execute(interaction, db) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const types = ['attackCooldown', 'farmCooldown', 'medCooldown', 'voteCooldown', 'repairCooldown', 'gamblingCooldown', 'lootCooldown'];
        
        try {
            const currentPrefs = {};
            for (const type of types) {
                const snap = await getDoc(doc(collection(db, `UserNotifications/${userId}/preferences`), type));
                currentPrefs[type] = snap.exists() ? snap.data().enabled : false;
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🔔 Notification Settings')
                .setDescription('Toggle your cooldown pings below.')
                .addFields(
                    { name: 'Combat', value: currentPrefs.attackCooldown ? '✅ ON' : '❌ OFF', inline: true },
                    { name: 'Farming', value: currentPrefs.farmCooldown ? '✅ ON' : '❌ OFF', inline: true },
                    { name: 'Looting', value: currentPrefs.lootCooldown ? '✅ ON' : '❌ OFF', inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('toggle_attack_notifications').setLabel('Attack').setStyle(currentPrefs.attackCooldown ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('toggle_farm_notifications').setLabel('Farm').setStyle(currentPrefs.farmCooldown ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('toggle_loot_notifications').setLabel('Loot').setStyle(currentPrefs.lootCooldown ? ButtonStyle.Success : ButtonStyle.Danger)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });
            logger.debug(`${interaction.user.tag} accessed notify settings.`);

        } catch (error) {
            logger.error('Notify Command Error:', error);
            await interaction.editReply({ content: '❌ Error loading preferences.' });
        }
    },
};
