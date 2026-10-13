import { db } from "@/lib/server/db";
import { seedCatalog } from "@/lib/server/catalog";

// db() applique les migrations ; le catalogue initial est inséré s'il manque (idempotent).
db();
seedCatalog();
const rows = db().prepare("SELECT name FROM _migrations ORDER BY name").all() as { name: string }[];
console.log(`Migrations appliquées : ${rows.map((r) => r.name).join(", ")}`);
