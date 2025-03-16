import { NextResponse } from "next/server"

// Update the GET function to better handle provider failures in auto mode
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cityCode = searchParams.get("cityCode")
  const provider = searchParams.get("provider") || "auto"

  if (!cityCode) {
    return NextResponse.json({ error: "Şehir kodu gerekli" }, { status: 400 })
  }

  console.log(`Fetching prayer times for city ${cityCode} using provider ${provider}`)

  // For auto provider, define a priority order of APIs to try
  const providerOrder = provider === "auto" ? ["diyanet", "aladhan", "emushaf", "namazvakti"] : [provider]

  const errors: Record<string, string> = {}

  // Try each provider in order
  for (const currentProvider of providerOrder) {
    try {
      let data = null

      // Call the appropriate provider function
      switch (currentProvider) {
        case "diyanet":
          data = await fetchFromDiyanet(cityCode).then((d) => (d ? [d] : null))
          break
        case "emushaf":
          data = await fetchFromEmushaf(cityCode)
          break
        case "namazvakti":
          data = await fetchFromNamazVakti(cityCode).then((d) => [d])
          break
        case "aladhan":
          data = await fetchFromAladhan(cityCode, 7).then((d) => d) // Fetch 7 days of data
          break
        default:
          errors[currentProvider] = `Bilinmeyen sağlayıcı: ${currentProvider}`
          continue
      }

      // If we got valid data, return it
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`Successfully fetched from ${currentProvider}`)
        return NextResponse.json(data)
      }
    } catch (error) {
      console.error(`Error fetching from ${currentProvider}:`, error)
      errors[currentProvider] = error instanceof Error ? error.message : "Bilinmeyen hata"

      // If this is not auto mode, we should stop and return the error
      if (provider !== "auto") {
        break
      }
      // Otherwise continue to the next provider
    }
  }

  // If we get here, all providers failed
  const errorMessage =
    provider === "auto"
      ? `Hiçbir API'den veri alınamadı: ${Object.entries(errors)
          .map(([p, e]) => `${p}: ${e}`)
          .join("; ")}`
      : `${provider} API'den veri alınamadı: ${errors[provider] || "Bilinmeyen hata"}`

  console.error(errorMessage)
  return NextResponse.json({ error: errorMessage }, { status: 500 })
}

