use std::io::{self, BufRead, Write};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
enum SidecarToMainMessage {
    RuntimeHello { version: String },
    RuntimeReady,
    Heartbeat { status: String },
    #[serde(other)]
    Unknown,
}

fn main() {
    // Aillame Sidecar Runtime Mock
    // Bu binary, Tauri ana süreci ile JSON üzerinden haberleşir.
    
    // 1. Hello mesajı gönder
    let hello = SidecarToMainMessage::RuntimeHello { version: "1.3.0-stable".to_string() };
    if let Ok(json) = serde_json::to_string(&hello) {
        println!("{}", json);
        let _ = io::stdout().flush();
    }

    // 2. Ready mesajı gönder (UI'ın 'Açık' durumuna geçmesini sağlar)
    let ready = SidecarToMainMessage::RuntimeReady;
    if let Ok(json) = serde_json::to_string(&ready) {
        println!("{}", json);
        let _ = io::stdout().flush();
    }

    // 3. Standart girdi döngüsü (Komutları dinle)
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        if let Ok(l) = line {
            let l_trimmed = l.trim();
            if l_trimmed.is_empty() { continue; }

            // Kapatma komutu kontrolü
            if l_trimmed.contains("\"shutdown\"") || l_trimmed.contains("exit") {
                break;
            }

            // Herhangi bir komuta heartbeat ile cevap ver (Canlılık kanıtı)
            let hb = SidecarToMainMessage::Heartbeat { status: "active".to_string() };
            if let Ok(json) = serde_json::to_string(&hb) {
                println!("{}", json);
                let _ = io::stdout().flush();
            }
        }
    }
}
