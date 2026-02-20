const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');

const CHANNELS_PER_PAGE = 25;

module.exports = {
    /**
     * Creates a paginated selection message for guild channels.
     */
    createChannelPaginationMessage: async (guild, page = 0) => {
        const channels = Array.from(guild.channels.cache.filter(c => c.type === ChannelType.GuildText).values())
            .sort((a, b) => a.rawPosition - b.rawPosition);

        const totalPages = Math.ceil(channels.length / CHANNELS_PER_PAGE);
        const start = page * CHANNELS_PER_PAGE;
        const pageChannels = channels.slice(start, start + CHANNELS_PER_PAGE);

        const selectOptions = pageChannels.map(c => ({
            label: `#${c.name}`,
            value: c.id,
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('channel_select_menu')
            .setPlaceholder(`Select a channel (Page ${page + 1}/${totalPages})`)
            .addOptions(selectOptions);

        const row1 = new ActionRowBuilder().addComponents(menu);

        const prevBtn = new ButtonBuilder()
            .setCustomId(`page_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0);

        const nextBtn = new ButtonBuilder()
            .setCustomId(`page_next_${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1);

        const row2 = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

        return {
            content: `**Channel Selection**\nShowing channels ${start + 1} to ${Math.min(start + CHANNELS_PER_PAGE, channels.length)} of ${channels.length}.`,
            components: [row1, row2]
        };
    }
};