// Diyanet API'den veri çekme
async function fetchFromDiyanet(cityCode: string) {
  const directApiUrl = `https://namazvakitleri.diyanet.gov.tr/tr-TR/${cityCode}`
  console.log("Trying Diyanet API:", directApiUrl)

  const directResponse = await fetch(directApiUrl, {
    headers: {
      Accept: "application/json, text/html",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    cache: "no-store",
  })

  if (directResponse.ok) {
    const text = await directResponse.text()
    // Try to extract prayer times from HTML response
    const prayerTimes = extractPrayerTimesFromHTML(text)

    if (prayerTimes) {
      console.log("Extracted prayer times from Diyanet HTML:", prayerTimes)
      return prayerTimes
    }
  }

  throw new Error("Diyanet API'den veri alınamadı")
}

// Emushaf API'den veri çekme
async function fetchFromEmushaf(cityCode: string) {
  const apiUrl = `https://ezanvakti.emushaf.net/vakitler/${cityCode}`
  console.log("Trying Emushaf API:", apiUrl)

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Emushaf API responded with status: ${response.status}`)
  }

  const data = await response.json()

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("Emushaf API geçerli veri döndürmedi")
  }

  // Get today's date in various formats to increase matching chances
  const today = new Date()
  const todayISO = today.toISOString().split("T")[0] // YYYY-MM-DD
  const todayDMY = `${today.getDate().toString().padStart(2, "0")}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getFullYear()}` // DD.MM.YYYY
  const todayMDY = `${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}.${today.getFullYear()}` // MM.DD.YYYY

  console.log("Looking for dates:", todayISO, todayDMY, todayMDY)

  // Return all data - we'll handle date selection in the frontend
  return data
}

// Update the fetchFromNamazVakti function with alternative URLs and better error handling
async function fetchFromNamazVakti(cityCode: string) {
  const today = new Date()
  // Try multiple possible URLs for the NamazVakti API
  const possibleUrls = [
    `https://namaz-vakti-api.herokuapp.com/data?region=${cityCode}`,
    `https://namaz-vakti-api.vercel.app/api/timings?city=${getCityName(cityCode)}`,
    `https://namazvakitleri-api.netlify.app/api/timings?city=${getCityName(cityCode)}`,
  ]

  let lastError = null

  // Try each URL in sequence
  for (const url of possibleUrls) {
    try {
      console.log("Trying NamazVakti API URL:", url)

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        console.log(`NamazVakti API at ${url} responded with status: ${response.status}`)
        continue // Try next URL
      }

      const data = await response.json()
      console.log("NamazVakti API response:", data)

      // Check if the response has the expected structure
      if (data && data.times) {
        // Original API format
        return {
          MiladiTarih: today.toLocaleDateString("tr-TR"),
          HicriTarih: data.hicri || "",
          Imsak: data.times.imsak,
          Gunes: data.times.gunes,
          Ogle: data.times.ogle,
          Ikindi: data.times.ikindi,
          Aksam: data.times.aksam,
          Yatsi: data.times.yatsi,
        }
      } else if (data && data.timings) {
        // Alternative API format
        return {
          MiladiTarih: today.toLocaleDateString("tr-TR"),
          HicriTarih: data.date?.hijri?.date || "",
          Imsak: data.timings.Imsak,
          Gunes: data.timings.Sunrise,
          Ogle: data.timings.Dhuhr,
          Ikindi: data.timings.Asr,
          Aksam: data.timings.Maghrib,
          Yatsi: data.timings.Isha,
        }
      }
    } catch (error) {
      console.error(`Error with NamazVakti API at ${url}:`, error)
      lastError = error
    }
  }

  // If we get here, all URLs failed
  throw lastError || new Error("NamazVakti API geçerli veri döndürmedi")
}

