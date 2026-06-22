import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const cefrLevel = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

const vocabularyAnalysisSchema = z.object({
  words: z.array(
    z.object({
      word: z.string(),
      lemma: z.string(),
      meaningKo: z.string(),
      partOfSpeech: z.string(),
      difficulty: cefrLevel,
      coreMeaningKo: z.string(),
      sentence: z.string(),
      sentenceKo: z.string(),
      segmentId: z.number().int().nullable(),
      startSec: z.number().nullable(),
      endSec: z.number().nullable(),
      meanings: z.array(
        z.object({
          meaningKo: z.string(),
          explanationKo: z.string(),
          exampleSentence: z.string(),
          exampleMeaningKo: z.string(),
        }),
      ),
    }),
  ),
});

export type VocabularyAnalysis = z.infer<typeof vocabularyAnalysisSchema>;

type AnalyzeInput = {
  targetLevel: string;
  knownWords: string[];
  transcript: string;
};

@Injectable()
export class OpenAiVocabularyAnalyzer {
  constructor(private readonly config: ConfigService) {}

  async analyze(input: AnalyzeInput): Promise<VocabularyAnalysis> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY가 설정되지 않았습니다.',
      );
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.parse({
      model: this.config.get<string>('OPENAI_MODEL', 'gpt-5.5'),
      store: false,
      reasoning: { effort: 'low' },
      input: [
        {
          role: 'system',
          content:
            'You are an English vocabulary teacher for Korean learners. Extract only useful vocabulary and expressions from the supplied transcript. Preserve a source segment id when one is provided. Meanings, explanations, and sentence translations must be natural Korean. Do not return duplicate lemmas.',
        },
        {
          role: 'user',
          content: [
            `Target CEFR level: ${input.targetLevel}`,
            `Words to exclude: ${input.knownWords.length ? input.knownWords.join(', ') : '(none)'}`,
            'Transcript:',
            input.transcript,
          ].join('\n\n'),
        },
      ],
      text: {
        verbosity: 'low',
        format: zodTextFormat(vocabularyAnalysisSchema, 'vocabulary_analysis'),
      },
    });

    if (!response.output_parsed) {
      throw new ServiceUnavailableException(
        'OpenAI가 분석 결과를 생성하지 못했습니다.',
      );
    }
    return response.output_parsed;
  }
}
