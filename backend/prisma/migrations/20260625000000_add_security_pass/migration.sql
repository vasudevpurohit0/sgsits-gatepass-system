-- AlterEnum
ALTER TYPE "PassType" ADD VALUE 'SECURITY_PASS';

-- AlterEnum
ALTER TYPE "PassStatus" ADD VALUE 'PENDING_SECURITY_APPROVAL';

-- AlterTable
ALTER TABLE "passes" ADD COLUMN     "whomToVisit" TEXT,
ADD COLUMN     "expectedDuration" TEXT,
ADD COLUMN     "visitorPhotoKey" TEXT,
ADD COLUMN     "approvalToken" TEXT,
ADD COLUMN     "approvalTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3);
