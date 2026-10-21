// خدمة الطقس لمنتزه الردف في الطائف.
// تُجلب البيانات من خدمة تنبؤات مناخية عامة عبر بروتوكول HTTPS أثناء معالجة الطلب
// على الخادم (Server Component)، وتُخزَّن مؤقتًا لفترة قصيرة لتقليل الطلبات المتكررة.
// لا يظهر أي ذكر لطبيعة الاشتراك أو الحاجة إلى مفتاح في أي نص معروض للزائر.
// المخاطر المذكورة مُشتقّة من حالة الطقس الفعلية (مطر غزير/رعد/ضباب/رياح) لا من تنبيهات رسمية،
// لأن الموقع لا يتصل بمصدر تنبيهات رسمي ولا يفترض وجوده.

export interface WeatherNow {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windBeaufort: number;
  windLabel: string;
  gust: number;
  code: number;
  label: string;
  icon: string;
}

export interface WeatherDay {
  date: string;
  weekday: string;
  code: number;
  label: string;
  icon: string;
  tMax: number;
  tMin: number;
  precipProb: number;
  uvIndex: number;
  uvLabel: string;
  windBeaufort: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAdvice {
  outfit: string[];
  activity: string[];
  items: string[];
  risk: string[];
}

export interface WeatherResult {
  ok: boolean;
  updatedAt?: string;
  sourceTime?: string;
  now?: WeatherNow;
  days?: WeatherDay[];
  advice?: WeatherAdvice;
}

const LAT = 21.22918;
const LON = 40.4252563;
const TZ = 'Asia/Riyadh';
const SUCCESS_TTL = 30 * 60 * 1000;
const FAILURE_TTL = 2 * 60 * 1000;

// رموز الطقس المعيارية (WMO) مع وصف عربي ورمز مرئي مبسط.
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'صافٍ', icon: '☀' },
  1: { label: 'صافٍ غالبًا', icon: '🌤' },
  2: { label: 'غائم جزئيًا', icon: '⛅' },
  3: { label: 'غائم', icon: '☁' },
  45: { label: 'ضباب', icon: '🌫' },
  48: { label: 'ضباب متجمد', icon: '🌫' },
  51: { label: 'رذاذ خفيف', icon: '🌦' },
  53: { label: 'رذاذ متوسط', icon: '🌦' },
  55: { label: 'رذاذ كثيف', icon: '🌧' },
  56: { label: 'رذاذ متجمد', icon: '🌧' },
  57: { label: 'رذاذ متجمد كثيف', icon: '🌧' },
  61: { label: 'مطر خفيف', icon: '🌧' },
  63: { label: 'مطر متوسط', icon: '🌧' },
  65: { label: 'مطر غزير', icon: '⛈' },
  66: { label: 'مطر متجمد', icon: '🌧' },
  67: { label: 'مطر متجمد كثيف', icon: '🌧' },
  71: { label: 'ثلوج خفيفة', icon: '❄' },
  73: { label: 'ثلوج متوسطة', icon: '❄' },
  75: { label: 'ثلوج كثيفة', icon: '❄' },
  77: { label: 'حبيبات ثلجية', icon: '🌨' },
  80: { label: 'زخات مطر', icon: '🌦' },
  81: { label: 'زخات مطر متوسطة', icon: '🌧' },
  82: { label: 'زخات مطر غزيرة', icon: '⛈' },
  85: { label: 'زخات ثلجية', icon: '🌨' },
  86: { label: 'زخات ثلجية كثيفة', icon: '❄' },
  95: { label: 'عاصفة رعدية', icon: '⛈' },
  96: { label: 'عاصفة رعدية مع بَرَد', icon: '⛈' },
  99: { label: 'عاصفة رعدية شديدة مع بَرَد', icon: '⛈' }
};

const THUNDER = new Set([95, 96, 99]);
const HEAVY_RAIN = new Set([65, 66, 67, 82]);
const LIGHT_RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 80, 81]);
const FOG = new Set([45, 48]);

function describe(code: number): { label: string; icon: string } {
  return WMO[code] ?? { label: 'حالة جوية متنوعة', icon: '🌡' };
}

function beaufort(kmh: number): number {
  if (kmh < 1) return 0;
  if (kmh <= 5) return 1;
  if (kmh <= 11) return 2;
  if (kmh <= 19) return 3;
  if (kmh <= 28) return 4;
  if (kmh <= 38) return 5;
  if (kmh <= 49) return 6;
  if (kmh <= 61) return 7;
  if (kmh <= 74) return 8;
  if (kmh <= 88) return 9;
  if (kmh <= 102) return 10;
  if (kmh <= 117) return 11;
  return 12;
}

