-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_idx" ON "EmailChangeToken"("userId");
