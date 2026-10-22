# Kalori Hesaplayıcı — Düzenleme Planı

## 1. Mevcut durum

Proje bugün tamamen istemci tarafında çalışan statik bir uygulamadır.

- `index.html` hesaplayıcı, besin günlüğü, menü önerileri, antrenman kaydı, grafikler ve barkod aramayı tek dosyada topluyor.
- `gunluk.html`, günlüğün daha eski ve ayrı bir sürümünü içeriyor; iki uygulama zamanla birbirinden kopmuş durumda.
- Kullanıcı verileri `localStorage` içinde tutuluyor. Hesap, cihazlar arası eşitleme, yedekleme ve sunucu tarafı doğrulama yok.
- Besin fotoğrafları Unsplash'tan, barkod verisi Open Food Facts API'sinden doğrudan tarayıcı üzerinden geliyor.
- Otomatik test, paket yönetimi, kod kalite araçları, CI ve sürümleme altyapısı yok.

## 2. Hedef ürün yapısı

İlk hedef, sağlık uygulaması görünümünde sade ve güven veren bir deneyim oluşturmaktır:

1. **Bugün:** Kalori/makro özeti ve hızlı öğün ekleme
2. **Günlük:** Tarihe ve öğüne göre kayıtlar
3. **İlerleme:** Kilo ve kalori grafikleri
4. **Planlar:** Menü ve egzersiz önerileri
5. **Profil:** Kişisel ölçüler, hedef ve tercihler

Önerilen teknik hedef:

- Frontend: Vite + React + TypeScript
- Stil: CSS değişkenleri ve küçük bir proje içi tasarım sistemi
- Backend: Node.js + Fastify + TypeScript
- Veritabanı: PostgreSQL
- API: REST, OpenAPI şeması ve istek doğrulama
- Kimlik doğrulama: e-posta/parola veya magic link; güvenli HTTP-only oturum çerezi
- Test: Vitest, Testing Library ve Playwright
- Dağıtım: frontend ve API için ayrı servisler; yönetilen PostgreSQL

React zorunlu değildir. İlk aşama mevcut davranışı modüler TypeScript'e taşıyıp sonra ekranları React bileşenlerine dönüştürecek şekilde de yürütülebilir.

## 3. Görsel ve UX planı

### Öncelik 0 — Bilgi mimarisi

- Tek uzun sayfayı yukarıdaki beş ana alana ayır.
- Ana ekranda yalnızca günlük özet, hızlı ekleme ve son öğünleri göster.
- Haftalık menü, antrenman ve barkod araçlarını ayrı ekran/sekme yap.
- `gunluk.html` kopyasını kaldırmadan önce yönlendirme veya uyumluluk sayfasına dönüştür.
- Sağlık uyarılarını görünür ama kullanıcı akışını bozmayan ortak bir bileşende topla.

### Öncelik 1 — Tasarım sistemi

- Renk, tipografi, boşluk, gölge, radius ve durum renklerini tasarım token'larına bağla.
- Birincil/ikincil/tehlikeli butonları ayır; “Sil” ve “Bu günü temizle” işlemlerini kırmızı tehlike stiliyle göster.
- Kart, form alanı, seçim kontrolü, bildirim, boş durum, modal ve skeleton bileşenleri oluştur.
- Açık/koyu tema desteği ekle; mevcut yeşil tonunu marka rengi olarak koru.
- Harici yemek fotoğraflarını dekoratif öğe olarak azalt; tutarlı ikon veya yerel görsel seti kullan.

### Öncelik 1 — Ana gösterge paneli

- Günlük kaloriyi halka grafik, protein/karbonhidrat/yağı üç ayrı ilerleme çubuğu ile göster.
- “Kalan / aşılan” değerini renk ve metinle birlikte sun; yalnızca renge bağlı anlatımdan kaçın.
- Öğünleri kahvaltı, öğle, akşam ve ara öğün olarak grupla.
- Her öğün grubunda “+ Besin ekle” hızlı eylemi kullan.
- Hedef hesaplandıktan sonra sonucu günlük hedefe aktarmak için açık bir CTA ekle.

