import dotenv from 'dotenv';
dotenv.config({ override: true });

export const memoryConfig = {
  enabled: process.env.AILLAME_MEMORY_ENABLED !== "false",
  storageDir: process.env.AILLAME_MEMORY_DIR || "./data/memory",
  maxRecentMessages: Number(process.env.AILLAME_MEMORY_MAX_RECENT_MESSAGES || 20),
  maxFactsPerProject: Number(process.env.AILLAME_MEMORY_MAX_FACTS || 100),
  maxMessageLength: Number(process.env.AILLAME_MEMORY_MAX_MESSAGE_LENGTH || 10000)
};
