-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('client', 'executor', 'admin');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('buy_deliver', 'pickup_drop', 'simple_errand');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('draft', 'pending_confirm', 'published', 'accepted', 'in_progress', 'pending_client', 'completed', 'rated', 'cancelled', 'disputed');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('item_not_available', 'need_clarification', 'price_change', 'client_response', 'system_timeout', 'call_initiated');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('wrong_item', 'not_delivered', 'price_dispute', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('full_refund', 'partial_refund', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash_on_delivery', 'pseudo_escrow');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'client',
    "avatarUrl" TEXT,
    "pushToken" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationUpdatedAt" TIMESTAMP(3),
    "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cancellationCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "executorId" TEXT,
    "title" TEXT NOT NULL,
    "rawVoiceText" TEXT,
    "category" "TaskCategory" NOT NULL,
    "itemDescription" TEXT,
    "specialNotes" TEXT,
    "fromAddress" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toAddress" TEXT NOT NULL,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "priceSuggested" DECIMAL(10,2),
    "priceFinal" DECIMAL(10,2),
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "state" "TaskState" NOT NULL DEFAULT 'draft',
    "clarificationStep" INTEGER NOT NULL DEFAULT 0,
    "clarificationData" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT NOT NULL DEFAULT 'Belgrade',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_state_transitions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromState" "TaskState",
    "toState" "TaskState" NOT NULL,
    "triggeredBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_state_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_messages" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "content" TEXT,
    "photoUrl" TEXT,
    "options" JSONB,
    "selectedOption" TEXT,
    "priceProposed" DECIMAL(10,2),
    "priceAccepted" BOOLEAN,
    "expiresAt" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "disputeType" "DisputeType" NOT NULL,
    "description" TEXT,
    "evidenceUrls" JSONB NOT NULL DEFAULT '[]',
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution" "DisputeResolution",
    "refundAmount" DECIMAL(10,2),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "executorId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "escrowHeld" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "tasks_state_idx" ON "tasks"("state");

-- CreateIndex
CREATE INDEX "tasks_city_idx" ON "tasks"("city");

-- CreateIndex
CREATE INDEX "tasks_clientId_idx" ON "tasks"("clientId");

-- CreateIndex
CREATE INDEX "tasks_executorId_idx" ON "tasks"("executorId");

-- CreateIndex
CREATE INDEX "tasks_createdAt_idx" ON "tasks"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "task_state_transitions_taskId_idx" ON "task_state_transitions"("taskId");

-- CreateIndex
CREATE INDEX "task_messages_taskId_idx" ON "task_messages"("taskId");

-- CreateIndex
CREATE INDEX "ratings_rateeId_idx" ON "ratings"("rateeId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_taskId_raterId_key" ON "ratings"("taskId", "raterId");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_taskId_key" ON "disputes"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_taskId_key" ON "payments"("taskId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_state_transitions" ADD CONSTRAINT "task_state_transitions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_state_transitions" ADD CONSTRAINT "task_state_transitions_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

