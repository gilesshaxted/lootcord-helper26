Lootcord Helper v3.0

An optimized, modular Discord bot designed to assist Lootcord players with automated solvers, game mechanics tracking, and server management.

🚀 Features

🧠 AI-Powered Auto-Solvers (Free Tier)

Trivia Solver: Automatically identifies the best answer for Lootcord trivia embeds using Google Gemini AI.

Scramble Solver: Instantly unscrambles game words.

Firestore Caching: Uses MD5 hashing to store and retrieve previously solved questions, providing instant answers and saving API costs.

⚔️ Game Mechanics

Damage Calculator: Precise calculations based on weapons, ammo, and user strength.

Strength Listener: Automatically scrapes user strength values from profile embeds to save to Firestore for automatic damage calculations.

Mob Detection: Scans channel activity to ping roles and rename channels when high-value targets spawn.

🛠 Administrative Tools

Sticky Messages: Managed solo-claim messages that follow chat activity to mark active mob claims.

Monthly Activity Tracker: High-efficiency message tracking with leaderboard integration.

Manual Overrides: Commands like /solo-off and /mob-off for manual state management.

📁 Directory Structure

lootcord-helper/
├── index.js                # Main entry point & client initialization
├── package.json            # Project dependencies & scripts
├── lootcord-helper.env     # Environment variables (private)
├── utils/
│   ├── logger.js           # Centralized logging with timestamps & colors
│   ├── firebase.js         # Firebase/Firestore initialization
│   ├── autoSolvers.js      # Gemini AI logic & Caching layer
│   ├── damageData.js       # Weapon & Ammo statistics
│   └── statsTracker.js     # Help counters & bot metrics
├── events/
│   ├── messageCreate.js    # Primary logic router (Scraping/Solvers)
│   ├── interactionCreate.js # Slash command & UI component handler
│   └── MobDetect.js        # Logic for mob spawns & channel renames
└── commands/
    ├── damage-calc.js      # User damage tool
    ├── solo.js             # Active mob claiming
    ├── solo-off.js         # Manual solo reset
    └── bot-stats.js        # Admin metrics


🛠 Setup & Installation

Install dependencies:

npm install


Configure Environment Variables:
Create a lootcord-helper.env file in the root directory:

DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_id
GOOGLE_API_KEY=your_gemini_key
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...


Run the bot:

npm start


📈 Optimization

Caching Layer: Every AI solve is hashed and stored. If the same question appears twice, the bot responds in milliseconds without calling the AI API.

Batch Updates: User activity and strength stats are processed with efficiency in mind to minimize Firestore write operations.