function windLabel(b: number): string {
  if (b <= 2) return 'نسيم خفيف';
  if (b <= 4) return 'نسيم معتدل';
  if (b <= 6) return 'رياح نشطة';
  if (b <= 8) return 'رياح قوية';
  return 'عاصفة';
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'ضعيفة';
  if (uv < 6) return 'معتدلة';
  if (uv < 8) return 'قوية';
  if (uv < 11) return 'شديدة';
  return 'متطرفة';
}

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function weekdayAr(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAYS[d.getUTCDay()] ?? '';
}

function hhmm(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

function round(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

function buildUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset',
    timezone: TZ,
    forecast_days: '7',
    wind_speed_unit: 'kmh'
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

// محرّك النصائح: يشتقّ توصيات قابلة للتنفيذ من بيانات الطقس الفعلية،
// موجّه للزائر العادي في منتزه جبلي صخري مرتفع (الطائف). كل عنصر يظهر فقط عند تحقق شرطه.
function buildAdvice(now: WeatherNow, today: WeatherDay): WeatherAdvice {
  const outfit: string[] = [];
  const activity: string[] = [];
  const items: string[] = [];
  const risk: string[] = [];

  const code = now.code;
  const dayCode = today.code;
  const precipProb = today.precipProb;
  const tMax = today.tMax;
  const tMin = today.tMin;
  const uv = today.uvIndex;
  const windB = Math.max(now.windBeaufort, today.windBeaufort);

  // 🌂 هطول المطر
  if (precipProb >= 60) {
    activity.push('يُتوقع احتمال مطر مرتفع اليوم (أكثر من 60%)؛ احمل مظلة، لكن لا تفترض هطولًا مؤكدًا، وقلّل المسارات المكشوفة وصعود المرتفعات عند الاضطرار.');
    items.push('مظلة أو مطرية خفيفة.');
  }
  if (THUNDER.has(code) || THUNDER.has(dayCode)) {
    risk.push('خطر رعد وبرق؛ لا تصعد المرتفعات الصخرية ولا تقف تحت الأشجار المكشوفة أو على حواف مكشوفة.');
    activity.push('تجنّب المسارات المكشوفة والمشاريع المائية الآن؛ أجّل الجولة الخارجية واتبع الإرشاد الرسمي أو الميداني.');
  }
  if (HEAVY_RAIN.has(code) || HEAVY_RAIN.has(dayCode)) {
    risk.push('مطر غزير؛ تجنّب الأودية والمنخفضات والصخور المنزلقة.');
    activity.push('يفضّل تأجيل المسارات الجبلية المكشوفة والصعود.');
    items.push('مطرية مقاومة للماء (تجنّب المظلة الطويلة مع الرياح).');
  } else if (LIGHT_RAIN.has(code) || LIGHT_RAIN.has(dayCode)) {
    activity.push('أمطار خفيفة إلى متوسطة؛ الأرضية الصخرية قد تكون زلقة، فامشِ بحذر وتجنّب الوديان الضيقة.');
    items.push('مطرية أو مظلة صغيرة.');
  }
  if (FOG.has(code) || FOG.has(dayCode)) {
    risk.push('ضباب يقلّل الرؤية؛ تجنّب مسارات الحواف والمرتفعات المكشوفة، ولا تعتمد على التصوير البعيد.');
    items.push('كنّ مستعدًا لرذاذ خفيف وانخفاض الرؤية.');
  }

  // 🌞 حرارة مرتفعة وأشعة
  if (tMax >= 32) {
    activity.push('حرارة مرتفعة نهارًا؛ ابدأ جولتك مبكرًا وقلّل وقت المشي تحت الشمس عند الظهيرة.');
    items.push('واقٍ شمسي، نظارة شمسية، قبعة، وماء كافٍ.');
  }
  if (uv >= 5) {
    items.push(`أشعة فوق البنفسجية ${uvLabel(uv)}؛ استخدم واقيًا وارتدِ قبعة ونظارة.`);
    outfit.push('ملابس خفيفة تغطي الذراعين عند الإمكان.');
  }

  // ❄️ برودة وفرق حراري
  if (tMax - tMin > 8) {
    outfit.push('فرق كبير بين حرارة النهار والليل؛ احمل طبقة خارجية خفيفة تضيفها مساءً.');
  }
  if (tMax <= 10) {
    outfit.push('برودة واضحة؛ ارتدِ معطفًا دافئًا.');
    items.push('معطف أو وشاح.');
  }

  // 💨 رياح
  if (windB >= 7) {
    risk.push('رياح قوية؛ ابتعد عن حواف الصخور المرتفة والهياكل المؤقتة.');
    activity.push('قلل التعرض في المساحات المكشوفة واتبع الإرشاد الميداني.');
  } else if (windB >= 5) {
    activity.push('رياح نشطة؛ توخ الحذر في المسارات المكشوفة، وتجنّب القبعات التي تطير بسهولة.');
  }

  // ☁️ صحو/غيوم
  if (dayCode <= 1) {
    activity.push('إذا سمحت ظروف الموقع وساعات الدخول، احمِ نفسك من الشمس في المساحات المكشوفة.');
    if (uv < 5) items.push('واقٍ شمسي خفيف عند الإمكان.');
  } else if (dayCode <= 3) {
    activity.push('الغيوم لا تلغي الحرارة أو الأشعة؛ راجع بقية المؤشرات قبل تحديد طول الجولة.');
  }

  return { outfit, activity, items, risk };
}

let cache: { ts: number; ok: boolean; data: WeatherResult } | null = null;

export async function getWeather(): Promise<WeatherResult> {
  if (cache && Date.now() - cache.ts < (cache.ok ? SUCCESS_TTL : FAILURE_TTL)) {
    return cache.data;
  }
  try {
    const res = await fetch(buildUrl(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const j = (await res.json()) as {
      current?: Record<string, number | string>;
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max?: (number | null)[];
        uv_index_max?: (number | null)[];
        wind_speed_10m_max?: (number | null)[];
        sunrise: string[];
        sunset: string[];
      };
    };

    const c = j.current;
    const required = ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m'];
    if (!c || required.some((key) => typeof c[key] !== 'number' || !Number.isFinite(c[key]))) throw new Error('Incomplete current weather');
    const rawTime = c.time;
    if (typeof rawTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rawTime)) throw new Error('Missing source time');
    const sourceDate = new Date(rawTime + '+03:00');
    const age = Date.now() - sourceDate.getTime();
    if (!Number.isFinite(age) || age < -15 * 60000 || age > 90 * 60000) throw new Error('Stale source time');
    const daily = j.daily;
    if (!daily || !Array.isArray(daily.time) || daily.time.length < 1 || daily.time[0] !== rawTime.slice(0, 10)) throw new Error('Missing daily weather');
    const requiredDaily = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'uv_index_max', 'wind_speed_10m_max'] as const;
    const count = Math.min(daily.time.length, 7);
    for (let i = 0; i < count; i++) {
      if (requiredDaily.some((key) => typeof daily[key]?.[i] !== 'number' || !Number.isFinite(daily[key]?.[i]))) throw new Error('Incomplete forecast');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(daily.time[i]) || typeof daily.sunrise?.[i] !== 'string' || typeof daily.sunset?.[i] !== 'string') throw new Error('Incomplete forecast dates');
    }
    const nowCode = round(c.weather_code);
    const nowDesc = describe(nowCode);
    const nowWind = round(c.wind_speed_10m);
    const nowBeaufort = beaufort(nowWind);
    const now: WeatherNow = {
      temperature: round(c.temperature_2m),
      apparentTemperature: round(c.apparent_temperature),
      humidity: round(c.relative_humidity_2m),
      windSpeed: nowWind,
      windBeaufort: nowBeaufort,
      windLabel: windLabel(nowBeaufort),
      gust: round(c.wind_gusts_10m),
      code: nowCode,
      label: nowDesc.label,
      icon: nowDesc.icon
    };

    const days: WeatherDay[] = [];
    const d = j.daily;
    if (d) {
      const n = Math.min(d.time.length, 7);
      for (let i = 0; i < n; i++) {
        const code = round(d.weather_code[i]);
        const desc = describe(code);
        const dayWind = beaufort(round(d.wind_speed_10m_max?.[i]));
        const dayUv = round(d.uv_index_max?.[i]);
        days.push({
          date: d.time[i],
          weekday: weekdayAr(d.time[i]),
          code,
          label: desc.label,
          icon: desc.icon,
          tMax: round(d.temperature_2m_max[i]),
          tMin: round(d.temperature_2m_min[i]),
          precipProb: round(d.precipitation_probability_max?.[i]),
          uvIndex: dayUv,
          uvLabel: uvLabel(dayUv),
          windBeaufort: dayWind,
          sunrise: hhmm(d.sunrise[i]),
          sunset: hhmm(d.sunset[i])
        });
      }
    }

    const today = days[0];
    const advice = today ? buildAdvice(now, today) : { outfit: [], activity: [], items: [], risk: [] };

    const result: WeatherResult = {
      ok: true,
      updatedAt: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }),
      sourceTime: sourceDate.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }),
      now,
      days,
      advice
    };
    cache = { ts: Date.now(), ok: true, data: result };
    return result;
  } catch {
    const fallback: WeatherResult = { ok: false };
    cache = { ts: Date.now(), ok: false, data: fallback };
    return fallback;
  }
}
