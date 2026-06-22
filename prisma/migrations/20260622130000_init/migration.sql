-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TranscriptSourceType" AS ENUM ('YOUTUBE', 'UPLOAD');

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "UserWordStatus" AS ENUM ('KNOWN', 'UNKNOWN', 'LEARNING', 'MASTERED');

-- CreateEnum
CREATE TYPE "ReviewResult" AS ENUM ('CORRECT', 'WRONG', 'AGAIN', 'EASY');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "nickname" TEXT NOT NULL,
    "provider" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER,
    "title" TEXT,
    "sourceType" "TranscriptSourceType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "fullText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" SERIAL NOT NULL,
    "transcriptId" INTEGER NOT NULL,
    "startSec" DOUBLE PRECISION,
    "endSec" DOUBLE PRECISION,
    "text" TEXT NOT NULL,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "lemma" TEXT,
    "meaningKo" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "difficulty" "CEFRLevel",
    "coreMeaningKo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMeaning" (
    "id" SERIAL NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "meaningKo" TEXT NOT NULL,
    "explanationKo" TEXT,
    "exampleSentence" TEXT,
    "exampleMeaningKo" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptVocabulary" (
    "id" SERIAL NOT NULL,
    "transcriptId" INTEGER NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "segmentId" INTEGER,
    "sentence" TEXT NOT NULL,
    "sentenceKo" TEXT,
    "startSec" DOUBLE PRECISION,
    "endSec" DOUBLE PRECISION,

    CONSTRAINT "TranscriptVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabulary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "status" "UserWordStatus" NOT NULL DEFAULT 'UNKNOWN',
    "memo" TEXT,
    "reviewQueuedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabularyExample" (
    "id" SERIAL NOT NULL,
    "userVocabularyId" INTEGER NOT NULL,
    "transcriptVocabularyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVocabularyExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "result" "ReviewResult" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_youtubeUrl_key" ON "Video"("youtubeUrl");

-- CreateIndex
CREATE INDEX "Transcript_videoId_idx" ON "Transcript"("videoId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_transcriptId_idx" ON "TranscriptSegment"("transcriptId");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_word_key" ON "Vocabulary"("word");

-- CreateIndex
CREATE INDEX "Vocabulary_lemma_idx" ON "Vocabulary"("lemma");

-- CreateIndex
CREATE INDEX "Vocabulary_difficulty_idx" ON "Vocabulary"("difficulty");

-- CreateIndex
CREATE INDEX "WordMeaning_vocabularyId_idx" ON "WordMeaning"("vocabularyId");

-- CreateIndex
CREATE INDEX "TranscriptVocabulary_vocabularyId_idx" ON "TranscriptVocabulary"("vocabularyId");

-- CreateIndex
CREATE INDEX "TranscriptVocabulary_segmentId_idx" ON "TranscriptVocabulary"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptVocabulary_transcriptId_vocabularyId_sentence_key" ON "TranscriptVocabulary"("transcriptId", "vocabularyId", "sentence");

-- CreateIndex
CREATE INDEX "UserVocabulary_userId_status_idx" ON "UserVocabulary"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabulary_userId_vocabularyId_key" ON "UserVocabulary"("userId", "vocabularyId");

-- CreateIndex
CREATE INDEX "UserVocabularyExample_transcriptVocabularyId_idx" ON "UserVocabularyExample"("transcriptVocabularyId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabularyExample_userVocabularyId_transcriptVocabulary_key" ON "UserVocabularyExample"("userVocabularyId", "transcriptVocabularyId");

-- CreateIndex
CREATE INDEX "ReviewHistory_userId_reviewedAt_idx" ON "ReviewHistory"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewHistory_vocabularyId_idx" ON "ReviewHistory"("vocabularyId");

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptVocabulary" ADD CONSTRAINT "TranscriptVocabulary_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptVocabulary" ADD CONSTRAINT "TranscriptVocabulary_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptVocabulary" ADD CONSTRAINT "TranscriptVocabulary_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabularyExample" ADD CONSTRAINT "UserVocabularyExample_userVocabularyId_fkey" FOREIGN KEY ("userVocabularyId") REFERENCES "UserVocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabularyExample" ADD CONSTRAINT "UserVocabularyExample_transcriptVocabularyId_fkey" FOREIGN KEY ("transcriptVocabularyId") REFERENCES "TranscriptVocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
