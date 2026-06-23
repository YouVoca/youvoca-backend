import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { VideosModule } from './videos/videos.module';
import { VocabulariesModule } from './vocabularies/vocabularies.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    AuthModule,
    TranscriptsModule,
    VideosModule,
    VocabulariesModule,
    ReviewsModule,
    StatisticsModule,
    HealthModule,
  ],
})
export class AppModule {}
