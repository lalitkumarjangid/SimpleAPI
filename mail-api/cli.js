import { checkEmails } from "./mailVerifier.js";

const emails = process.argv.slice(2);

if (!emails.length) {
  console.log("Usage: node cli.js email1@domain.com email2@domain.com");
  process.exit(1);
}

const { results, reacher } = await checkEmails(emails);
console.log(JSON.stringify({ results, reacher }, null, 2));
