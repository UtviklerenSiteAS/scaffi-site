-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "businessHours" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessRating" DOUBLE PRECISION,
ADD COLUMN     "htmlContent" TEXT,
ADD COLUMN     "prospectId" TEXT;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