// Aladhan API'den veri çekme - multiple days
async function fetchFromAladhan(cityCode: string, days = 7) {
  const cityName = getCityName(cityCode)
  const result = []

  // Get current date
  const today = new Date()

  // Fetch data for multiple days
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
    const fallbackUrl = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(cityName)}&country=Turkey&method=13`

    try {
      console.log(`Trying Aladhan API for date ${dateStr}:`, fallbackUrl)

      const fallbackResponse = await fetch(fallbackUrl, {
        cache: "no-store",
      })

      if (!fallbackResponse.ok) {
        console.error(`Aladhan API responded with status: ${fallbackResponse.status} for date ${dateStr}`)
        continue
      }

      const fallbackData = await fallbackResponse.json()

      if (fallbackData && fallbackData.data && fallbackData.data.timings) {
        const timings = fallbackData.data.timings
        const responseDate = fallbackData.data.date

        const formattedData = {
          MiladiTarih: `${responseDate.gregorian.day}.${responseDate.gregorian.month.number}.${responseDate.gregorian.year}`,
          HicriTarih: `${responseDate.hijri.day} ${responseDate.hijri.month.en} ${responseDate.hijri.year}`,
          Imsak: timings.Imsak,
          Gunes: timings.Sunrise,
          Ogle: timings.Dhuhr,
          Ikindi: timings.Asr,
          Aksam: timings.Maghrib,
          Yatsi: timings.Isha,
        }

        result.push(formattedData)
      }
    } catch (error) {
      console.error(`Error fetching from Aladhan for date ${dateStr}:`, error)
    }
  }

  if (result.length === 0) {
    throw new Error("Aladhan API'den veri alınamadı")
  }

  return result
}

// Helper function to extract prayer times from HTML
function extractPrayerTimesFromHTML(html: string): any | null {
  try {
    // Very basic extraction - in a real app you would use a proper HTML parser
    const imsakMatch = html.match(/Imsak<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const gunesMatch = html.match(/Güneş<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const ogleMatch = html.match(/Öğle<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const ikindiMatch = html.match(/İkindi<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const aksamMatch = html.match(/Akşam<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const yatsiMatch = html.match(/Yatsı<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
    const dateMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i)

    if (imsakMatch && gunesMatch && ogleMatch && ikindiMatch && aksamMatch && yatsiMatch) {
      return {
        MiladiTarih: dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString("tr-TR"),
        HicriTarih: "",
        Imsak: imsakMatch[1].trim(),
        Gunes: gunesMatch[1].trim(),
        Ogle: ogleMatch[1].trim(),
        Ikindi: ikindiMatch[1].trim(),
        Aksam: aksamMatch[1].trim(),
        Yatsi: yatsiMatch[1].trim(),
      }
    }
  } catch (e) {
    console.error("Error extracting prayer times from HTML:", e)
  }
  return null
}

// Helper function to get city name from code
function getCityName(cityCode: string): string {
  const cityMap: Record<string, string> = {
    "10550": "Adana",
    "10552": "Adiyaman",
    "10553": "Afyonkarahisar",
    "10555": "Agri",
    "10556": "Aksaray",
    "10558": "Amasya",
    "10604": "Ankara",
    "10642": "Antalya",
    "10647": "Ardahan",
    "10648": "Artvin",
    "10649": "Aydin",
    "10650": "Balikesir",
    "10651": "Bartin",
    "10652": "Batman",
    "10653": "Bayburt",
    "10654": "Bilecik",
    "10655": "Bingol",
    "10656": "Bitlis",
    "10657": "Bolu",
    "10659": "Burdur",
    "10923": "Bursa",
    "10924": "Canakkale",
    "10925": "Cankiri",
    "10926": "Corum",
    "10927": "Denizli",
    "10928": "Diyarbakir",
    "10929": "Duzce",
    "10930": "Edirne",
    "10931": "Elazig",
    "10932": "Erzincan",
    "10933": "Erzurum",
    "10934": "Eskisehir",
    "10935": "Gaziantep",
    "10936": "Giresun",
    "10937": "Gumushane",
    "10938": "Hakkari",
    "10939": "Hatay",
    "10940": "Igdir",
    "10941": "Isparta",
    "11001": "Istanbul",
    "11231": "Izmir",
    "11232": "Kahramanmaras",
    "11233": "Karabuk",
    "11234": "Karaman",
    "11235": "Kars",
    "11236": "Kastamonu",
    "11237": "Kayseri",
    "11238": "Kilis",
    "11239": "Kirikkale",
    "11240": "Kirklareli",
    "11241": "Kirsehir",
    "11242": "Kocaeli",
    "11243": "Konya",
    "11244": "Kutahya",
    "11245": "Malatya",
    "11246": "Manisa",
    "11247": "Mardin",
    "11248": "Mersin",
    "11249": "Mugla",
    "11250": "Mus",
    "11251": "Nevsehir",
    "11252": "Nigde",
    "11253": "Ordu",
    "11254": "Osmaniye",
    "11255": "Rize",
    "11256": "Sakarya",
    "11257": "Samsun",
    "11258": "Sanliurfa",
    "11259": "Siirt",
    "11260": "Sinop",
    "11261": "Sivas",
    "11262": "Sirnak",
    "11263": "Tekirdag",
    "11264": "Tokat",
    "11265": "Trabzon",
    "11266": "Tunceli",
    "11267": "Usak",
    "11268": "Van",
    "11269": "Yalova",
    "11270": "Yozgat",
    "11271": "Zonguldak",
  }

  return cityMap[cityCode] || "Istanbul" // Default to Istanbul if not found
}

