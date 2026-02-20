const { GoogleGenerativeAI } = require("@google/generative-ai");
const { doc, getDoc, setDoc } = require('firebase/firestore');
const crypto = require('crypto');
const logger = require('./logger');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Free tier model

const hashString = (str) => crypto.createHash('md5').update(str).digest('hex');

module.exports = {
    async solveTrivia(question, options, db) {
        const qHash = hashString(question);
        const cacheRef = doc(db, 'TriviaCache', qHash);

        // 1. Check Cache
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) return cacheSnap.data().answer;

        // 2. Call Gemini
        try {
            const prompt = `Trivia: ${question}. Options: ${options}. Provide ONLY the letter of the correct answer.`;
            const result = await model.generateContent(prompt);
            const answer = result.response.text().trim().charAt(0).toUpperCase();

            // 3. Save to Cache
            await setDoc(cacheRef, { answer, question, timestamp: Date.now() });
            return answer;
        } catch (err) {
            logger.error('Gemini Trivia Error:', err);
            return null;
        }
    },

    async solveScramble(scrambledWord, db) {
        const sHash = hashString(scrambledWord);
        const cacheRef = doc(db, 'ScrambleCache', sHash);

        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) return cacheSnap.data().word;

        try {
            const prompt = `Unscramble this word: ${scrambledWord}. Provide ONLY the word.`;
            const result = await model.generateContent(prompt);
            const word = result.response.text().trim().toLowerCase();

            await setDoc(cacheRef, { word, original: scrambledWord });
            return word;
        } catch (err) {
            logger.error('Gemini Scramble Error:', err);
            return null;
        }
    }
}; 