### Öncelik 2 — Besin ekleme deneyimi

- Arama, barkod ve son kullanılanlar için sekmeli bir ekleme paneli tasarla.
- Besin seçildikten sonra porsiyon, gram ve besin değerlerini tek özet kartında göster.
- “Seç” ve “Ekle” şeklindeki çift eylemi tek, anlaşılır akışa indir.
- Aramaya debounce, eşleşen metni vurgulama ve kategori filtresi ekle.
- Yükleniyor, sonuç yok, ağ hatası ve eksik besin değeri durumlarını ayrı ayrı tasarla.

### Öncelik 2 — Mobil ve erişilebilirlik

- 360, 390, 768, 1024 ve 1440 px genişliklerde görsel regresyon kontrolü yap.
- Mobilde tablo yerine kart/list görünümü kullan; yatay kaydırmayı kaldır.
- Dokunma hedeflerini en az 44×44 px yap.
- Klavye odağı, form hata ilişkileri, `aria-live` kullanımı ve kontrastı WCAG 2.2 AA'ya göre denetle.
- Hareket azaltma tercihini koru ve grafiklere metinsel özet ekle.

## 4. Frontend kod planı

Önerilen klasör yapısı:

```text
src/
  app/
  components/
  features/
    calculator/
    diary/
    foods/
    progress/
    workouts/
  services/
  store/
  styles/
  types/
```

- Sabit besin, porsiyon, menü ve egzersiz verilerini JavaScript'ten JSON/TS modüllerine çıkar.
- Hesaplama fonksiyonlarını DOM'dan bağımsız saf fonksiyonlar yap.
- `localStorage` erişimini tek bir veri katmanına al ve şema sürümü/migrasyon desteği ekle.
- Besin kayıtlarında dizi indisi yerine kalıcı bir `foodId` kullan. Mevcut indis yaklaşımı, besin listesi sıralandığında eski kayıtları bozabilir.
- Ağ çağrılarını tek servis katmanından yönet; timeout, hata sınıfları ve iptal desteğini standartlaştır.
- Tekrarlanan günlük kodunu kaldır ve tek kaynak kullan.
- İç içe eklenen script/style bloklarını ayrı dosyalara ayır.
- ESLint, Prettier, TypeScript strict mode ve commit öncesi kontroller ekle.

## 5. Backend planı

### Veri modeli

- `users`: hesap ve oturum bilgileri
- `profiles`: doğum yılı/yaş, cinsiyet seçimi, boy, aktivite seviyesi ve tercihlerin güncel sürümü
- `goals`: tarih aralıklı kalori ve makro hedefleri
- `foods`: doğrulanmış yerel besinler ve veri kaynağı
- `food_portions`: porsiyon adı ve gram karşılığı
- `diary_entries`: kullanıcı, tarih, öğün, besin, miktar ve kaydedildiği andaki besin değerleri
- `weight_entries`: tarih ve kilo
- `workout_entries`: hareket, set, tekrar ve ağırlık
- `saved_plans`: oluşturulan menü/egzersiz planlarının sürümlü kopyası

Besin değerleri günlük kaydına snapshot olarak yazılmalıdır. Böylece merkezi besin verisi daha sonra değişse bile geçmiş toplamlar değişmez.

