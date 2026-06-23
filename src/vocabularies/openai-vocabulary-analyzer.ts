import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { VOCABULARY_ANALYSIS_SYSTEM_PROMPT } from './prompts/vocabulary-analysis.prompt';

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

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

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
    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || DEFAULT_OPENAI_MODEL;
    const response = await this.parseWithOpenAi(client, model, input);

    if (!response.output_parsed) {
      throw new ServiceUnavailableException(
        'OpenAI가 분석 결과를 생성하지 못했습니다.',
      );
    }
    return response.output_parsed;
  }

  private async parseWithOpenAi(
    client: OpenAI,
    model: string,
    input: AnalyzeInput,
  ) {
    try {
      return await client.responses.parse({
        model,
        store: false,
        input: [
          {
            role: 'system',
            content: VOCABULARY_ANALYSIS_SYSTEM_PROMPT,
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
          verbosity: 'medium',
          format: zodTextFormat(
            vocabularyAnalysisSchema,
            'vocabulary_analysis',
          ),
        },
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `OpenAI 단어 분석 요청에 실패했습니다. 모델(${model})과 OPENAI_API_KEY 설정을 확인해 주세요. ${this.describeOpenAiError(error)}`,
        { cause: error },
      );
    }
  }

  private describeOpenAiError(error: unknown) {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return String(error);
  }
}
