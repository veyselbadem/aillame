# Design System: Aillame Premium UI/UX (Aesthetics 2026)

Bu belge, Aillame ve bağlı projelerin (BOSS, Doomsgame) görsel kimliğini "Premium" seviyeye taşımak için gereken tasarım prensiplerini ve CSS tekniklerini içerir.

## 1. Görsel Dil (Aesthetics)

- **Tema:** Derin Uzay Siyahı (#050505) ana zemin.
- **Vurgu Renkleri:** 
  - `Electric Indigo` (#6366F1) - Ana eylem rengi.
  - `Cyber Cyan` (#06B6D4) - Veri ve stats rengi.
  - `Neural Gold` (#F59E0B) - Uyarı ve zeka simgesi.
- **Typography:** "Inter" veya "Outfit" (Google Fonts). Okunabilirlik için geniş karakter aralığı.

## 2. Glassmorphism & Depth (Derinlik)

Pencereler ve kartlar, arka planı buzlu cam efektiyle göstermelidir.

```css
.premium-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

## 3. Micro-Animations (Mikro Animasyonlar)

Yapay zekanın "yaşadığını" hissettirmek için:

- **Neural Pulse:** Model işlem yaparken arkada yavaşça yanıp sönen bir aura.
- **Smooth Transitions:** Sayfa geçişlerinde `framer-motion` ile 0.3s'lik "fade-and-scale" efekti.
- **Hover States:** Düğmelere gelindiğinde hafif bir parlama (glow) ve yukarı kalkma (lift) hareketi.

```css
@keyframes glow {
  from { box-shadow: 0 0 5px #6366F1; }
  to { box-shadow: 0 0 20px #6366F1; }
}
```

## 4. Dashboard Yerleşimi (Layout)

- **Sidebar:** Minimalist, sadece ikonlar. Üzerine gelindiğinde (hover) açıklamalar açılır.
- **Main View:** Bilgi yoğunluğunu azaltmak için geniş beyaz (veya siyah) alanlar.
- **Glass Side-Panel:** Sağ tarafta canlı stats (Loss, CPU, Token/s) paneli.

## 5. Uygulama Planı

1. [ ] Global `variables.css` dosyasına renk paletini ekle.
2. [ ] `framer-motion` kütüphanesini projeye dahil et.
3. [ ] Tüm butonları ve input alanlarını "Premium" komponentlere dönüştür.
