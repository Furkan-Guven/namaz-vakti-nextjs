// API sağlayıcıları ve özellikleri
export const apiProviders = [
  {
    id: "auto",
    name: "Otomatik (Önerilen)",
    description: "En iyi çalışan API'yi otomatik olarak seçer",
    url: (cityCode: string) => `/api/prayer-times?cityCode=${cityCode}&provider=auto`,
  },
  {
    id: "diyanet",
    name: "Diyanet İşleri",
    description: "Türkiye Diyanet İşleri Başkanlığı resmi verileri",
    url: (cityCode: string) => `/api/prayer-times?cityCode=${cityCode}&provider=diyanet`,
  },
  {
    id: "emushaf",
    name: "E-Mushaf",
    description: "E-Mushaf namaz vakitleri API'si",
    url: (cityCode: string) => `/api/prayer-times?cityCode=${cityCode}&provider=emushaf`,
  },
  {
    id: "aladhan",
    name: "Al-Adhan",
    description: "Uluslararası İslami vakitler API'si",
    url: (cityCode: string) => `/api/prayer-times?cityCode=${cityCode}&provider=aladhan`,
  },
  {
    id: "namazvakti",
    name: "Namaz Vakti API",
    description: "Alternatif namaz vakitleri API'si (Bakımda olabilir)",
    url: (cityCode: string) => `/api/prayer-times?cityCode=${cityCode}&provider=namazvakti`,
  },
]

