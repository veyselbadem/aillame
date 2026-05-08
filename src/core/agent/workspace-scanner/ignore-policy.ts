export const IGNORE_DIRECTORIES = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  ".vscode",
  ".idea",
  "igm-venv",
  "venv",
  "env",
  "__pycache__",
  ".aillame-data",
  "logs",
  "tmp",
  "temp"
];

export const IGNORE_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "worker_stderr.log",
  "image-jobs.jsonl",
  "api-keys.jsonl",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml"
];

export const IGNORE_EXTENSIONS = [
  ".gguf",
  ".safetensors",
  ".bin",
  ".onnx",
  ".pt",
  ".pth",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".zip",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".sqlite",
  ".db",
  ".log"
];

export const SECRET_PATTERNS = [
  "pem",
  "key",
  "crt",
  "p12",
  "secret",
  "token",
  "password",
  ".env"
];
