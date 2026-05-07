const samples = [
  "ğ, ü, ş, ı, ö, ç",
  "Aillame",
  "BOSS AI",
  "Doomsgame Engine",
  "Badem Akademi",
  "yürütmenin durdurulması",
  "öğrenci / öğretmen / geliştirici",
  "{\"taskType\":\"chat\",\"contentType\":\"text\",\"requiredCapabilities\":[\"text-generation\"]}",
  "type Result = { success: boolean; value?: string };",
];

const baseChars = "\n\r\t !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ÇÖĞÜŞİçöğüşı";
const chars = Array.from(new Set(baseChars));
const stoi = new Map(chars.map((char, index) => [char, index]));
const itos = new Map(chars.map((char, index) => [index, char]));

function encode(text) {
  return Array.from(text).map((char) => stoi.get(char) ?? 0);
}

function decode(tokens) {
  return tokens.map((token) => itos.get(token) ?? "").join("");
}

const results = samples.map((input) => {
  const tokens = encode(input);
  const decoded = decode(tokens);
  const same = decoded === input;
  const hasTurkish = /[ğüşıöçĞÜŞİÖÇ]/u.test(input);
  const turkishOk = !hasTurkish || same;
  const structuredOk = !/[{}[\];:=]/u.test(input) || same;
  return {
    input,
    inputLength: Array.from(input).length,
    tokenCount: tokens.length,
    decodedMatchesInput: same,
    turkishCharactersOk: turkishOk,
    structuredSymbolsOk: structuredOk,
  };
});

const failed = results.filter((result) => (
  !result.decodedMatchesInput
  || !result.turkishCharactersOk
  || !result.structuredSymbolsOk
));

console.log(JSON.stringify({
  success: failed.length === 0,
  tokenizer: "char-level-safe-diagnostic",
  vocabSize: 256,
  activeCharacters: chars.length,
  results,
}, null, 2));

if (failed.length > 0) process.exit(1);
