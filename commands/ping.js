const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the bot\'s current latency and status.'),
        
    async execute(interaction) {
        // Record the time before sending the initial reply
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
        
        // Calculate the round-trip latency
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        // WebSocket ping to Discord's gateway
        const wsPing = Math.round(interaction.client.ws.ping);

        logger.debug(`Ping requested by ${interaction.user.tag}. Latency: ${latency}ms, API: ${wsPing}ms`);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Green color
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Latency', value: `\`${latency}ms\``, inline: true },
                { name: 'API Latency', value: `\`${wsPing}ms\``, inline: true }
            )
            .setTimestamp();

        // If latency is high, change color to orange or red
        if (latency > 500 || wsPing > 500) embed.setColor(0xFF0000); // Red
        else if (latency > 200 || wsPing > 200) embed.setColor(0xFFA500); // Orange

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
