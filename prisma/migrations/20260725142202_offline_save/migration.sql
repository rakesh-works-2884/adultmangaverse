-- CreateTable
CREATE TABLE "OfflineSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfflineSave_userId_idx" ON "OfflineSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSave_userId_mangaId_key" ON "OfflineSave"("userId", "mangaId");

-- AddForeignKey
ALTER TABLE "OfflineSave" ADD CONSTRAINT "OfflineSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineSave" ADD CONSTRAINT "OfflineSave_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
