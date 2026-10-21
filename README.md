# Kalori Hesaplayıcı

Webte çalışan, Türkçe arayüzlü günlük kalori ihtiyacı hesaplama uygulaması. Tek bir HTML dosyasından oluşur; herhangi bir statik sunucuda veya doğrudan tarayıcıda çalışır.

## Özellikler

- **Bazal metabolizma hızı (BMR)** hesabı — Mifflin-St Jeor formülü
- **Günlük kalori ihtiyacı (TDEE)** — 5 aktivite düzeyi (1,2 – 1,9 katsayıları)
- **Hedef seçimi** — kilo verme / koruma / alma (±500 kcal; haftalık tahmin gerçek açık/fazlaya göre hesaplanır, günlük 1.000 kcal altına inilmez)
- Girdi doğrulama: boş, geçersiz ve aralık dışı değerlerde alan bazlı hata mesajları
- Girdi değişince eski sonuç otomatik gizlenir (bayat sonuç kalmaz)
- Mobil ve masaüstü için duyarlı (responsive) tasarım

## Kullanım

`index.html` dosyasını tarayıcıda açman yeterli. Bir sunucuda barındırmak istersen:

```bash
npx serve .
```

## Nasıl hesaplanıyor?

**Erkek:** BMR = (10 × kilo) + (6,25 × boy) − (5 × yaş) + 5
**Kadın:** BMR = (10 × kilo) + (6,25 × boy) − (5 × yaş) − 161

**TDEE** = BMR × aktivite katsayısı

| Aktivite | Katsayı |
| --- | --- |
| Hareketsiz | 1,2 |
| Hafif aktif | 1,375 |
| Orta aktif | 1,55 |
| Çok aktif | 1,725 |
| Aşırı aktif | 1,9 |

## Not

Bu hesaplama 18 yaş ve üzeri yetişkinler için genel bir tahmindir; kişisel tıbbi veya beslenme önerisi değildir. Sağlık durumun için doktoruna veya diyetisyene danış.
