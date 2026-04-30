import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class AiSummaryService {
  private client: Groq | null = null;
  private model: string;
  private initialized = false;

  constructor() {
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  private ensureInitialized() {
    if (this.initialized) return;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY environment variable is required for AI summary generation',
      );
    }

    this.client = new Groq({ apiKey });
    this.initialized = true;
  }

  async summarize(text: string): Promise<string> {
    this.ensureInitialized();

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý viết tóm tắt workshop bằng tiếng Việt, súc tích, rõ ràng, 3-5 câu, không dùng gạch đầu dòng.',
        },
        {
          role: 'user',
          content: `Tóm tắt nội dung sau (3-5 câu, tiếng Việt):\n\n${text}`,
        },
      ],
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim() || '';

    if (!summary) {
      throw new Error('Groq returned an empty summary');
    }

    return summary;
  }
}
