import { Module } from '@nestjs/common';
import { OpenAiVocabularyAnalyzer } from './openai-vocabulary-analyzer';
import { VocabulariesController } from './vocabularies.controller';
import { VocabulariesService } from './vocabularies.service';

@Module({
  controllers: [VocabulariesController],
  providers: [VocabulariesService, OpenAiVocabularyAnalyzer],
})
export class VocabulariesModule {}
