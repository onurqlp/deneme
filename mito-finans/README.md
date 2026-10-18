# MİTO Finans

**Tüm ödemeleriniz. Tek bir net tablo.**

MİTO Finans; kredi kartı ekstrelerinizi, kredi ve okul taksitlerinizi, diğer borçlarınızı, yaptığınız kısmi ödemeleri ve gelirlerinizi tek ekranda takip etmeniz için geliştirilmiş, çevrimdışı çalışan kişisel finans kontrol merkezidir.

### Uygulamayı aç

**[MİTO Finans — Canlı uygulama](https://onurqlp.github.io/deneme/mito-finans/)** · [Kısa kullanım rehberi](https://onurqlp.github.io/deneme/mito-finans/kullanim.html)

Hesap oluşturma gerekmez. Web sürümü güncel Chrome gibi `DecompressionStream` destekleyen tarayıcılarda açılır. Android APK, **MİTO Finans APK** GitHub Actions iş akışından derlenir.

### Başlangıç

1. **Kartlarım:** Banka ve kredi kartlarınızı ekleyin.
2. **Ekstre gir:** Hesap özetindeki borcu, asgari ödemeyi ve bankanın bildirdiği son ödeme tarihini kaydedin.
3. **Ödemeler:** Kısmi veya tam ödeme yaptığınızda hareketi girin; kalan tutar otomatik hesaplanır.
4. **Taksitler:** Kredi ve okul ödemeleri için aylık taksit, vade ve ödenmiş ay sayısını tanımlayın.
5. **Gelirler:** Maaşınızı ve diğer gelirlerinizi ekleyin; aylık nakit akışını inceleyin.
6. **Ayarlar:** Düzenli olarak JSON yedeği alın.

### Önemli notlar

- Web ve APK kayıtları birbirinden bağımsızdır, otomatik senkronize olmaz. JSON yedeğiyle aktarım yapılabilir.
- Hafta sonu vadesi istenirse pazartesiye taşınır. **Resmî tatiller ve bankaya özel sözleşme kuralları hesaplanmaz.**
- Son ödeme tarihi ve banka borcuna ilişkin nihai bilgi bankanın resmî kayıtlarıdır.
- Telefonda uygulama verileri silinirse veya APK kaldırılırsa yedeksiz kayıtlar kaybolabilir.
- APK bildirimleri cihazın bildirim izinleri ve Android zamanlama davranışına bağlıdır.

### Teknik yapı

Sunucu bağımlılığı olmayan HTML/CSS/JavaScript uygulaması, Android WebView sarmalayıcı, cihaz içi saklama, GitHub Actions ile Android debug APK derlemesi. Uygulama kaynakları `bundle.tar.gz` arşivindedir. Derleme iş akışı: [mito-finans-apk.yml](../.github/workflows/mito-finans-apk.yml).