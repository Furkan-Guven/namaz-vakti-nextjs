"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Bell, BellOff, Calendar, Clock, Database, RefreshCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { turkishCities } from "./turkish-cities"
import { apiProviders } from "./api-providers"

// Prayer time names in Turkish
const prayerNames = {
  Imsak: "İmsak",
  Gunes: "Güneş",
  Ogle: "Öğle",
  Ikindi: "İkindi",
  Aksam: "Akşam",
  Yatsi: "Yatsı",
}

// Type for prayer times data
interface PrayerTime {
  MiladiTarih: string
  HicriTarih?: string
  Imsak: string
  Gunes: string
  Ogle: string
  Ikindi: string
  Aksam: string
  Yatsi: string
}

// Type for cached data
interface CachedData {
  data: PrayerTime[]
  timestamp: number
  cityCode: string
  provider: string
}

export default function PrayerTimesApp() {
  const [selectedCity, setSelectedCity] = useState(turkishCities[0])
  const [selectedProvider, setSelectedProvider] = useState("auto")
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null)
  const [allPrayerTimes, setAllPrayerTimes] = useState<PrayerTime[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextPrayer, setNextPrayer] = useState<{
    name: string
    time: string
    remaining: string
    progress: number
  } | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const notificationShownRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastCityRef = useRef<string>("")

  // Load saved preferences
  useEffect(() => {
    const savedProvider = localStorage.getItem("preferredProvider")
    if (savedProvider) {
      setSelectedProvider(savedProvider)
    }
  }, [])

  // Function to parse time string to Date object
  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return new Date() // Safety check

    const [hours, minutes] = timeStr.split(":").map(Number)
    const date = new Date()
    date.setHours(hours || 0, minutes || 0, 0, 0)
    return date
  }

  // Function to calculate time remaining until next prayer
  const calculateNextPrayer = (prayerData: PrayerTime) => {
    if (!prayerData) return null

    const now = new Date()
    const prayers = [
      { name: "İmsak", time: prayerData.Imsak },
      { name: "Güneş", time: prayerData.Gunes },
      { name: "Öğle", time: prayerData.Ogle },
      { name: "İkindi", time: prayerData.Ikindi },
      { name: "Akşam", time: prayerData.Aksam },
      { name: "Yatsı", time: prayerData.Yatsi },
    ]

    // Convert prayer times to Date objects
    const prayerTimes = prayers.map((prayer) => ({
      ...prayer,
      date: parseTimeString(prayer.time),
    }))

    // Find the next prayer
    let nextPrayer = null
    for (const prayer of prayerTimes) {
      if (prayer.date > now) {
        nextPrayer = prayer
        break
      }
    }

    // If no next prayer found today, the next prayer is Imsak tomorrow
    if (!nextPrayer) {
      nextPrayer = prayerTimes[0]
      nextPrayer.date.setDate(nextPrayer.date.getDate() + 1)
    }

    // Calculate time remaining
    const diffMs = nextPrayer.date.getTime() - now.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    // Calculate progress
    let progress = 0
    const currentIndex = prayerTimes.findIndex((p) => p.name === nextPrayer.name)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : prayerTimes.length - 1

    const prevPrayer = prayerTimes[prevIndex]
    let prevTime = prevPrayer.date

    // If the previous prayer is from yesterday
    if (prevTime > nextPrayer.date) {
      prevTime = new Date(prevTime)
      prevTime.setDate(prevTime.getDate() - 1)
    }

    const totalInterval = nextPrayer.date.getTime() - prevTime.getTime()
    const elapsed = now.getTime() - prevTime.getTime()
    progress = Math.min(100, Math.max(0, (elapsed / totalInterval) * 100))

    return {
      name: nextPrayer.name,
      time: nextPrayer.time,
      remaining: `${diffHrs}s ${diffMins}dk`,
      progress,
    }
  }

  // Check for notifications
  useEffect(() => {
    if (!notificationsEnabled || !nextPrayer || !prayerTimes) return

    const checkNotification = () => {
      const now = new Date()
      const nextPrayerTime = parseTimeString(nextPrayer.time)
      const diffMs = nextPrayerTime.getTime() - now.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))

      if (diffMins <= 15 && diffMins > 0 && !notificationShownRef.current) {
        // Show notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`${nextPrayer.name} Vakti Yaklaşıyor`, {
            body: `${nextPrayer.name} vaktine ${diffMins} dakika kaldı.`,
            icon: "/favicon.ico",
          })
          notificationShownRef.current = true
        }
      }

      // Reset notification flag if next prayer time has passed
      if (now > nextPrayerTime) {
        notificationShownRef.current = false
      }
    }

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Set up timer to check every minute
    timerRef.current = setInterval(checkNotification, 60000)

    // Initial check
    checkNotification()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [notificationsEnabled, nextPrayer, prayerTimes])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Bu tarayıcı bildirim desteği sunmuyor.")
      return
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true)
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotificationsEnabled(true)
      }
    }
  }

  // Update next prayer time every minute
  useEffect(() => {
    if (!prayerTimes) return

    const updateNextPrayer = () => {
      const next = calculateNextPrayer(prayerTimes)
      setNextPrayer(next)
    }

    // Initial calculation
    updateNextPrayer()

    // Set up interval to update every minute
    const interval = setInterval(updateNextPrayer, 60000)

    return () => clearInterval(interval)
  }, [prayerTimes])

  // Function to format date for display
  const formatDate = (dateStr: string): string => {
    try {
      // Handle different date formats
      let date: Date

      // Check if the date is in DD.MM.YYYY format
      if (dateStr.includes(".")) {
        const [day, month, year] = dateStr.split(".").map(Number)
        date = new Date(year, month - 1, day)
      } else {
        // Try to parse as ISO date
        date = new Date(dateStr)
      }

      // Format the date
      return date.toLocaleDateString("tr-TR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (e) {
      return dateStr // Return original if parsing fails
    }
  }

  const fetchPrayerTimes = async () => {
    // Clear previous data when changing cities
    if (lastCityRef.current !== selectedCity.code) {
      setPrayerTimes(null)
      setAllPrayerTimes([])
      setSelectedDate("")
    }

    lastCityRef.current = selectedCity.code
    setLoading(true)
    setError(null)

    try {
      // Find the selected provider
      const provider = apiProviders.find((p) => p.id === selectedProvider)
      if (!provider) {
        throw new Error("Geçersiz API sağlayıcısı")
      }

      // Check if we have cached data for this city and provider
      const cacheKey = `prayerTimesCache_${selectedCity.code}_${selectedProvider}`
      const cachedDataString = localStorage.getItem(cacheKey)
      const cachedData: CachedData | null = cachedDataString ? JSON.parse(cachedDataString) : null

      const now = new Date().getTime()
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000

      // Use cached data if it's less than a week old and for the same city and provider
      if (
        cachedData &&
        cachedData.cityCode === selectedCity.code &&
        cachedData.provider === selectedProvider &&
        now - cachedData.timestamp < oneWeekInMs &&
        cachedData.data &&
        cachedData.data.length > 0
      ) {
        console.log("Using cached data for", selectedCity.name, "with provider", selectedProvider)

        // Store all prayer times
        setAllPrayerTimes(cachedData.data)

        // Find today's data
        const today = new Date().toISOString().split("T")[0]
        const todayData = findTodayData(cachedData.data, today)

        if (todayData) {
          setPrayerTimes(todayData)
          setSelectedDate(todayData.MiladiTarih)
        } else {
          // If today's data not found, use the first item
          setPrayerTimes(cachedData.data[0])
          setSelectedDate(cachedData.data[0].MiladiTarih)
        }

        setLoading(false)
        return
      }

      // Fetch from our API route which handles CORS
      console.log("Fetching prayer times for", selectedCity.name, "with provider", selectedProvider)
      const response = await fetch(provider.url(selectedCity.code))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API yanıt vermedi: ${response.status}`)
      }

      const data = await response.json()

      if (data && data.error) {
        throw new Error(data.error)
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log("Received prayer times data:", data)

        // Store all prayer times
        setAllPrayerTimes(data)

        // Find today's data
        const today = new Date().toISOString().split("T")[0]
        const todayData = findTodayData(data, today)

        if (todayData) {
          setPrayerTimes(todayData)
          setSelectedDate(todayData.MiladiTarih)
        } else {
          // If today's data not found, use the first item
          setPrayerTimes(data[0])
          setSelectedDate(data[0].MiladiTarih)
        }

        // Validate the data has all required fields
        const requiredFields = ["Imsak", "Gunes", "Ogle", "Ikindi", "Aksam", "Yatsi"]
        const missingFields = requiredFields.filter((field) => !data[0][field])

        if (missingFields.length > 0) {
          throw new Error(`Eksik veri alanları: ${missingFields.join(", ")}`)
        }

        // Cache the data
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: now,
            cityCode: selectedCity.code,
            provider: selectedProvider,
          }),
        )
      } else {
        throw new Error("API'den geçerli veri alınamadı")
      }
    } catch (err) {
      console.error("API Error:", err)
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu")

      // Always clear data when there's an error to avoid showing incorrect data
      setPrayerTimes(null)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to find today's data in the array
  const findTodayData = (data: PrayerTime[], today: string): PrayerTime | null => {
    // Try to find an exact match first
    let todayData = data.find((item) => {
      if (!item.MiladiTarih) return false
      return item.MiladiTarih.includes(today)
    })

    if (!todayData) {
      // Try more flexible matching
      const currentDate = new Date()
      const day = currentDate.getDate().toString().padStart(2, "0")
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0")
      const year = currentDate.getFullYear().toString()

      todayData = data.find((item) => {
        if (!item.MiladiTarih) return false
        const dateStr = item.MiladiTarih.toString()
        return (
          (dateStr.includes(day) && dateStr.includes(month) && dateStr.includes(year)) ||
          dateStr.includes(`${day}.${month}.${year}`) ||
          dateStr.includes(`${month}.${day}.${year}`)
        )
      })
    }

    return todayData || null
  }

  // Handle date change
  const handleDateChange = (date: string) => {
    const selectedData = allPrayerTimes.find((item) => item.MiladiTarih === date)
    if (selectedData) {
      setPrayerTimes(selectedData)
      setSelectedDate(date)
    }
  }

  // Handle provider change
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value)
    localStorage.setItem("preferredProvider", value)
    // Fetch new data with the selected provider
    setLoading(true)
    setTimeout(() => {
      fetchPrayerTimes()
    }, 100)
  }

  // Initial fetch
  useEffect(() => {
    fetchPrayerTimes()
  }, [selectedCity])

  const handleCityChange = (value: string) => {
    const city = turkishCities.find((city) => city.code === value)
    if (city) {
      setSelectedCity(city)
      notificationShownRef.current = false
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-t-4 border-t-blue-500">
        <CardHeader className="flex flex-col space-y-4 pb-2">
          <CardTitle className="text-2xl font-bold text-center text-blue-700">Namaz Vakitleri</CardTitle>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Select value={selectedCity.code} onValueChange={handleCityChange}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="İl seçin" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {turkishCities.map((city) => (
                  <SelectItem key={city.code} value={city.code}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Database className="h-4 w-4" />
                    <span className="hidden sm:inline">Veri Kaynağı</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Veri Kaynağı Seçin</h4>
                    <RadioGroup value={selectedProvider} onValueChange={handleProviderChange}>
                      {apiProviders.map((provider) => (
                        <div key={provider.id} className="flex items-start space-x-2 py-2">
                          <RadioGroupItem value={provider.id} id={provider.id} />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor={provider.id} className="font-medium">
                              {provider.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">{provider.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      requestNotificationPermission()
                    } else {
                      setNotificationsEnabled(false)
                    }
                  }}
                />
                <Label htmlFor="notifications" className="flex items-center gap-1">
                  {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  <span className="hidden sm:inline">Bildirimler</span>
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="space-y-4 mb-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Namaz vakitleri alınamadı: {error}</AlertDescription>
              </Alert>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={fetchPrayerTimes} className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Yeniden Dene
                </Button>
                {selectedProvider !== "auto" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider("auto")
                      localStorage.setItem("preferredProvider", "auto")
                      setTimeout(fetchPrayerTimes, 100)
                    }}
                    className="flex items-center gap-2"
                  >
                    Otomatik Moda Geç
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {nextPrayer && !loading && prayerTimes && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Sıradaki Namaz Vakti</h3>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                    {nextPrayer.name}
                  </Badge>
                  <span className="text-lg font-semibold">{nextPrayer.time}</span>
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {nextPrayer.remaining}
                </Badge>
              </div>
              <Progress value={nextPrayer.progress} className="h-2" />
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : prayerTimes ? (
            <div>
              <div className="mb-4 text-center">
                <h3 className="text-lg font-medium text-gray-800">{selectedCity.name}</h3>

                {/* Date selector */}
                {allPrayerTimes.length > 1 && (
                  <div className="my-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(selectedDate)}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-h-[300px] overflow-auto">
                        <div className="space-y-2">
                          <h4 className="font-medium">Tarih Seçin</h4>
                          <div className="grid gap-1">
                            {allPrayerTimes.map((item) => (
                              <Button
                                key={item.MiladiTarih}
                                variant={item.MiladiTarih === selectedDate ? "default" : "ghost"}
                                className="justify-start"
                                onClick={() => handleDateChange(item.MiladiTarih)}
                              >
                                {formatDate(item.MiladiTarih)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="flex justify-center gap-2 text-sm text-muted-foreground">
                  <span>{prayerTimes.MiladiTarih}</span>
                  {prayerTimes.HicriTarih && (
                    <>
                      <span>|</span>
                      <span>{prayerTimes.HicriTarih}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Veri kaynağı: {apiProviders.find((p) => p.id === selectedProvider)?.name || selectedProvider}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vakit</TableHead>
                    <TableHead className="text-right">Saat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(prayerNames).map(([key, name]) => {
                    const isNext = nextPrayer && nextPrayer.name === name
                    return (
                      <TableRow key={key} className={isNext ? "bg-blue-50" : ""}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Clock className={`h-4 w-4 ${isNext ? "text-blue-500" : "text-muted-foreground"}`} />
                          {name}
                          {isNext && (
                            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                              Sıradaki
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right ${isNext ? "font-bold text-blue-700" : ""}`}>
                          {prayerTimes[key as keyof PrayerTime]}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {notificationsEnabled && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  <p>Namaz vaktine 15 dakika kala bildirim alacaksınız.</p>
                </div>
              )}
            </div>
          ) : !error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Namaz vakitleri yükleniyor...</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

