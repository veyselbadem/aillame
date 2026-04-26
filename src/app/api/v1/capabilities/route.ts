import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    modes: ['general', 'content', 'code', 'education'],
    tasks: [
      'generate_text',
      'generate_news_draft',
      'suggest_game_embeds',
      'code_analysis'
    ],
    training: {
      enabled: true,
      export: true,
      pipeline: 'structured-feedback-loop'
    },
    auth: {
      header: 'x-aillame-api-key',
      bearerSupported: true
    }
  });
}
