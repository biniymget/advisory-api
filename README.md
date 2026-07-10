# advisory-api

Minimal advisory API for channel adaptation prototype.

This project exposes a small in-memory API that:
- stores and lists agricultural advisories,
- generates weather and fertilizer advisories from mocked data,
- adapts advisory content for SMS, IVR, and video channels,
- routes and simulates delivery to farmer profiles,
- captures feedback and returns a simple analytics summary.

## Tech Stack

- Node.js
- Express

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run the API

```bash
npm start
```

Default port is `5000` (override with `PORT`):

```bash
PORT=8080 npm start
```

Startup log:

```text
Advisory API running on port <PORT>
```

## API Base URL

`http://localhost:5000`

## Endpoints

### Health and dependencies

- `GET /`
  - Returns service metadata and architecture layer tags.
- `GET /dependencies`
  - Returns mocked upstream data/service dependencies.

### Farmers

- `GET /farmers`
  - Returns all in-memory farmer profiles.
- `GET /farmers/:farmerId`
  - Returns one farmer profile by id.

### Advisories

- `GET /advisories?region=<region>&type=<type>`
  - Lists canonical advisories (filters are optional).
- `POST /advisories`
  - Creates a canonical advisory.
  - Required fields: `region`, `type`, `message`, `confidence`.
- `POST /generate/weather`
  - Generates weather advisory for a region.
  - Body: `{ "region": "Bahir Dar", "save": true }` (`save` optional; default `true`).
- `POST /generate/fertilizer`
  - Generates fertilizer advisory for a region.
  - Body: `{ "region": "Adama", "save": true }` (`save` optional; default `true`).
- `GET /advisory?region=<region>|farmer_id=<id>&type=<type>&mode=<minimum|maximum>&include_adapted=<true|false>`
  - Returns one resolved advisory plus optional adapted outputs.
  - At least one of `region` or `farmer_id` is required.

### Adaptation and routing

- `POST /adapt/:channel`
  - Adapts an advisory to one channel (`sms`, `ivr`, `video`).
  - Body: `{ "advisory_id": "adv-weather-bahirdar-001" }`
- `GET /routing/decision?farmer_id=<id>&mode=<minimum|maximum>&type=<type>`
  - Returns selected channels and gateway plan for a farmer.

### Delivery and feedback

- `POST /deliver`
  - Simulates dispatch of advisory content using selected channel policy.
  - Body: `{ "farmer_id": "1", "advisory_id": "adv-weather-bahirdar-001", "mode": "minimum" }`
- `GET /deliveries?farmer_id=<id>`
  - Lists all deliveries, or only those for one farmer.
- `POST /feedback/capture`
  - Captures engagement feedback.
  - Body: `{ "farmer_id": "1", "channel": "sms", "signal": "clicked", "delivery_id": "..." }`
- `GET /feedback`
  - Lists captured feedback events.
- `GET /analytics/summary`
  - Returns aggregate totals and engagement rate.

## Sample Requests

Get farmer-specific advisory with adapted outputs:

```bash
curl "http://localhost:5000/advisory?farmer_id=1&mode=maximum&include_adapted=true"
```

Create and deliver an advisory:

```bash
curl -X POST "http://localhost:5000/advisories" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Hawassa",
    "type": "weather",
    "message": "Rain expected in 5 days. Delay top-dressing.",
    "confidence": "medium"
  }'
```

```bash
curl -X POST "http://localhost:5000/deliver" \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_id": "9",
    "advisory_id": "adv-weather-adama-001",
    "mode": "minimum"
  }'
```

## Notes

- Data is in-memory and resets when the process restarts.
- External systems (weather feed, soil data, gateways, TTS, video hosting) are mocked.
- No automated tests are currently configured (`npm test` prints a placeholder message).
