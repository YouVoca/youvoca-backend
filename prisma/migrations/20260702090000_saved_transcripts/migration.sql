-- CreateTable
CREATE TABLE "SavedTranscript" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transcriptId" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedTranscript_userId_transcriptId_key" ON "SavedTranscript"("userId", "transcriptId");

-- CreateIndex
CREATE INDEX "SavedTranscript_userId_savedAt_idx" ON "SavedTranscript"("userId", "savedAt");

-- CreateIndex
CREATE INDEX "SavedTranscript_transcriptId_idx" ON "SavedTranscript"("transcriptId");

-- AddForeignKey
ALTER TABLE "SavedTranscript" ADD CONSTRAINT "SavedTranscript_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTranscript" ADD CONSTRAINT "SavedTranscript_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;
