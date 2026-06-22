import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { CEFRLevel, TranscriptSegment, UserWordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeVocabularyDto } from './dto/analyze-vocabulary.dto';
import { OpenAiVocabularyAnalyzer } from './openai-vocabulary-analyzer';

@Injectable()
export class VocabulariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: OpenAiVocabularyAnalyzer,
  ) {}

  async analyze(userId: number, dto: AnalyzeVocabularyDto) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: dto.transcriptId },
      include: { segments: { orderBy: { startSec: 'asc' } } },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');

    const transcriptInput = this.formatTranscript(
      transcript.fullText,
      transcript.segments,
    );
    if (transcriptInput.length > 120_000) {
      throw new PayloadTooLargeException(
        '분석 가능한 대본 길이를 초과했습니다.',
      );
    }

    const knownWords = dto.excludeKnownWords
      ? await this.prisma.userVocabulary.findMany({
          where: {
            userId,
            status: { in: [UserWordStatus.KNOWN, UserWordStatus.MASTERED] },
          },
          select: { vocabulary: { select: { word: true, lemma: true } } },
        })
      : [];
    const excluded = [
      ...new Set(
        knownWords.flatMap(({ vocabulary }) =>
          [vocabulary.word, vocabulary.lemma].filter((word): word is string =>
            Boolean(word),
          ),
        ),
      ),
    ];
    const analysis = await this.analyzer.analyze({
      targetLevel: dto.targetLevel,
      knownWords: excluded,
      transcript: transcriptInput,
    });

    const segmentMap = new Map(
      transcript.segments.map((segment) => [segment.id, segment]),
    );
    const words = await this.prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of analysis.words) {
        const word = item.word.trim().toLowerCase();
        const vocabulary = await tx.vocabulary.upsert({
          where: { word },
          update: {
            lemma: item.lemma.trim().toLowerCase(),
            meaningKo: item.meaningKo,
            partOfSpeech: item.partOfSpeech,
            difficulty: item.difficulty as CEFRLevel,
            coreMeaningKo: item.coreMeaningKo,
          },
          create: {
            word,
            lemma: item.lemma.trim().toLowerCase(),
            meaningKo: item.meaningKo,
            partOfSpeech: item.partOfSpeech,
            difficulty: item.difficulty as CEFRLevel,
            coreMeaningKo: item.coreMeaningKo,
          },
        });

        await tx.wordMeaning.deleteMany({
          where: { vocabularyId: vocabulary.id },
        });
        if (item.meanings.length) {
          await tx.wordMeaning.createMany({
            data: item.meanings.map((meaning, index) => ({
              vocabularyId: vocabulary.id,
              ...meaning,
              order: index + 1,
            })),
          });
        }

        const segment = item.segmentId
          ? segmentMap.get(item.segmentId)
          : undefined;
        const occurrence = await tx.transcriptVocabulary.upsert({
          where: {
            transcriptId_vocabularyId_sentence: {
              transcriptId: transcript.id,
              vocabularyId: vocabulary.id,
              sentence: item.sentence,
            },
          },
          update: {
            sentenceKo: item.sentenceKo,
            segmentId: segment?.id,
            startSec: segment?.startSec ?? item.startSec,
            endSec: segment?.endSec ?? item.endSec,
          },
          create: {
            transcriptId: transcript.id,
            vocabularyId: vocabulary.id,
            sentence: item.sentence,
            sentenceKo: item.sentenceKo,
            segmentId: segment?.id,
            startSec: segment?.startSec ?? item.startSec,
            endSec: segment?.endSec ?? item.endSec,
          },
        });
        saved.push({
          ...vocabulary,
          ...occurrence,
          vocabularyId: vocabulary.id,
        });
      }
      return saved;
    });

    return { transcriptId: transcript.id, words };
  }

  private formatTranscript(fullText: string, segments: TranscriptSegment[]) {
    if (!segments.length) return fullText;
    return segments
      .map(
        (segment) =>
          `<segment id="${segment.id}" start="${segment.startSec ?? ''}" end="${segment.endSec ?? ''}">${segment.text}</segment>`,
      )
      .join('\n');
  }
}
