# 🎮 EMO - Eğlenceli Matematik Oyunu v3.0

Tam sayılarla işlemleri eğlenceli bir şekilde öğreten interaktif matematik oyunu.

## 🚀 Özellikler

- 🔀 **Klasik İşlemler** - Toplama, çıkarma, çarpma, bölme, parantezli, üslü ve cebirli sorular
- ⚡ **Blitz Modu** - 60 saniye içinde en çok doğruyu yap
- ⏳ **Hayatta Kalma** - Her doğru cevap süre kazandırır
- ❓ **Eksik Sayı Bulma** - X'i bul!
- 🛒 **Mağaza Sistemi** - İpucu, kalkan, ekstra can ve temalar
- 🎖️ **Seviye & XP** - Oynadıkça seviye atla
- 🏆 **Küresel Liderlik Tablosu** - Firebase ile online sıralama
- 👤 **Hesap Sistemi** - E-posta veya Google ile giriş

## 🔧 Kurulum

### 1. Projeyi klonlayın
```bash
git clone https://github.com/alimartin007com-art/tam-sayilarla-islemler-uygulamasi.git
cd tam-sayilarla-islemler-uygulamasi
```

### 2. Firebase yapılandırmasını ekleyin
Proje dizininde `firebase-config.js` adlı bir dosya oluşturun:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "SIZIN_API_KEY",
  authDomain: "SIZIN_AUTH_DOMAIN",
  databaseURL: "SIZIN_DATABASE_URL",
  projectId: "SIZIN_PROJECT_ID",
  storageBucket: "SIZIN_STORAGE_BUCKET",
  messagingSenderId: "SIZIN_SENDER_ID",
  appId: "SIZIN_APP_ID",
  measurementId: "SIZIN_MEASUREMENT_ID"
};
```

> ⚠️ **Not:** `firebase-config.js` dosyası `.gitignore` ile korunur ve GitHub'a yüklenmez.

### 3. Oyunu çalıştırın
`index.html` dosyasını bir tarayıcıda açın.

> Google Giriş özelliği için `http://localhost` üzerinden çalıştırmanız gerekir:
> ```bash
> npx http-server
> ```

## 👨‍💻 Geliştirici

Ali Ensar © 2025
