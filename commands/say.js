const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say a message in a specific channel.')
        // Require ManageMessages permission to even see/use this command
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message you want the bot to say')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the message in (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        ),
        
    async execute(interaction) {
        const messageToSay = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // Send the message to the target channel
            await targetChannel.send(messageToSay);
            
            // Reply ephemerally to the user so they know it worked, without cluttering chat
            await interaction.reply({ 
                content: `✅ Message successfully sent to ${targetChannel}.`, 
                ephemeral: true 
            });
            
            logger.info(`User ${interaction.user.tag} used /say to post in #${targetChannel.name}`);
            
        } catch (error) {
            logger.error(`Failed to execute /say command in #${targetChannel.name}:`, error);
            
            // Check if the error is due to missing permissions in the target channel
            if (error.code === 50013) {
                 await interaction.reply({ 
                    content: `❌ I do not have permission to send messages in ${targetChannel}.`, 
                    ephemeral: true 
                });
            } else {
                 await interaction.reply({ 
                    content: `❌ An error occurred while trying to send the message.`, 
                    ephemeral: true 
                });
            }
        }
    },
};
