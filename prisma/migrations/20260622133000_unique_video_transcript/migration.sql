-- CreateIndex
CREATE UNIQUE INDEX "Transcript_videoId_language_sourceType_key" ON "Transcript"("videoId", "language", "sourceType");
