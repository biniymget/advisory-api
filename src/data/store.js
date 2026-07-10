const externalDependencies = {
  weather_api_model: "EMI/ECMWF/NOAA (mocked)",
  soil_region_data: "EthioSIS (mocked)",
  agronomy_rules: "MoA/ATI blending guides (mocked)",
  tts_engine: "Amharic/Afaan Oromoo TTS (mocked)",
  video_hosting: "Video hosting/streaming (mocked)"
};

const weatherForecasts = {
  "bahir dar": { rain_in_days: 2, confidence: "medium" },
  adama: { dry_spell_days: 7, confidence: "high" },
  hawassa: { rain_in_days: 5, confidence: "low" }
};

const fertilizerRules = {
  "bahir dar": { crop: "wheat", stage: "tillering", recommendation: "Apply 50 kg/ha urea." },
  adama: { crop: "teff", stage: "vegetative", recommendation: "Apply 35 kg/ha NPS this week." },
  hawassa: { crop: "maize", stage: "top-dress", recommendation: "Apply 45 kg/ha urea after light rain." }
};

const farmerProfiles = {
  "1": {
    farmer_id: "1",
    region: "Bahir Dar",
    segment: "A",
    minimum_channel: "sms",
    maximum_channels: ["video", "sms"]
  },
  "2": {
    farmer_id: "2",
    region: "Adama",
    segment: "B",
    minimum_channel: "ivr",
    maximum_channels: ["sms", "ivr"]
  },
  "3": {
    farmer_id: "3",
    region: "Bahir Dar",
    segment: "C",
    minimum_channel: "ivr",
    maximum_channels: ["ivr", "agent"]
  },
  "4": {
    farmer_id: "4",
    region: "Adama",
    segment: "A",
    minimum_channel: "sms",
    maximum_channels: ["video", "sms"]
  },
  "5": {
    farmer_id: "5",
    region: "Adama",
    segment: "B",
    minimum_channel: "ivr",
    maximum_channels: ["ivr"]
  },
  "6": {
    farmer_id: "6",
    region: "Hawassa",
    segment: "C",
    minimum_channel: "agent",
    maximum_channels: ["ivr", "agent"]
  },
  "7": {
    farmer_id: "7",
    region: "Bahir Dar",
    segment: "A",
    minimum_channel: "sms",
    maximum_channels: ["video", "sms"]
  },
  "8": {
    farmer_id: "8",
    region: "Adama",
    segment: "B",
    minimum_channel: "sms",
    maximum_channels: ["sms", "ivr"]
  },
  "9": {
    farmer_id: "9",
    region: "Hawassa",
    segment: "A",
    minimum_channel: "sms",
    maximum_channels: ["video", "sms"]
  },
  "10": {
    farmer_id: "10",
    region: "Bahir Dar",
    segment: "C",
    minimum_channel: "ivr",
    maximum_channels: ["ivr", "agent"]
  }
};

const gatewayByChannel = {
  sms: "E1_SMS_GATEWAY",
  ivr: "E2_IVR_VOICE_GATEWAY",
  video: "E3_VIDEO_LINK_DELIVERY",
  agent: "E4_EXTENSION_AGENT_NETWORK"
};

const state = {
  canonicalAdvisories: [
    {
      id: "adv-weather-bahirdar-001",
      region: "Bahir Dar",
      type: "weather",
      message: "Rain expected in 2 days. Delay fertilizer application.",
      confidence: "medium",
      crop: "maize",
      stage: "pre-application",
      valid_until: "2026-07-14",
      language: "am"
    },
    {
      id: "adv-fertilizer-bahirdar-001",
      region: "Bahir Dar",
      type: "fertilizer",
      message: "Apply 50 kg/ha urea at tillering stage this week.",
      confidence: "high",
      crop: "wheat",
      stage: "tillering",
      valid_until: "2026-07-20",
      language: "om"
    },
    {
      id: "adv-weather-adama-001",
      region: "Adama",
      type: "weather",
      message: "Dry spell likely for 7 days. Prioritize supplemental irrigation.",
      confidence: "high",
      crop: "teff",
      stage: "vegetative",
      valid_until: "2026-07-18",
      language: "am"
    }
  ],
  deliveryLogs: [],
  feedbackEvents: []
};

module.exports = {
  externalDependencies,
  weatherForecasts,
  fertilizerRules,
  farmerProfiles,
  gatewayByChannel,
  state
};
