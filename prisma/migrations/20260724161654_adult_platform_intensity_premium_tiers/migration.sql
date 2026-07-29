-- CreateEnum
CREATE TYPE "ContentIntensity" AS ENUM ('MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'VIP');

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Manga" ADD COLUMN     "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "intensity" "ContentIntensity" NOT NULL DEFAULT 'MODERATE',
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "tierUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_mangaId_idx" ON "Review"("mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_mangaId_userId_key" ON "Review"("mangaId", "userId");

-- CreateIndex
CREATE INDEX "Manga_intensity_idx" ON "Manga"("intensity");

-- CreateIndex
CREATE INDEX "Manga_isPremium_idx" ON "Manga"("isPremium");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
