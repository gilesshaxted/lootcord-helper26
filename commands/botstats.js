const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsTracker = require('../utils/statsTracker');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-stats')
        .setDescription('Displays current statistics for the bot.')
        // Require Administrator permission to even see/use this command
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction, db, client, isFirestoreReady) {
        if (!isFirestoreReady) {
            logger.warn(`Stats requested by ${interaction.user.tag} but DB is not ready.`);
            return interaction.reply({ 
                content: 'The database is currently connecting. Please try again in a moment.', 
                ephemeral: true 
            });
        }

        try {
            // Get stats from our in-memory cache managed by the statsTracker
            const stats = statsTracker.getStats();
            
            const embed = new EmbedBuilder()
                .setColor(0x3498DB) // Blue
                .setTitle('📊 Bot Statistics')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: 'Total Helps', value: `\`${stats.totalHelps || 0}\``, inline: true },
                    { name: 'Servers', value: `\`${client.guilds.cache.size}\``, inline: true },
                    { name: 'Uptime', value: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`, inline: false }
                )
                .setFooter({ text: 'Stats pull from cache' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Displayed bot stats to ${interaction.user.tag}`);
            
        } catch (error) {
            logger.error('Error fetching bot stats:', error);
            await interaction.reply({ 
                content: 'An error occurred while fetching stats.', 
                ephemeral: true 
            });
        }
    },
};
