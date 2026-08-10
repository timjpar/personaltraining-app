-- AlterTable
ALTER TABLE "User" ALTER COLUMN "units" SET DEFAULT 'IMPERIAL';

-- Everyone currently on metric is there because it used to be the default, not
-- because they chose it — the column cannot tell those apart, so this moves the
-- whole set. Anyone who did want kilos is one tap away from them again.
UPDATE "User" SET "units" = 'IMPERIAL' WHERE "units" = 'METRIC';
