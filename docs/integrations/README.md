# Aillame External Provider Integration Guide

Aillame Hub, farklı projelerin AI ihtiyaçlarını karşılamak üzere tasarlanmış merkezi bir provider katmanıdır.

## Desteklenen Projeler (Presets)

### 1. BOSS AI (Economy/Finance)
- **ProjectId:** `boss-ai`
- **Default Mode:** `economy`
- **Scopes:** `chat:write`, `project:read`, `memory:read`
- **Ayrıntılar:** [BOSS AI Entegrasyonu](boss-ai-provider.md)

### 2. Doomsgame Engine (Code/Game-Dev)
- **ProjectId:** `doomsgame-engine`
- **Default Mode:** `code`
- **Scopes:** `chat:write`, `project:read`, `task:create`
- **Ayrıntılar:** [Doomsgame Engine Entegrasyonu](doomsgame-engine-provider.md)

### 3. Badem Akademi (Education)
- **ProjectId:** `badem-akademi`
- **Default Mode:** `education`
- **Scopes:** `chat:write`, `project:read`, `memory:read`
- **Ayrıntılar:** [Badem Akademi Entegrasyonu](badem-akademi-provider.md)

## Entegrasyon Yöntemleri

### Aillame Provider SDK
En temiz ve tip güvenli yöntemdir. `AillameClient` kullanarak proje bazlı çağrılar yapabilirsiniz.
[SDK Kullanım Örnekleri](sdk-usage.md)

### OpenAI-Compatible API
Standart OpenAI kütüphanelerini kullanarak bağlanabilirsiniz.
[OpenAI-Compatible Rehberi](openai-compatible-provider.md)

## E2E Doğrulama
Entegrasyonların güvenlik ve performans kurallarına uyup uymadığını aşağıdaki komutla test edebilirsiniz:
```bash
npm run smoke:provider-e2e
```
