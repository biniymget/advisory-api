const express = require("express");

const { externalDependencies, gatewayByChannel } = require("../data/store");
const {
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
  buildAnalyticsSummary
} = require("../services/advisoryService");

const router = express.Router();

router.get("/", (_req, res) =>
  res.json({
    service: "advisory-api",
    status: "ok",
    architecture_layers: ["B3", "C1/C2/C3", "D1/D2", "E1/E2/E3", "G1/G2"],
    docs_hint: "See README for full endpoint list"
  })
);

router.get("/dependencies", (_req, res) => res.json(externalDependencies));

router.get("/farmers", (_req, res) => res.json(listFarmers()));
router.get("/farmers/:farmerId", (req, res) => {
  const profile = getFarmerById(req.params.farmerId);
  if (!profile) {
    return res.status(404).json({ error: "Farmer not found" });
  }
  return res.json(profile);
});

router.get("/advisories", (req, res) => {
  const { region, type } = req.query;
  return res.json(listAdvisories({ region, type }));
});

router.post("/advisories", (req, res) => {
  const advisory = req.body;
  const required = ["region", "type", "message", "confidence"];
  const missing = required.filter((field) => !advisory[field]);

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Invalid advisory payload",
      message: `Missing fields: ${missing.join(", ")}`
    });
  }

  return res.status(201).json(createAdvisory(advisory));
});

router.post("/generate/weather", (req, res) => {
  const { region, save = true } = req.body;
  if (!region) {
    return res.status(400).json({ error: "region is required" });
  }

  const advisory = generateWeatherAdvisory(region);
  if (!advisory) {
    return res.status(404).json({ error: `No forecast profile for region=${region}` });
  }
  if (save) {
    saveAdvisory(advisory);
  }
  return res.status(201).json(advisory);
});

router.post("/generate/fertilizer", (req, res) => {
  const { region, save = true } = req.body;
  if (!region) {
    return res.status(400).json({ error: "region is required" });
  }

  const advisory = generateFertilizerAdvisory(region);
  if (!advisory) {
    return res.status(404).json({ error: `No fertilizer rule for region=${region}` });
  }
  if (save) {
    saveAdvisory(advisory);
  }
  return res.status(201).json(advisory);
});

router.post("/adapt/:channel", (req, res) => {
  const { channel } = req.params;
  const { advisory_id } = req.body;
  const validChannels = ["sms", "ivr", "video"];

  if (!validChannels.includes(channel)) {
    return res.status(400).json({ error: "channel must be sms, ivr, or video" });
  }
  if (!advisory_id) {
    return res.status(400).json({ error: "advisory_id is required" });
  }

  const advisory = listAdvisories({}).find((item) => item.id === advisory_id);
  if (!advisory) {
    return res.status(404).json({ error: `No advisory with id=${advisory_id}` });
  }

  const adapted = adaptAdvisory(advisory);
  if (channel === "sms") {
    return res.json({ channel, advisory_id, sms_text: adapted.sms_text });
  }
  if (channel === "ivr") {
    return res.json({ channel, advisory_id, ivr_script: adapted.ivr_script, tts_provider: "mocked" });
  }
  return res.json({ channel, advisory_id, video_payload: adapted.video_payload, hosting_provider: "mocked" });
});

