const logger = require('../utils/logger');
const { doc, getDoc, setDoc, collection } = require('firebase/firestore');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WEAPON_DATA, AMMO_DATA } = require('../utils/damageData');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
        
        // --- 1. HANDLE SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE);
            } catch (error) {
                logger.error(`Error executing /${interaction.commandName}`, error);
                const reply = { content: '❌ There was an error while executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                else await interaction.reply(reply);
            }
        }

        // --- 2. HANDLE SELECT MENUS (Damage Calc & Settings) ---
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'dmgcalc_weapon') {
                const selectedWeapon = interaction.values[0];
                const weaponInfo = WEAPON_DATA[selectedWeapon];

                const ammoOptions = Object.keys(AMMO_DATA).map(key => ({
                    label: AMMO_DATA[key].name,
                    value: `${selectedWeapon}|${key}`,
                    description: `Bonus Damage: +${AMMO_DATA[key].bonus}`
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('dmgcalc_ammo')
                        .setPlaceholder('Select your ammo...')
                        .addOptions(ammoOptions),
                );

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('⚔️ Damage Calculator')
                    .setDescription(`**Weapon Selected:** ${weaponInfo.name}\n\nNow, select your Ammo type.`)
                    .setFooter({ text: 'Step 2 of 3' });

                await interaction.update({ embeds: [embed], components: [row] });
            }

            else if (interaction.customId === 'dmgcalc_ammo') {
                const [selectedWeapon, selectedAmmo] = interaction.values[0].split('|');
                
                let userStrength = 0;
                if (isFirestoreReady) {
                    try {
                        const userDoc = await getDoc(doc(db, `artifacts/${APP_ID_FOR_FIRESTORE}/users`, interaction.user.id));
                        if (userDoc.exists()) userStrength = userDoc.data().strength || 0;
                    } catch (e) { logger.error("Failed fetching strength", e); }
                }

                const weapon = WEAPON_DATA[selectedWeapon];
                const ammo = AMMO_DATA[selectedAmmo];
                
                const minDamage = Math.floor((weapon.baseMin + ammo.bonus) * weapon.multiplier) + userStrength;
                const maxDamage = Math.floor((weapon.baseMax + ammo.bonus) * weapon.multiplier) + userStrength;

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('💥 Damage Calculation Complete')
                    .addFields(
                        { name: 'Weapon', value: weapon.name, inline: true },
                        { name: 'Ammo', value: ammo.name, inline: true },
                        { name: 'Saved Strength', value: `${userStrength}`, inline: true },
                        { name: 'Estimated Damage', value: `**${minDamage} - ${maxDamage}**`, inline: false }
                    )
                    .setFooter({ text: 'Values calculated from your most recent profile scan.' });

                await interaction.update({ embeds: [embed], components: [] });
            }
        }

        // --- 3. HANDLE BUTTON CLICKS ---
        else if (interaction.isButton()) {
            // Trivia Explanation Buttons
            if (interaction.customId.startsWith('show_trivia_exp_')) {
                const parts = interaction.customId.split('_');
                const originalMsgId = parts[3];
                const letter = parts[4];

                const cacheRef = doc(db, 'TriviaExplanations', originalMsgId);
                const cacheSnap = await getDoc(cacheRef);

                if (cacheSnap.exists()) {
                    const explanation = cacheSnap.data().explanations[letter] || "No specific explanation available for this option.";
                    await interaction.reply({ content: `**Option ${letter}:** ${explanation}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: "Explanation cache expired or unavailable.", ephemeral: true });
                }
            }
        }
    }
};
