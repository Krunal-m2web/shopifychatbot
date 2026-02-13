import { runMigration } from "../utils/migrate.server";

runMigration().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
