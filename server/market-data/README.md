# Portal entegrasyonu (bu repoda nasıl bağlandı)

Bu klasör `server/market-data/` altında duruyor ve **zaten bağlı**; aşağıdaki "Kurulum" bölümü orijinal, genel anlatım.

- **Sayfa:** portalda `Market Data` menüsü → `/market` (React sayfası, dashboard'u iframe'de gösterir). HTML'i `GET /api/market-data/page`, veriyi `GET /api/market-data` verir; ikisi de portalın giriş (JWT) kontrolünün arkasında.
- **Rol:** `market` ("Market Data Only") rolü yalnızca bu sayfayı görür. Kısıt **sunucuda** zorlanır (`src/middleware/marketRole.js`): bu rolün token'ı başka hiçbir `/api` adresine erişemez.
- **Veri dosyası:** canlı dosya git'te değil, `UPLOADS_DIR/market-data.json` (ya da `MARKET_DATA_FILE`). `data/market-data.json` sadece **başlangıç verisi**; canlı dosya yoksa ilk kullanımda ondan kopyalanır. (Canlı dosya repoda olsaydı her `git pull` güncel veriyi eski haline döndürürdü.)
- **Günlük güncelleme:** sunucu açılınca `src/services/marketData.js` içindeki zamanlayıcı başlar: hafta içi, New York saatiyle 15:15'ten sonra bir kez `update.js` çalışır. `MARS_API_KEY` yoksa kapalıdır. Kapatmak için `MARKET_DATA_CRON=off`. Aynı gün içinde (elle çalıştırma dahil) güncellenmişse tekrar çalışmaz.
- **Gizli değişkenler:** `server/.env` içine `MARS_API_KEY=` ve `CENSUS_API_KEY=` ekleyin (koda yazılmaz, git'e girmez).
- **Elle çalıştırma (sunucuda, `server/` klasöründen):**
  ```
  node market-data/update.js --census
  node market-data/hal-history.js
  ```
  CLI araçlar `server/.env`'i kendisi okur.

---

# Sweet Fresh – Piyasa Verisi (Market Data) modülü

ABD'ye narenciye ve üzüm ithalatı panosu: hacim, FOB fiyatları, hal fiyatları, Census alış değeri, kârlılık hesabı.
Veriler sunucuda **her iş günü otomatik** olarak USDA ve Census API'lerinden çekilir. Terminal kullanmaya gerek kalmaz.

> **Portalı yapan Claude'a / yazılımcıya:** Bu klasörü portal projesine ekleyin ve aşağıdaki 5 adımı uygulayın.
> Ek npm paketi gerekmez (Node.js 18+ yeterli). Veritabanı gerekmez: tüm veri tek bir JSON dosyasında (~6 MB, yılda ~3–4 MB büyür).

---

## Klasör yapısı

```
market-data/
├── update.js                 # Veri güncelleyici (cron ile çalışır)
├── hal-history.js            # 10 yıllık hal geçmişi (bir kez çalıştırılır)
├── lib/
│   ├── convert.js            # Dönüştürme / birleştirme / sıkıştırma (panoyla birebir aynı mantık)
│   ├── usda.js               # USDA My Market News (MARS) API istemcisi
│   └── census.js             # Census ithalat değeri API istemcisi
├── data/
│   └── market-data.json      # Başlangıç verisi (Ocak 2024 – Kasım 2026, hazır)
├── public/
│   └── dashboard.html        # Pano sayfası (TR/EN), veriyi /api/market-data'dan çeker
├── examples/
│   └── express.js            # Express için hazır route örneği (giriş kontrollü)
├── .env.example
└── package.json
```

## Kurulum (5 adım)

### 1. API anahtarlarını sunucuya gizli değişken olarak ekleyin
Koda yazmayın; platformun "Environment Variables / Secrets" bölümüne girin:

| Değişken | Nereden | Zorunlu |
|---|---|---|
| `MARS_API_KEY` | mymarketnews.ams.usda.gov → giriş → adınızın altında | Evet |
| `CENSUS_API_KEY` | api.census.gov/data/key_signup.html | Census için |
| `MARKET_DATA_FILE` | Veri dosyasının yolu (kalıcı diskte olmalı) | Hayır (varsayılan `./data/market-data.json`) |

> ⚠️ Sunucu yeniden başlatılınca dosyalar siliniyorsa (ör. bazı serverless/container platformları), `MARKET_DATA_FILE`'ı **kalıcı bir diske** (volume) yönlendirin
> ya da dosyayı bir nesne depolamasına (S3 / R2 / Supabase Storage vb.) yazacak şekilde `update.js`'deki okuma/yazma satırlarını değiştirin.

### 2. İki adresi portala ekleyin — ikisi de SADECE giriş yapmış kullanıcılara açık olmalı

| Adres | Ne döner |
|---|---|
| `GET /market` | `public/dashboard.html` — sayfadaki `<!--SF_USER-->` yerine `<script>window.SF_USER_EMAIL="kullanıcı@e-posta"</script>` koyun (filigran için) |
| `GET /api/market-data` | `data/market-data.json` (JSON, mümkünse gzip ile) |

Express kullanıyorsanız `examples/express.js` hazır; sadece `requireLogin` fonksiyonunu portalın kendi giriş kontrolüyle değiştirin.
Başka bir teknoloji (Next.js, Python, PHP…) kullanıyorsanız aynı iki adresi o teknolojide yazın.
Giriş yapılmamışsa `/api/market-data` **401** dönmeli; sayfa kullanıcıyı otomatik olarak `/login` sayfasına yönlendirir
(farklı bir adresse `public/dashboard.html` içinde `/login?next=` geçen yeri değiştirin).

### 3. Menüye link ekleyin
"Piyasa Verisi" (İngilizce arayüzde "Market Data") → `/market`

### 4. Otomatik güncellemeyi kurun
Hafta içi her gün bir kez (USDA bir günün verisini ertesi iş günü öğlen civarı yayınlar):

```
# cron (sunucu saatine göre ayarlayın; örnek: ABD Doğu 15:15)
15 15 * * 1-5   cd /yol/market-data && node update.js >> update.log 2>&1
```

Platformun "Scheduled job / Cron" özelliği varsa aynı komutu oraya girin. Her çalışmada:
- Son 21 günün USDA verisi yeniden çekilir ve o tarihlerdeki eski kayıtların yerine konur (USDA geriye dönük düzeltme yayınlar).
- Ayın ilk 7 gününde Census'un son 6 ayı da güncellenir (Census aylık ve ~6 hafta gecikmeli).
- Hata olursa eski veri dosyası bozulmaz; pano son başarılı veriyle çalışmaya devam eder.

İlk kurulumda çalıştığını görmek için bir kez elle çalıştırın:
```
node update.js --census
```

### 5. Kontrol
- Giriş yapmadan `/market` ve `/api/market-data` açılmamalı.
- Giriş yapınca pano açılmalı; sağ altta kullanıcının e-postası (filigran) ve üstte "Son otomatik güncelleme" zamanı görünmeli.

### 6. (Bir kez) 10 yıllık hal geçmişini ekleyin
"Hal fiyatları — yıllara göre" bölümü için hallerin geçmiş yıllarını bir kez çekin (uzun sürer; yarıda kesilirse tekrar çalıştırın, biten yıllar atlanır):
```
node hal-history.js              # son 10 yıl, USDA API'den
node hal-history.js --csv hal_10yil.csv   # ya da hazır CSV'yi içe aktar
```
Bu yapılmazsa bölüm yalnızca birikmiş günlük hal verisini (yaklaşık son 1 yıl) gösterir.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `node update.js` | Son 21 gün (ayın ilk haftasıysa Census da) |
| `node update.js --days 60` | Son 60 gün |
| `node update.js --census` | Census'u da güncelle (son 6 ay) |
| `node update.js --from 2024-01-01 --census-from 2024-01` | Geçmişi baştan doldur (uzun sürer) |

## Kullanılan veri kaynakları

| Veri | Kaynak | Rapor |
|---|---|---|
| İthalat hareketi (ton, menşe, liman) | USDA AMS Market News | 3283 (Washington DC), 3125 (Nogales) |
| İthal meyve FOB fiyatları | USDA AMS Market News | 2401 (Orlando – Philadelphia/NY ithalatı) |
| Hal (toptan) fiyatları | USDA AMS Market News | 2314 New York, 2318 Philadelphia, 2285 Boston, 2281 Baltimore, 2290 Chicago, 2302 Detroit, 2277 Atlanta, 2294 Columbia, 3913 Asheville, 2310 Miami, 2306 Los Angeles |
| Alış değeri, CIF, navlun | US Census Bureau | HS 0805.10/21/22/29/40/50, 0806.10 |

## Notlar
- Pano Chart.js ve PapaParse'ı cdnjs.cloudflare.com'dan yükler. Portalda sıkı bir Content-Security-Policy varsa bu adrese izin verin.
- `lib/convert.js` ile `public/dashboard.html` içindeki dönüştürme kodu aynı veri formatını kullanır; birini değiştirirseniz diğerini de güncelleyin.
- Veri formatı: sözlükle sıkıştırılmış JSON (`dict` + tablolar `vol`, `price`, `hal`, `cen`). Açıklama `lib/convert.js` başında.
