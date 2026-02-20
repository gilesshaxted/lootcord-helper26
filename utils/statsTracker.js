const { doc, setDoc, increment } = require('firebase/firestore');
const logger = require('./logger');

let inMemoryStats = {
    totalHelps: 0
};

module.exports = {
    updateInMemoryStats: (data) => {
        if (data) {
            inMemoryStats = { ...inMemoryStats, ...data };
        }
    },
    
    incrementTotalHelps: async (db, appId) => {
        inMemoryStats.totalHelps += 1;
        
        if (!db || !appId) return;

        try {
            // Use Firestore's built in increment() function for efficiency
            const statsRef = doc(db, `artifacts/${appId}/public/data/stats`, 'botStats');
            await setDoc(statsRef, {
                totalHelps: increment(1),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
        } catch (error) {
            logger.error('Failed to increment stats in Firestore:', error);
        }
    },

    getStats: () => inMemoryStats
};
