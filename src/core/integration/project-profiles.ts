export interface ProjectProfile {
  projectId: string;
  displayName: string;
  allowedModes: string[];
  allowedTasks: string[];
  safetyRules: string[];
  memoryScope: 'session' | 'project' | 'global';
}

export const PROJECT_PROFILES: Record<string, ProjectProfile> = {
  'doomsgame': {
    projectId: 'doomsgame',
    displayName: 'Doomsgame Engine',
    allowedModes: ['content', 'general'],
    allowedTasks: ['generate_news_draft', 'suggest_game_embeds', 'generate_text'],
    safetyRules: ['SEO focus', 'gaming context'],
    memoryScope: 'project'
  },
  'boss-ai': {
    projectId: 'boss-ai',
    displayName: 'BOSS AI Economy',
    allowedModes: ['economy', 'general'],
    allowedTasks: ['generate_text', 'analyze_news', 'market_summary'],
    safetyRules: ['Disclaimer required', 'No financial advice'],
    memoryScope: 'project'
  },
  'bademakademi': {
    projectId: 'bademakademi',
    displayName: 'Bademakademi Education',
    allowedModes: ['education', 'general'],
    allowedTasks: ['explain_topic', 'generate_quiz', 'summarize_lesson'],
    safetyRules: ['Pedagogical tone', 'Safe for children'],
    memoryScope: 'project'
  }
};

export function getProjectProfile(projectId: string): ProjectProfile | undefined {
  return PROJECT_PROFILES[projectId];
}
