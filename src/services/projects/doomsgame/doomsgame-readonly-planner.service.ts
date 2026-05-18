import { DoomsgamePlanRequest, ProjectScanSummary, DoomsgamePlanResult } from "./doomsgame.types";

export class DoomsgameReadOnlyPlanner {
  static plan(request: DoomsgamePlanRequest, scan: ProjectScanSummary): DoomsgamePlanResult {
    const genre = request.gameType || "platformer";
    const title = `Mini ${genre.charAt(0).toUpperCase() + genre.slice(1)}`;

    return {
      gameTitle: title,
      concept: `${title}, ${genre} türünde basit bir oyun konseptidir.`,
      genre: genre,
      coreLoop: "Oyuncu temel mekanikleri kullanarak hedefe ulaşmaya çalışır ve puan toplar.",
      mechanics: [
        "Hareket kontrolü",
        "Etkileşim (zıplama veya ateş etme)",
        "Düşman/Engel etkileşimi",
        "Skor sistemi"
      ],
      scenes: [
        "MainMenu",
        "Level1",
        "GameOver"
      ],
      filesToCreate: [
        { path: "scenes/level1.scene.json", purpose: "Ana oyun sahnesi", fileType: "scene" },
        { path: `scripts/player.${request.language === 'tr' ? 'controller' : 'ctrl'}.js`, purpose: "Oyuncu kontrolcü scripti", fileType: "script" },
        { path: "assets/player.asset.json", purpose: "Oyuncu görsel tanımı", fileType: "asset" }
      ],
      filesToModify: scan.scanned && scan.files.length > 0 ? [
        { path: scan.files[0].path, reason: "Mevcut projeye entegrasyon için güncellenmeli", safeToModify: false }
      ] : [],
      assetsNeeded: [
        { id: "player_sprite", type: "sprite", description: "Ana karakter görseli" },
        { id: "background_music", type: "music", description: "Seviye müziği" }
      ],
      projectContext: scan,
      permissionMode: "read_only",
      requiresUserApproval: true,
      safetyNotes: [
        "Bu fazda hiçbir dosya oluşturulmadı veya değiştirilmedi.",
        "Plan sadece bir öneridir ve kullanıcı onayı olmadan uygulanmaz.",
        "Proje taraması sadece read-only yetkisiyle yapılmıştır."
      ],
      nextSteps: [
        "Oyun planını gözden geçirin.",
        "Gerekli assetleri hazırlayın.",
        "Faz 9 sonrası otomatik kod üretimi için onay verin."
      ]
    };
  }
}
