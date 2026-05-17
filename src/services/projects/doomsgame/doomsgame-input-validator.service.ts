import { DoomsgamePlanRequest } from "./doomsgame.types";
import { isAbsolute } from "path";

export class DoomsgameInputValidator {
  private static MAX_PROMPT_LENGTH = 4000;

  static validate(request: DoomsgamePlanRequest): { valid: boolean; error?: string; code?: string } {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return { valid: false, code: "DOOMSGAME_PROMPT_REQUIRED", error: "Oyun planı üretmek için bir prompt gereklidir." };
    }

    if (request.prompt.length > this.MAX_PROMPT_LENGTH) {
      return { valid: false, code: "DOOMSGAME_PROMPT_TOO_LONG", error: `Prompt maksimum ${this.MAX_PROMPT_LENGTH} karakter olabilir.` };
    }

    if (request.projectPath) {
      if (!isAbsolute(request.projectPath)) {
        return { valid: false, code: "DOOMSGAME_PROJECT_PATH_NOT_ABSOLUTE", error: "Proje yolu mutlak (absolute) bir yol olmalıdır." };
      }
    }

    return { valid: true };
  }
}