router.get("/advisory", (req, res) => {
  const { region, farmer_id, type, mode = "minimum", include_adapted = "true" } = req.query;

  if (!region && !farmer_id) {
    return res.status(400).json({
      error: "Missing query parameters",
      message: "Provide at least one of: region or farmer_id."
    });
  }

  if (mode !== "minimum" && mode !== "maximum") {
    return res.status(400).json({ error: "mode must be minimum or maximum" });
  }

  let resolvedRegion = region;
  let farmerProfile = null;

  if (farmer_id) {
    farmerProfile = getFarmerById(farmer_id);
    if (!farmerProfile) {
      return res.status(404).json({
        error: "Farmer not found",
        message: `No farmer profile found for farmer_id=${farmer_id}.`
      });
    }
    if (!resolvedRegion) {
      resolvedRegion = farmerProfile.region;
    }
  }

  const advisory = findAdvisoryByRegionAndType(resolvedRegion, type);
  if (!advisory) {
    return res.status(404).json({
      error: "Advisory not found",
      message: `No advisory found for region=${resolvedRegion}${type ? `, type=${type}` : ""}.`
    });
  }

  const channels = farmerProfile ? resolveChannelsForProfile(farmerProfile, mode) : [];
  const adapted = include_adapted === "true" ? adaptAdvisory(advisory) : null;

  return res.json({
    advisory_id: advisory.id,
    region: advisory.region,
    type: advisory.type,
    message: advisory.message,
    confidence: advisory.confidence,
    crop: advisory.crop,
    stage: advisory.stage,
    valid_until: advisory.valid_until,
    language: advisory.language,
    farmer_id: farmerProfile ? farmerProfile.farmer_id : null,
    segment: farmerProfile ? farmerProfile.segment : null,
    minimum_channel: farmerProfile ? farmerProfile.minimum_channel : null,
    maximum_channels: farmerProfile ? farmerProfile.maximum_channels : null,
    selected_channels: channels,
    adapted_outputs: adapted
  });
});

router.get("/routing/decision", (req, res) => {
  const { farmer_id, mode = "minimum", type } = req.query;
  if (!farmer_id) {
    return res.status(400).json({ error: "farmer_id is required" });
  }
  if (mode !== "minimum" && mode !== "maximum") {
    return res.status(400).json({ error: "mode must be minimum or maximum" });
  }

  const profile = getFarmerById(farmer_id);
  if (!profile) {
    return res.status(404).json({ error: `No farmer profile for farmer_id=${farmer_id}` });
  }

  const advisory = findAdvisoryByRegionAndType(profile.region, type);
  if (!advisory) {
    return res.status(404).json({ error: `No advisory for farmer region=${profile.region}` });
  }

  const selectedChannels = resolveChannelsForProfile(profile, mode);
  const gatewayPlan = selectedChannels.map((channel) => ({
    channel,
    gateway: gatewayByChannel[channel]
  }));

  return res.json({
    farmer_id: profile.farmer_id,
    segment: profile.segment,
    region: profile.region,
    advisory_id: advisory.id,
    mode,
    selected_channels: selectedChannels,
    gateway_plan: gatewayPlan
  });
});

router.post("/deliver", (req, res) => {
  const { farmer_id, advisory_id, mode = "minimum" } = req.body;
  if (!farmer_id || !advisory_id) {
    return res.status(400).json({ error: "farmer_id and advisory_id are required" });
  }
  if (mode !== "minimum" && mode !== "maximum") {
    return res.status(400).json({ error: "mode must be minimum or maximum" });
  }

  const farmer = getFarmerById(farmer_id);
  if (!farmer) {
    return res.status(404).json({ error: `No farmer profile for farmer_id=${farmer_id}` });
  }

  const advisory = listAdvisories({}).find((item) => item.id === advisory_id);
  if (!advisory) {
    return res.status(404).json({ error: `No advisory with id=${advisory_id}` });
  }

  return res.status(201).json(createDelivery({ farmer, advisory, mode }));
});

router.get("/deliveries", (req, res) => res.json(listDeliveries(req.query.farmer_id)));

router.post("/feedback/capture", (req, res) => {
  const { farmer_id, channel, signal, delivery_id } = req.body;
  if (!farmer_id || !channel || !signal) {
    return res.status(400).json({
      error: "farmer_id, channel, and signal are required"
    });
  }

  return res.status(201).json(
    captureFeedback({
      farmerId: farmer_id,
      channel,
      signal,
      deliveryId: delivery_id
    })
  );
});

router.get("/feedback", (_req, res) => res.json(listFeedback()));
router.get("/analytics/summary", (_req, res) => res.json(buildAnalyticsSummary()));

module.exports = router;
