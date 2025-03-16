# Namaz Vakti Uygulaması 🙏

![Namaz Vakti Banner](https://via.placeholder.com/800x200.png?text=Namaz+Vakti+Uygulaması)  
*Günlük namaz vakitlerinizi kolayca takip edin!*

Bu proje, belirli bir konum için İslam namaz vakitlerini (Fajr, Güneş, Dhuhr, Asr, Maghrib ve Isha) gösteren basit ama güçlü bir Next.js uygulamasıdır. [Aladhan API](https://aladhan.com/prayer-times-API) ile güncel ve doğru vakitler sunar. Modern bir arayüzle namaz vakitlerinizi her zaman yanınızda taşıyın!

**[Canlı Demoyu Gör](https://v0-react-prayer-app.vercel.app)** | **[GitHub Deposu](https://github.com/Furkan-Guven/namaz-vakti-nextjs)**

---

## ✨ Özellikler

- **Tam Namaz Vakitleri**: Fajr, Güneş, Dhuhr, Asr, Maghrib ve Isha vakitlerini tek bir yerde görün.
- **Konum Bazlı**: Varsayılan olarak İstanbul için ayarlı, ancak kod üzerinden kolayca değiştirilebilir.
- **Hızlı ve Hafif**: Next.js ile optimize edilmiş, anında yüklenen bir deneyim.
- **Güvenilir Veri**: Aladhan API ile doğru ve güncel namaz vakitleri.

---

## 🚀 Kurulum

Uygulamayı yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

### 1. **Depoyu Klonlayın**  
```bash
git clone https://github.com/Furkan-Guven/namaz-vakti-nextjs.git
```

### 2. **Bağımlılıkları Yükleyin**  
```bash
cd namaz-vakti-nextjs
npm install
```

### 3. **Geliştirme Sunucusunu Başlatın**  
```bash
npm run dev
```

### 4. **Tarayıcınızı Açın**  
[http://localhost:3000](http://localhost:3000) adresine giderek uygulamayı kullanmaya başlayın!

---

## ⚙️ Yapılandırma

Namaz vakitlerini farklı bir şehir için görmek istiyorsanız, `src/pages/index.js` dosyasındaki `location` değişkenini güncelleyin:

```javascript
const location = {
  city: 'Istanbul', // Şehrinizi buraya yazın
  country: 'Turkey' // Ülkenizi buraya yazın
};
```

Değişiklik yaptıktan sonra uygulamayı yeniden başlatın ve yeni konumunuzun vakitlerini görün!

---

## 🛠️ Kullanılan Teknolojiler

- **Next.js**: Hızlı ve modern bir React framework'ü.
- **React**: Kullanıcı arayüzü oluşturmak için.
- **Axios**: API istekleri için.
- **Tailwind CSS**: Şık ve özelleştirilebilir stil.

---

## 📸 Ekran Görüntüleri

(Ekran görüntüleri yakında eklenecek!)

Şimdilik uygulamayı canlı olarak buradan test edebilirsiniz.

---

## 🤝 Katkıda Bulunma

Bu projeyi daha iyi hale getirmek ister misiniz? Katkılarınızı bekliyoruz!

1. **Depoyu forklayın.**
2. **Yeni bir özellik ekleyin veya bir hatayı düzeltin.**
3. **Bir pull request gönderin.**

Sorularınız veya önerileriniz için bir **issue** açabilirsiniz.

---

## 📜 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Kodları özgürce kullanabilir, değiştirebilir ve paylaşabilirsiniz.

---

## 📧 İletişim

Sorularınız mı var? Bana ulaşın!

- **GitHub**: [Furkan-Guven](https://github.com/Furkan-Guven)
- **E-posta**: (E-posta adresinizi buraya ekleyebilirsiniz)

⭐ **Projeyi beğendiyseniz, yıldız vermeyi unutmayın!** ⭐

