ALTER TABLE "Store" ADD COLUMN "pageSetupVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StorePage" ADD COLUMN "showInNavigation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "navigationPosition" INTEGER NOT NULL DEFAULT 0;
UPDATE "StorePage" SET "showInNavigation" = false WHERE "slug" = 'home';
