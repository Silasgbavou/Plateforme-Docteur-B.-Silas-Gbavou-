/** Génère l'empreinte scrypt du mot de passe administrateur (saisi sur stdin, jamais en argument). */
import { createInterface } from "node:readline/promises";
import { hashPassword } from "@/lib/server/password";

const rl = createInterface({ input: process.stdin, output: process.stderr });
const pwd = (await rl.question("Mot de passe administrateur (12 caractères minimum) : ")).trim();
rl.close();
if (pwd.length < 12) {
  console.error("Mot de passe trop court.");
  process.exit(1);
}
console.log(hashPassword(pwd));
