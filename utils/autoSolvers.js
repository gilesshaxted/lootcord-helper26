const { doc, getDoc, setDoc, collection } = require('firebase/firestore');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const logger = require('./logger');
const statsTracker = require('./statsTracker');

const GEMINI_MODEL = 'gemini-2.5-flash'; 

// Helper: Safely hash strings for Firestore document IDs (prevents errors from special characters in questions)
const hashString = (str) => crypto.createHash('md5').update(str).digest('hex');

// Helper: Extract JSON from LLM output safely
function extractJSON(rawText) {
    try {
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/{[\s\S]*}/);
        if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return JSON.parse(rawText);
    } catch (e) {
        return null;
    }
}

// Helper: Anagram Validator
function isValidAnagram(scrambled, suggested) {
    if (scrambled.length !== suggested.length) return false;
    const sortString = (str) => str.toLowerCase().split('').sort().join('');
    return sortString(scrambled) === sortString(suggested);
}

// --- TRIVIA SOLVER ---
async function solveTrivia(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
    if (!isFirestoreReady) return;

    const embed = message.embeds[0];
    const question = embed.title;
    const options = embed.description;
    const questionHash = hashString(question); // Create a safe DB ID

    try {
        // 1. Check Cache First!
        const cacheRef = doc(db, `TriviaCache`, questionHash);
        const cachedDoc = await getDoc(cacheRef);

        let answerData;

        if (cachedDoc.exists()) {
            logger.info(`Trivia Cache HIT for: "${question}"`);
            answerData = cachedDoc.data();
        } else {
            logger.info(`Trivia Cache MISS. Calling Gemini for: "${question}"`);
            // 2. Not in cache, call Gemini
            const prompt = `You are an expert trivia solver. Identify the single best answer. Output ONLY raw JSON: {"answer": "A", "confidence": 95, "explanations": {"A": "...", "B": "...", "C": "...", "D": "..."}} \n\nQuestion: ${question}\nOptions: \n${options}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });

            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Empty response from Gemini");

            answerData = extractJSON(rawText);
            if (!answerData || !['A','B','C','D'].includes(answerData.answer)) throw new Error("Invalid JSON format from Gemini");

            // 3. Save to Cache for next time
            await setDoc(cacheRef, {
                question: question,
                answer: answerData.answer,
                confidence: answerData.confidence,
                explanations: answerData.explanations,
                cachedAt: new Date().toISOString()
            });
            logger.success(`Saved new Trivia answer to cache.`);
        }

        // 4. Send the result to Discord
        const buttons = ['A', 'B', 'C', 'D'].map(letter => {
            const isCorrect = letter === answerData.answer;
            const style = isCorrect ? (answerData.confidence >= 90 ? ButtonStyle.Success : ButtonStyle.Primary) : ButtonStyle.Secondary;
            return new ButtonBuilder().setCustomId(`show_trivia_exp_${message.id}_${letter}`).setLabel(letter).setStyle(style);
        });

        const row = new ActionRowBuilder().addComponents(buttons);
        const replyContent = `**Trivia Answer:** \`${question}\`\nMost Likely: \`${answerData.answer}\` (Confidence: ${answerData.confidence}%)\n*Click a button for explanations.*`;

        await message.channel.send({ content: replyContent, components: [row] });
        statsTracker.incrementTotalHelps(db, APP_ID_FOR_FIRESTORE);

    } catch (error) {
        logger.error('Trivia Solver Error:', error);
        message.channel.send('I apologize, but I encountered an error solving this trivia.');
    }
}

// --- SCRAMBLE SOLVER ---
async function solveScramble(message, db, isFirestoreReady, APP_ID_FOR_FIRESTORE) {
    if (!isFirestoreReady) return;

    const wordMatch = message.embeds[0].description.match(/Word:\s*```fix\n([a-zA-Z]+)```/s);
    if (!wordMatch || !wordMatch[1]) return;

    const scrambledLetters = wordMatch[1].toLowerCase();
    
    try {
        // 1. Check Cache First! (scrambled letters are safe as doc IDs)
        const cacheRef = doc(db, `ScrambleCache`, scrambledLetters);
        const cachedDoc = await getDoc(cacheRef);

        let validAnagrams = [];

        if (cachedDoc.exists()) {
            logger.info(`Scramble Cache HIT for: "${scrambledLetters}"`);
            validAnagrams = cachedDoc.data().answers;
        } else {
            logger.info(`Scramble Cache MISS. Calling Gemini for: "${scrambledLetters}"`);
            // 2. Not in cache, call Gemini
            const prompt = `Unscramble these letters into English words. Each word MUST use ALL letters exactly once. Output just the words, one per line. Letters: ${scrambledLetters}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });

            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Empty response from Gemini");

            const words = rawText.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(Boolean);
            validAnagrams = words.filter(word => isValidAnagram(scrambledLetters, word));

            // 3. Save to Cache for next time
            if (validAnagrams.length > 0) {
                await setDoc(cacheRef, {
                    scrambled: scrambledLetters,
                    answers: validAnagrams,
                    cachedAt: new Date().toISOString()
                });
                logger.success(`Saved Scramble answer to cache.`);
            }
        }

        // 4. Send the result to Discord
        if (validAnagrams.length > 0) {
            let replyContent = `**Unscrambled word for \`${scrambledLetters}\`:**\nMost likely: \`${validAnagrams[0]}\``;
            if (validAnagrams.length > 1) {
                replyContent += `\nOther possibilities: ${validAnagrams.slice(1, 4).map(w => `\`${w}\``).join(', ')}`;
            }
            await message.channel.send({ content: replyContent });
            statsTracker.incrementTotalHelps(db, APP_ID_FOR_FIRESTORE);
        } else {
            await message.channel.send(`Could not determine valid anagrams for \`${scrambledLetters}\`.`);
        }

    } catch (error) {
        logger.error('Scramble Solver Error:', error);
    }
}

module.exports = { solveTrivia, solveScramble };