### İlk API yüzeyi

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /me
GET    /foods?q=&page=
GET    /foods/barcode/:barcode
GET    /diary?date=YYYY-MM-DD
POST   /diary/entries
PATCH  /diary/entries/:id
DELETE /diary/entries/:id
GET    /progress?from=&to=
POST   /weights
POST   /workouts
GET    /export/diary.csv
```

### Güvenlik ve veri kalitesi

- Bütün girdileri sunucuda şema ile doğrula; kullanıcı sahipliğini her sorguda uygula.
- Parolaları güçlü bir parola KDF'i ile sakla; oturum çerezlerinde `HttpOnly`, `Secure` ve uygun `SameSite` ayarlarını kullan.
- Oran sınırlama, CORS allowlist, güvenlik başlıkları, audit log ve merkezi hata yönetimi ekle.
- Open Food Facts çağrılarını backend üzerinden önbellekle; yanıtı doğrula ve istemciye yalnızca gerekli alanları döndür.
- Sağlık verisi niteliğindeki ölçümleri minimum düzeyde topla; hesap silme ve veri dışa aktarma akışlarını baştan tasarla.
- Günlük tarihlerini kullanıcının saat dilimiyle sakla; olay zamanlarını UTC tut.

## 6. Geçiş ve teslim sırası

### Sprint 0 — Temel güvence (1–2 gün)

- Mevcut akışlar için karakterizasyon testleri yaz.
- Hesaplama formülü, toplamlar, CSV ve localStorage şemasını belgeleyip sabitle.
- Basit Vite/TypeScript yapısı, lint ve CI ekle.

### Sprint 1 — Ayrıştırma (3–5 gün)

- CSS ve JavaScript'i modüllere böl.
- Kalıcı `foodId` modeline geçiş migrasyonu yaz.
- `gunluk.html` tekrarını kaldır veya ana uygulamaya yönlendir.
- Kritik hesaplama ve günlük fonksiyonlarına birim testi ekle.

### Sprint 2 — Görsel yenileme (5–8 gün)

- Yeni navigasyon, dashboard ve mobil öğün kartlarını uygula.
- Besin ekleme panelini sadeleştir.
- Erişilebilirlik ve responsive testlerini tamamla.

### Sprint 3 — Backend MVP (7–10 gün)

- PostgreSQL şeması, migrasyonlar, auth ve günlük CRUD API'sini kur.
- Open Food Facts proxy/cache katmanını ekle.
- API entegrasyon ve yetkilendirme testlerini yaz.

### Sprint 4 — Senkronizasyon (4–6 gün)

- İlk girişte mevcut localStorage verisini kullanıcı onayıyla API'ye taşı.
- Offline değişiklik kuyruğu ve çakışma stratejisi ekle.
- CSV dışa aktarmayı sunucu tarafına da taşı.

### Sprint 5 — İlerleme ve yayın (4–6 gün)

- Grafik, kilo ve antrenman uçlarını bağla.
- İzleme, hata raporlama, yedekleme ve geri yükleme prosedürlerini kur.
- Lighthouse, erişilebilirlik, performans ve güvenlik kontrollerini geçip yayına al.

## 7. Kabul ölçütleri

- BMR/TDEE sonuçları mevcut uygulamanın doğrulanmış sonuçlarıyla uyumlu.
- Günlük toplamları ve CSV çıktısı aynı girdiler için deterministik.
- Kullanıcı yalnızca kendi kayıtlarına erişebiliyor.
- 360 px genişlikte yatay sayfa kaydırması yok.
- Temel akışlar yalnızca klavyeyle tamamlanabiliyor.
- Ana ekran ilk yüklemede hızlı bağlantıda 2,5 saniye altında LCP hedefliyor.
- Kritik API uçlarında entegrasyon testleri ve frontend'in temel kullanıcı akışlarında uçtan uca testler var.
- Open Food Facts veya görsel servisi çalışmadığında günlük kayıt akışı çalışmaya devam ediyor.

## 8. İlk uygulanacak iş listesi

1. Vite + TypeScript ve test altyapısını ekle.
2. Hesaplama ve günlük kodunu ayrı modüllere çıkar.
3. Besin kayıtlarını kalıcı kimliğe geçir.
4. Eski `gunluk.html` yolunu tek uygulamaya yönlendir.
5. Dashboard ve mobil öğün kartlarının tasarımını uygula.
6. PostgreSQL şemasını ve günlük CRUD API'sini kur.
7. Giriş, veri taşıma ve cihazlar arası senkronizasyonu ekle.
8. Erişilebilirlik, performans ve güvenlik kontrollerini tamamla.

