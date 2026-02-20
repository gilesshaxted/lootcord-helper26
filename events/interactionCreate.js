const logger = require('../utils/logger');
const { doc, getDoc } = require('firebase/firestore');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
        
        // --- 1. HANDLE SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                logger.info(`User ${interaction.user.tag} executed /${interaction.commandName}`);
                await command.execute(interaction, db, client, isFirestoreReady, APP_ID_FOR_FIRESTORE);
            } catch (error) {
                logger.error(`Error executing /${interaction.commandName}`, error);
                const reply = { content: 'There was an error while executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // --- 2. HANDLE BUTTON CLICKS (Trivia Explanations) ---
        else if (interaction.isButton()) {
            const customId = interaction.customId;

            // Check if it's our Trivia explanation button (Format: show_trivia_exp_MESSAGEID_LETTER)
            if (customId.startsWith('show_trivia_exp_')) {
                const parts = customId.split('_');
                const originalMessageId = parts[3];
                const selectedLetter = parts[4]; // A, B, C, or D

                if (!isFirestoreReady) {
                    return interaction.reply({ content: 'Database is loading, try again in a moment.', ephemeral: true });
                }

                try {
                    // Fetch the explanation from Firestore
                    const docRef = doc(db, `TriviaExplanations`, originalMessageId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const explanation = data.explanations[selectedLetter];
                        
                        const isCorrect = data.mostLikelyAnswer === selectedLetter;
                        const prefix = isCorrect ? '✅ **CORRECT**' : '❌ **INCORRECT**';

                        await interaction.reply({ 
                            content: `${prefix} - Option ${selectedLetter}\n\n${explanation}`, 
                            ephemeral: true // Only the user who clicked sees this!
                        });
                        logger.debug(`Served explanation for ${selectedLetter} to ${interaction.user.tag}`);
                    } else {
                        await interaction.reply({ content: 'Sorry, I lost the explanation for this question!', ephemeral: true });
                    }
                } catch (error) {
                    logger.error('Error fetching trivia explanation:', error);
                    await interaction.reply({ content: 'An error occurred fetching the explanation.', ephemeral: true });
                }
            }
        }
    }
};
