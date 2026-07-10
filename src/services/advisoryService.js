const {
  weatherForecasts,
  fertilizerRules,
  farmerProfiles,
  gatewayByChannel,
  state
} = require("../data/store");

const normalize = (value) => String(value).trim().toLowerCase();
const toTitleCase = (value) =>
  String(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const findAdvisoryByRegionAndType = (region, type) =>
  state.canonicalAdvisories.find((item) => {
    const sameRegion = normalize(item.region) === normalize(region);
    if (!sameRegion) {
      return false;
    }
    if (!type) {
      return true;
    }
    return normalize(item.type) === normalize(type);
  });

const getFarmerById = (farmerId) => farmerProfiles[String(farmerId)] || null;
const listFarmers = () => Object.values(farmerProfiles);

const listAdvisories = ({ region, type }) => {
  let data = state.canonicalAdvisories;
  if (region) {
    data = data.filter((item) => normalize(item.region) === normalize(region));
  }
  if (type) {
    data = data.filter((item) => normalize(item.type) === normalize(type));
  }
  return data;
};

const createAdvisory = (advisory) => {
  const saved = {
    id: advisory.id || nextId("adv-manual"),
    crop: advisory.crop || "mixed",
    stage: advisory.stage || "unknown",
    valid_until: advisory.valid_until || "2026-07-31",
    language: advisory.language || "am",
    ...advisory
  };
  state.canonicalAdvisories.push(saved);
  return saved;
};

const generateWeatherAdvisory = (region) => {
  const key = normalize(region);
  const forecast = weatherForecasts[key];
  if (!forecast) {
    return null;
  }

  if (forecast.rain_in_days) {
    return {
      id: nextId("adv-weather"),
      region: toTitleCase(region),
      type: "weather",
      message: `Rain expected in ${forecast.rain_in_days} days. Delay fertilizer application.`,
      confidence: forecast.confidence,
      crop: "mixed",
      stage: "seasonal planning",
      valid_until: "2026-07-31",
      language: "am"
    };
  }

  return {
    id: nextId("adv-weather"),
    region: toTitleCase(region),
    type: "weather",
    message: `Dry spell likely for ${forecast.dry_spell_days} days. Prioritize supplemental irrigation.`,
    confidence: forecast.confidence,
    crop: "mixed",
    stage: "vegetative",
    valid_until: "2026-07-31",
    language: "am"
  };
};

const generateFertilizerAdvisory = (region) => {
  const key = normalize(region);
  const rule = fertilizerRules[key];
  if (!rule) {
    return null;
  }

  return {
    id: nextId("adv-fertilizer"),
    region: toTitleCase(region),
    type: "fertilizer",
    message: `${rule.recommendation}`,
    confidence: "high",
    crop: rule.crop,
    stage: rule.stage,
    valid_until: "2026-07-31",
    language: "om"
  };
};

const saveAdvisory = (advisory) => {
  state.canonicalAdvisories.push(advisory);
  return advisory;
};

const buildSmsText = (advisory) => {
  const base = `${advisory.region}: ${advisory.message}`;
  return base.length <= 160 ? base : `${base.slice(0, 157)}...`;
};

const buildIvrScript = (advisory) =>
  `Hello farmer. Advisory for ${advisory.region}. ${advisory.message} Confidence is ${advisory.confidence}. Press 1 to repeat.`;

const buildVideoPayload = (advisory) => ({
  title: `${advisory.type.toUpperCase()} advisory for ${advisory.region}`,
  slides: [
    `Crop: ${advisory.crop || "N/A"} | Stage: ${advisory.stage || "N/A"}`,
    advisory.message,
    `Confidence: ${advisory.confidence} | Valid until: ${advisory.valid_until || "N/A"}`
  ],
  voiceover: advisory.message
});

const adaptAdvisory = (advisory) => ({
  sms_text: buildSmsText(advisory),
  ivr_script: buildIvrScript(advisory),
  video_payload: buildVideoPayload(advisory)
});

const resolveChannelsForProfile = (profile, mode) =>
  mode === "minimum" ? [profile.minimum_channel] : profile.maximum_channels;

const createDelivery = ({ farmer, advisory, mode }) => {
  const selectedChannels = resolveChannelsForProfile(farmer, mode);
  const adapted = adaptAdvisory(advisory);
  const delivery = {
    delivery_id: nextId("delivery"),
    farmer_id: farmer.farmer_id,
    advisory_id: advisory.id,
    region: farmer.region,
    mode,
    dispatched: selectedChannels.map((channel) => {
      if (channel === "sms") {
        return {
          channel,
          gateway: gatewayByChannel.sms,
          status: "queued",
          payload_preview: adapted.sms_text
        };
      }
      if (channel === "ivr") {
        return {
          channel,
          gateway: gatewayByChannel.ivr,
          status: "queued",
          payload_preview: adapted.ivr_script
        };
      }
      if (channel === "video") {
        return {
          channel,
          gateway: gatewayByChannel.video,
          status: "queued",
          payload_preview: adapted.video_payload.title
        };
      }
      return {
        channel,
        gateway: gatewayByChannel.agent,
        status: "queued",
        payload_preview: advisory.message
      };
    }),
    created_at: new Date().toISOString()
  };
  state.deliveryLogs.push(delivery);
  return delivery;
};

const listDeliveries = (farmerId) => {
  if (!farmerId) {
    return state.deliveryLogs;
  }
  return state.deliveryLogs.filter((item) => item.farmer_id === String(farmerId));
};

const captureFeedback = ({ farmerId, channel, signal, deliveryId }) => {
  const event = {
    feedback_id: nextId("feedback"),
    farmer_id: String(farmerId),
    channel,
    signal,
    delivery_id: deliveryId || null,
    created_at: new Date().toISOString()
  };
  state.feedbackEvents.push(event);
  return event;
};

const listFeedback = () => state.feedbackEvents;

const buildAnalyticsSummary = () => {
  const deliveries = state.deliveryLogs.length;
  const feedbackCount = state.feedbackEvents.length;
  const feedbackByChannel = state.feedbackEvents.reduce((acc, item) => {
    acc[item.channel] = (acc[item.channel] || 0) + 1;
    return acc;
  }, {});

  return {
    totals: {
      canonical_advisories: state.canonicalAdvisories.length,
      deliveries,
      feedback_events: feedbackCount
    },
    feedback_by_channel: feedbackByChannel,
    engagement_rate: deliveries === 0 ? 0 : Number((feedbackCount / deliveries).toFixed(2)),
    note: "In production, this layer would calibrate confidence and update routing preferences."
  };
};

module.exports = {
  findAdvisoryByRegionAndType,
  getFarmerById,
  listFarmers,
  listAdvisories,
  createAdvisory,
  generateWeatherAdvisory,
  generateFertilizerAdvisory,
  saveAdvisory,
  adaptAdvisory,
  resolveChannelsForProfile,
  createDelivery,
  listDeliveries,
  captureFeedback,
  listFeedback,
  buildAnalyticsSummary,
  state
};
