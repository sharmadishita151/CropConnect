import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import {
  CreateListingBody,
  CreateOrderBody,
  GetDashboardSummaryQueryParams,
  GetListingsQueryParams,
  GetMandiPricesQueryParams,
  RequestOtpBody,
  SendAiChatBody,
  VerifyOtpBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Role = "farmer" | "buyer";

type Listing = {
  id: string;
  farmerId: string;
  farmerName: string;
  commodity: string;
  category: string;
  grade: string;
  quantity: number;
  unit: "kg" | "quintal";
  price: number;
  district: string;
  state: string;
  photoUrl: string | null;
  postedAt: string;
  status: string;
  distanceKm: number;
};

type Order = {
  id: string;
  listingId: string;
  quantity: number;
  isSample: boolean;
  shippingCity: string;
  commodity: string;
  farmerName: string;
  total: number;
  status: "Ordered" | "Dispatched" | "Out for Delivery" | "Delivered";
  createdAt: string;
};

type Challenge = {
  phone: string;
  role: Role;
  name: string | null;
  otp: string;
  expiresAt: number;
};

const challenges = new Map<string, Challenge>();

const fallbackMandiPrices = [
  {
    id: "fallback-tomato-pune",
    state: "Maharashtra",
    district: "Pune",
    market: "Pune APMC",
    commodity: "Tomato",
    variety: "Hybrid",
    minPrice: 2200,
    maxPrice: 3400,
    modalPrice: 2900,
    unit: "₹ / quintal",
    source: "Demo fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-onion-lasalgaon",
    state: "Maharashtra",
    district: "Nashik",
    market: "Lasalgaon",
    commodity: "Onion",
    variety: "Red",
    minPrice: 1800,
    maxPrice: 2600,
    modalPrice: 2250,
    unit: "₹ / quintal",
    source: "Demo fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-wheat-kota",
    state: "Rajasthan",
    district: "Kota",
    market: "Kota",
    commodity: "Wheat",
    variety: "Lokwan",
    minPrice: 2350,
    maxPrice: 2750,
    modalPrice: 2525,
    unit: "₹ / quintal",
    source: "Demo fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-cotton-nagpur",
    state: "Maharashtra",
    district: "Nagpur",
    market: "Kalamna",
    commodity: "Cotton",
    variety: "Medium Staple",
    minPrice: 6200,
    maxPrice: 7100,
    modalPrice: 6750,
    unit: "₹ / quintal",
    source: "Demo fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-potato-agra",
    state: "Uttar Pradesh",
    district: "Agra",
    market: "Agra",
    commodity: "Potato",
    variety: "Desi",
    minPrice: 1200,
    maxPrice: 1900,
    modalPrice: 1550,
    unit: "₹ / quintal",
    source: "Demo fallback",
    updatedAt: new Date().toISOString(),
  },
];

const listings: Listing[] = [
  {
    id: "listing-1",
    farmerId: "farmer-asha",
    farmerName: "Harvest Hub Farm",
    commodity: "Tomato",
    category: "Vegetables",
    grade: "Grade A",
    quantity: 850,
    unit: "kg",
    price: 29,
    district: "Pune",
    state: "Maharashtra",
    photoUrl: null,
    postedAt: "Today, 8:40 AM",
    status: "Available",
    distanceKm: 18,
  },
  {
    id: "listing-2",
    farmerId: "farmer-rajesh",
    farmerName: "Rajesh Kumar",
    commodity: "Wheat",
    category: "Grains",
    grade: "Grade A",
    quantity: 42,
    unit: "quintal",
    price: 2525,
    district: "Kota",
    state: "Rajasthan",
    photoUrl: null,
    postedAt: "Yesterday",
    status: "Available",
    distanceKm: 31,
  },
  {
    id: "listing-3",
    farmerId: "farmer-meena",
    farmerName: "Meena Deshmukh",
    commodity: "Onion",
    category: "Vegetables",
    grade: "Grade B",
    quantity: 24,
    unit: "quintal",
    price: 2250,
    district: "Nashik",
    state: "Maharashtra",
    photoUrl: null,
    postedAt: "Aug 28",
    status: "Available",
    distanceKm: 64,
  },
  {
    id: "listing-4",
    farmerId: "farmer-salim",
    farmerName: "Salim Shaikh",
    commodity: "Cotton",
    category: "Cash crops",
    grade: "Grade A",
    quantity: 18,
    unit: "quintal",
    price: 6750,
    district: "Nagpur",
    state: "Maharashtra",
    photoUrl: null,
    postedAt: "Aug 27",
    status: "Available",
    distanceKm: 72,
  },
];

const orders: Order[] = [
  {
    id: "order-1042",
    listingId: "listing-1",
    quantity: 100,
    isSample: true,
    shippingCity: "Pune",
    commodity: "Tomato",
    farmerName: "Harvest Hub Farm",
    total: 3050,
    status: "Dispatched",
    createdAt: "Today, 9:12 AM",
  },
];

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function filterRows<T extends Record<string, unknown>>(
  rows: T[],
  query: Record<string, unknown>,
) {
  return rows.filter((row) =>
    Object.entries(query).every(([key, value]) => {
      if (!value) return true;
      const rowValue = String(row[key] ?? "").toLowerCase();
      return rowValue.includes(String(value).toLowerCase());
    }),
  );
}

function normalizeArrivalDate(value: unknown) {
  const raw = String(value ?? "");
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return raw || new Date().toISOString();
  const [, day, month, year] = match;
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

async function fetchLiveMandiPrices(query: {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  limit: number;
}) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(query.limit),
  });
  if (query.state) params.set("filters[state]", query.state);
  if (query.district) params.set("filters[district]", query.district);
  if (query.market) params.set("filters[market]", query.market);
  if (query.commodity) params.set("filters[commodity]", query.commodity);

  const response = await fetch(
    `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`data.gov.in returned ${response.status}`);

  const payload = (await response.json()) as {
    records?: Array<Record<string, unknown>>;
  };
  return (payload.records ?? []).map((record, index) => ({
    id: `live-${index}-${String(record.market ?? "market")}`,
    state: String(record.state ?? "Unknown"),
    district: String(record.district ?? "Unknown"),
    market: String(record.market ?? "Unknown"),
    commodity: String(record.commodity ?? "Unknown"),
    variety: String(record.variety ?? "Common"),
    minPrice: numberValue(record.min_price),
    maxPrice: numberValue(record.max_price),
    modalPrice: numberValue(record.modal_price),
    unit: "₹ / quintal",
    source: "data.gov.in",
    updatedAt: normalizeArrivalDate(record.arrival_date),
  }));
}

router.post("/auth/request-otp", (req, res) => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid phone number and role." });
    return;
  }

  const challengeId = randomUUID();
  challenges.set(challengeId, {
    phone: parsed.data.phone,
    role: parsed.data.role,
    name: parsed.data.name ?? null,
    otp: "1234",
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  res.json({
    challengeId,
    message: `OTP sent to ${parsed.data.phone.slice(-4).padStart(10, "•")}`,
    expiresInSeconds: 300,
    demoOtp: process.env.NODE_ENV === "production" ? null : "1234",
  });
});

router.post("/auth/verify-otp", (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Enter the 4-digit OTP sent to your phone." });
    return;
  }

  const challenge = challenges.get(parsed.data.challengeId);
  if (
    !challenge ||
    challenge.expiresAt < Date.now() ||
    challenge.phone !== parsed.data.phone ||
    challenge.role !== parsed.data.role ||
    challenge.otp !== parsed.data.otp
  ) {
    res.status(401).json({ error: "That OTP is invalid or has expired." });
    return;
  }

  challenges.delete(parsed.data.challengeId);
  res.json({
    id: `${parsed.data.role}-${parsed.data.phone.slice(-10)}`,
    phone: parsed.data.phone,
    role: parsed.data.role,
    name:
      parsed.data.name?.trim() ||
      (parsed.data.role === "farmer" ? "New farmer" : "New buyer"),
  });
});

const summaryCopy = {
  en: {
    headline: { farmer: "Good morning", buyer: "Source with confidence" },
    subheadline: { farmer: "Know your market. Sell at your best price.", buyer: "Fresh produce from farmers near your location." },
    stats: {
      farmer: [
        { label: "Today’s modal price", value: "₹2,900", detail: "Tomato · Pune APMC", tone: "positive" },
        { label: "Active listings", value: "03", detail: "2 getting buyer interest", tone: "neutral" },
        { label: "This month", value: "₹48.6k", detail: "+12.4% from last month", tone: "positive" },
        { label: "Nearby buyers", value: "18", detail: "Within 50 km of you", tone: "neutral" },
      ],
      buyer: [
        { label: "Nearby listings", value: "24", detail: "Fresh in the last 24 hours", tone: "positive" },
        { label: "Average savings", value: "14%", detail: "vs. local wholesale rates", tone: "positive" },
        { label: "Open orders", value: "01", detail: "One delivery in motion", tone: "neutral" },
        { label: "Trusted farmers", value: "08", detail: "Verified in your region", tone: "neutral" },
      ],
    },
    activity: {
      farmer: [
        { id: "a1", title: "A buyer viewed your tomato listing", detail: "FreshCart Foods · Grade A · 100 kg", time: "12 min ago", type: "view" },
        { id: "a2", title: "Mandi prices updated", detail: "Pune APMC · Tomato prices are up 6.2%", time: "1 hour ago", type: "price" },
        { id: "a3", title: "Your listing is live", detail: "Onion · 24 quintals · Nashik", time: "Yesterday", type: "listing" },
      ],
      buyer: [
        { id: "a1", title: "Your order is on the way", detail: "100 kg Grade A tomatoes · Harvest Hub Farm", time: "12 min ago", type: "order" },
        { id: "a2", title: "New farmer near you", detail: "Meena Deshmukh · Nashik · Onion", time: "1 hour ago", type: "farmer" },
        { id: "a3", title: "Price alert", detail: "Tomato prices dropped 4.1% in Pune", time: "Yesterday", type: "price" },
      ],
    },
  },
  hi: {
    headline: { farmer: "सुप्रभात", buyer: "भरोसे के साथ खरीदें" },
    subheadline: { farmer: "अपना बाजार जानें। सबसे अच्छे भाव पर बेचें।", buyer: "आपके पास के किसानों से ताज़ी उपज।" },
    stats: {
      farmer: [
        { label: "आज का मॉडल भाव", value: "₹2,900", detail: "टमाटर · पुणे APMC", tone: "positive" },
        { label: "सक्रिय लिस्टिंग", value: "03", detail: "2 में खरीदारों की रुचि", tone: "neutral" },
        { label: "इस महीने", value: "₹48.6k", detail: "पिछले महीने से +12.4%", tone: "positive" },
        { label: "पास के खरीदार", value: "18", detail: "आपसे 50 किमी के अंदर", tone: "neutral" },
      ],
      buyer: [
        { label: "पास की लिस्टिंग", value: "24", detail: "पिछले 24 घंटे की ताज़ी उपज", tone: "positive" },
        { label: "औसत बचत", value: "14%", detail: "स्थानीय थोक भावों की तुलना में", tone: "positive" },
        { label: "खुले ऑर्डर", value: "01", detail: "एक डिलीवरी चल रही है", tone: "neutral" },
        { label: "भरोसेमंद किसान", value: "08", detail: "आपके क्षेत्र में सत्यापित", tone: "neutral" },
      ],
    },
    activity: {
      farmer: [
        { id: "a1", title: "एक खरीदार ने आपकी टमाटर लिस्टिंग देखी", detail: "FreshCart Foods · ग्रेड A · 100 किलो", time: "12 मिनट पहले", type: "view" },
        { id: "a2", title: "मंडी भाव अपडेट हुए", detail: "पुणे APMC · टमाटर भाव 6.2% बढ़े", time: "1 घंटे पहले", type: "price" },
        { id: "a3", title: "आपकी लिस्टिंग लाइव है", detail: "प्याज · 24 क्विंटल · नासिक", time: "कल", type: "listing" },
      ],
      buyer: [
        { id: "a1", title: "आपका ऑर्डर रास्ते में है", detail: "100 किलो ग्रेड A टमाटर · Harvest Hub Farm", time: "12 मिनट पहले", type: "order" },
        { id: "a2", title: "आपके पास नया किसान", detail: "मीना देशमुख · नासिक · प्याज", time: "1 घंटे पहले", type: "farmer" },
        { id: "a3", title: "भाव अलर्ट", detail: "पुणे में टमाटर भाव 4.1% घटे", time: "कल", type: "price" },
      ],
    },
  },
  mr: {
    headline: { farmer: "शुभ सकाळ", buyer: "विश्वासाने खरेदी करा" },
    subheadline: { farmer: "तुमचा बाजार जाणून घ्या. सर्वोत्तम भावाने विका.", buyer: "तुमच्या परिसरातील शेतकऱ्यांकडून ताजे उत्पादन." },
    stats: {
      farmer: [
        { label: "आजचा मॉडल भाव", value: "₹2,900", detail: "टोमॅटो · पुणे APMC", tone: "positive" },
        { label: "सक्रिय जाहिराती", value: "03", detail: "2 मध्ये खरेदीदारांची रुची", tone: "neutral" },
        { label: "या महिन्यात", value: "₹48.6k", detail: "मागील महिन्यापेक्षा +12.4%", tone: "positive" },
        { label: "जवळचे खरेदीदार", value: "18", detail: "तुमच्यापासून 50 किमीमध्ये", tone: "neutral" },
      ],
      buyer: [
        { label: "जवळच्या जाहिराती", value: "24", detail: "गेल्या 24 तासांतील ताजे उत्पादन", tone: "positive" },
        { label: "सरासरी बचत", value: "14%", detail: "स्थानिक घाऊक भावांच्या तुलनेत", tone: "positive" },
        { label: "उघड्या ऑर्डर्स", value: "01", detail: "एक डिलिव्हरी सुरू आहे", tone: "neutral" },
        { label: "विश्वासार्ह शेतकरी", value: "08", detail: "तुमच्या भागात सत्यापित", tone: "neutral" },
      ],
    },
    activity: {
      farmer: [
        { id: "a1", title: "एका खरेदीदाराने तुमची टोमॅटो जाहिरात पाहिली", detail: "FreshCart Foods · दर्जा A · 100 किलो", time: "12 मिनिटांपूर्वी", type: "view" },
        { id: "a2", title: "मंडी भाव अपडेट झाले", detail: "पुणे APMC · टोमॅटो भाव 6.2% वाढले", time: "1 तासापूर्वी", type: "price" },
        { id: "a3", title: "तुमची जाहिरात लाईव्ह आहे", detail: "कांदा · 24 क्विंटल · नाशिक", time: "काल", type: "listing" },
      ],
      buyer: [
        { id: "a1", title: "तुमची ऑर्डर मार्गावर आहे", detail: "100 किलो दर्जा A टोमॅटो · Harvest Hub Farm", time: "12 मिनिटांपूर्वी", type: "order" },
        { id: "a2", title: "तुमच्या जवळ नवीन शेतकरी", detail: "मीना देशमुख · नाशिक · कांदा", time: "1 तासापूर्वी", type: "farmer" },
        { id: "a3", title: "भाव अलर्ट", detail: "पुण्यात टोमॅटो भाव 4.1% कमी झाले", time: "काल", type: "price" },
      ],
    },
  },
} as const;

router.get("/dashboard/summary", (req, res) => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid role is required." });
    return;
  }

  const isFarmer = parsed.data.role === "farmer";
  const copy = summaryCopy[parsed.data.language ?? "en"];
  res.json({
    role: parsed.data.role,
    headline: copy.headline[isFarmer ? "farmer" : "buyer"],
    subheadline: copy.subheadline[isFarmer ? "farmer" : "buyer"],
    stats: copy.stats[isFarmer ? "farmer" : "buyer"],
    activity: copy.activity[isFarmer ? "farmer" : "buyer"],
    trend: [
      { month: "Sep", current: 2180, previous: 2040 },
      { month: "Oct", current: 2310, previous: 2180 },
      { month: "Nov", current: 2460, previous: 2260 },
      { month: "Dec", current: 2390, previous: 2420 },
      { month: "Jan", current: 2650, previous: 2490 },
      { month: "Feb", current: 2900, previous: 2550 },
    ],
  });
});

router.get("/mandi-prices", async (req, res) => {
  const parsed = GetMandiPricesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid mandi search filters." });
    return;
  }

  const query = {
    state: parsed.data.state,
    district: parsed.data.district,
    market: parsed.data.market,
    commodity: parsed.data.commodity,
    limit: parsed.data.limit ?? 20,
  };

  try {
    const liveRows = await fetchLiveMandiPrices(query);
    if (liveRows && liveRows.length > 0) {
      res.json(liveRows);
      return;
    }
  } catch (error) {
    req.log.warn({ err: error }, "Live mandi price request failed; using fallback");
  }

  const filtered = filterRows(fallbackMandiPrices, {
    state: query.state,
    district: query.district,
    market: query.market,
    commodity: query.commodity,
  }).slice(0, query.limit);
  res.json(filtered.length > 0 ? filtered : fallbackMandiPrices.slice(0, query.limit));
});

router.get("/listings", (req, res) => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing filters." });
    return;
  }

  const { district, commodity, grade, maxPrice } = parsed.data;
  const results = listings.filter((listing) => {
    if (district && !listing.district.toLowerCase().includes(district.toLowerCase())) return false;
    if (commodity && listing.commodity.toLowerCase() !== commodity.toLowerCase()) return false;
    if (grade && listing.grade !== grade) return false;
    if (maxPrice && listing.price > maxPrice) return false;
    return true;
  });
  res.json(results);
});

router.post("/listings", (req, res) => {
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Complete the crop, quantity, price, and location fields." });
    return;
  }

  const listing: Listing = {
    ...parsed.data,
    id: randomUUID(),
    farmerId: "farmer-current",
    photoUrl: parsed.data.photoUrl ?? null,
    postedAt: "Just now",
    status: "Available",
    distanceKm: 0,
  };
  listings.unshift(listing);
  res.status(201).json(listing);
});

router.get("/orders", (_req, res) => {
  res.json(orders);
});

router.post("/orders", (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a listing, quantity, and delivery city." });
    return;
  }

  const listing = listings.find((item) => item.id === parsed.data.listingId);
  if (!listing) {
    res.status(404).json({ error: "That listing is no longer available." });
    return;
  }

  const productTotal = listing.price * parsed.data.quantity;
  const shipping = parsed.data.isSample ? 150 : Math.round(productTotal * 0.02);
  const order: Order = {
    ...parsed.data,
    id: `order-${randomUUID().slice(0, 8)}`,
    commodity: listing.commodity,
    farmerName: listing.farmerName,
    total: productTotal + shipping,
    status: "Ordered",
    createdAt: "Just now",
  };
  orders.unshift(order);
  res.status(201).json(order);
});

router.post("/ai-chat", (req, res) => {
  const parsed = SendAiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please type a question first." });
    return;
  }

  const language = parsed.data.language.toLowerCase();
  const isHindi = language.startsWith("hi");
  const isMarathi = language.startsWith("mr");
  const reply = isHindi
    ? "आपकी फसल के लिए आज की मंडी कीमत देखकर ही बातचीत शुरू करें। ग्रेड, मात्रा और नज़दीकी मंडी की कीमत साझा करने से बेहतर सौदा मिल सकता है।"
    : isMarathi
      ? "तुमच्या पिकासाठी आजचा बाजारभाव पाहूनच चर्चा सुरू करा. प्रतवारी, प्रमाण आणि जवळच्या बाजाराचा भाव सांगितल्यास चांगला सौदा मिळू शकतो."
      : "Start with today's mandi modal price for your crop. Sharing the grade, quantity, and nearest market rate helps you negotiate with confidence.";
  res.json({
    reply,
    suggestions: isHindi
      ? ["आज टमाटर का भाव क्या है?", "फसल की गुणवत्ता कैसे सुधारें?", "खरीदार से कैसे बात करें?"]
      : isMarathi
        ? ["आजचा टोमॅटो भाव काय आहे?", "पिकाची गुणवत्ता कशी वाढवावी?", "खरेदीदाराशी कसे बोलावे?"]
        : ["What is today's tomato price?", "How can I improve crop quality?", "How should I negotiate?"],
  });
});

export default router;