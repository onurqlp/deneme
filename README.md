# AYDA Experience — Kayıt Öncesi Eğitim Deneyimi

AYDA Dil Akademisi için mobil öncelikli, erişilebilir ve etkileşimli kurumsal tanıtım alanı. Tek amaç, aday öğrencinin AYDA'nın öğrenme sürecini gerçekçi biçimde deneyimlemesini ve doğru kursa ulaşmasını sağlamaktır.

## Dosya yapısı

| Dosya | İşlev |
| --- | --- |
| `index.html` | Kurumsal açılış, hedef seçimi, ücretsiz mini ders, güven ve kayıt yönlendirmesi |
| `experience.css` | AYDA tasarım sistemi ve duyarlı görünüm |
| `experience.js` | Kişiselleştirme, mini ders, quiz, kullanıcı akışı ve analitik olayları |
| `panel.html` | Eski öğrenci panelini barındıran bağımsız tanıtım sayfası |
| `style.css`, `script.js` | Orijinal öğrenci paneli arayüzü ve fonksiyonları |
| `favicon.svg` | AYDA monogramı |
| `tests/site-smoke.cjs` | Bağımlılıksız HTML/CSS/JavaScript kalite kontrolü |

## İşleyiş

1. Ziyaretçi bir hedef ve A1–B2 seviyesi seçer. Tercihler sadece cihazın yerel tarayıcı depolamasında tutulur.
2. Dört aşamalı örnek deneyim ile konu, AYDA'nın halka açık öğretmen videosu ve üç soruluk mini etkinlik gösterilir.
3. Sınırlı öğrenci platformu `panel.html` dosyasında çalışır. Mobilde tam ekran; geniş ekranda lazy-loaded iframe de desteklenir.
4. Kurumun ana web sitesi veya hedef ve seviye bilgisini içeren bir WhatsApp mesajı üzerinden kayıt danışmasına yönlendirme yapılır.

Bu demo kişisel öğrenci hesabı açmaz; gerçek öğrenci kayıtları paylaşılmaz. Simüle edilmiş puan, resmî seviye/sınav puanı değildir. Program, tarih ve fiyatlar için www.aydadil.com esastır.

## Tasarım ve güvenilirlik

- Mevcut WordPress / AYDA alan adı üzerinden `/deneme/` yönlendirmesi kullanılır; site dosyaları GitHub Pages üzerinden sunulur.
- Ana tasarım, eski panelin 54 KB'lık CSS'sinden **ayrılmıştır**.
- Kayıt, sahte sosyal kanıt ya da geri sayım olmadan doğrudan deneyim sunulur.
- Öğretmen bilgileri ve öğrenci görüşü AYDA ana sitesindeki açık içeriklere dayanır.
- İçerik ve CTA bileşenlerinde klavye odağı ve `prefers-reduced-motion` desteği vardır.
- Üçüncü taraf YouTube içeriği açıkça işaretlenir ve mümkün olduğunca tembel yüklenir.

## Olay ölçümü

`experience.js` şu olayları üretir: `demo_goal_select`, `demo_level_select`, `demo_start`, `demo_step_view`, `demo_answer`, `lesson_complete`, `whatsapp_click`, `course_link_click`, `open_student_panel`, `experiment_exposure`.

Bu olaylar yalnızca GA4 `gtag` veya mevcut `dataLayer` altyapısı mevcutsa raporlama sistemine iletilebilir. **Bu depo tek başına GA4 hesabı, etiket yapılandırması veya analiz paneli oluşturmaz.** Ücretli kayıt dönüşümü ayrıca CRM üzerinden doğrulanmalıdır.

## Kalite kontrolü

```bash
node tests/site-smoke.cjs
```

GitHub Actions, arayüz dosyaları değiştiğinde aynı statik kontrolleri otomatik çalıştırır. Bu kontroller tarayıcıdaki görsel/etkileşim testlerinin yerini tutmaz. Gerçek cihaz regresyonu ve GitHub Pages dağıtım durumu ayrıca doğrulanmalıdır.

## Yayın

`main` dalındaki statik içerik mevcut GitHub Pages ayarına göre yayımlanır. WordPress yönlendirmesi bu deponun dışında yönetilir. Otomatik deploy doğrulanamıyorsa GitHub Pages "Actions" veya "Pages" ekranından son dağıtım durumu kontrol edilmelidir.

## Değişiklik yönetimi

Gerçek öğrenci içerikleri, kişisel bilgiler, özel Zoom kayıtları ve öğrenci şifreleri hiçbir zaman bu halka açık depoya taşınmamalıdır. AYDA ana sitesindeki öğretmen, kurs, ücret ve sınav bilgilerinin güncelliği ayrı bir içerik süreciyle korunur.
