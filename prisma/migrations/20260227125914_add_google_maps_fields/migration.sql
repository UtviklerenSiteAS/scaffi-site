/*
  Warnings:

  - A unique constraint covering the columns `[placeId]` on the table `prospects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "address" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "prospects_placeId_key" ON "prospects"("placeId");
