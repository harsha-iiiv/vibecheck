# YouTube Music RapidAPI Integration Guide

## Base Info

**Host**
```txt
youtube-music4.p.rapidapi.com
```

**Headers**
```http
x-rapidapi-key: <RAPIDAPI_KEY>
x-rapidapi-host: youtube-music4.p.rapidapi.com
Content-Type: application/json
```

> Store the API key in an environment variable. Do not hardcode it in production.

---

# 1) Search Suggestions API

## Endpoint
```http
POST /search-suggestions
```

## Purpose
Returns autocomplete suggestions for a partial search query.

## Request Body
```json
{
  "q": "all of"
}
```

## Minimal cURL Example
```bash
curl -X POST "https://youtube-music4.p.rapidapi.com/search-suggestions" \
  -H "x-rapidapi-key: <RAPIDAPI_KEY>" \
  -H "x-rapidapi-host: youtube-music4.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"q":"all of"}'
```

## Clean Response Structure
```json
{
  "success": true,
  "message": "success",
  "results": [
    {
      "type": "SearchSuggestion",
      "icon_type": "SEARCH",
      "suggestion": {
        "text": "all of me"
      },
      "endpoint": {
        "type": "NavigationEndpoint",
        "api_url": "/search",
        "payload": {
          "query": "all of me"
        }
      }
    }
  ]
}
```

## Field Meanings
| Field | Type | Description |
|---|---|---|
| `success` | boolean | Request status |
| `message` | string | Human-readable status |
| `results` | array | List of suggestions |
| `results[].type` | string | Usually `SearchSuggestion` |
| `results[].icon_type` | string | Suggestion icon type |
| `results[].suggestion.text` | string | Final suggested query |
| `results[].endpoint.api_url` | string | Next API to call, usually `/search` |
| `results[].endpoint.payload.query` | string | Query to pass into search |

## Best LLM-Friendly Output
When using this endpoint, the LLM should extract:
```json
{
  "suggestions": [
    "all of me",
    "all of the lights",
    "all of me john legend lyrics",
    "all of the girls taylor swift"
  ]
}
```

---

# 2) Search API

## Endpoint
```http
POST /search
```

## Purpose
Searches YouTube Music content by query and optional content shelf.

## Request Body
```json
{
  "q": "all of me",
  "shelf": "song"
}
```

## Supported Useful Inputs
| Field | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search text |
| `shelf` | string | No | Content filter such as `song` |

## Minimal cURL Example
```bash
curl -X POST "https://youtube-music4.p.rapidapi.com/search" \
  -H "x-rapidapi-key: <RAPIDAPI_KEY>" \
  -H "x-rapidapi-host: youtube-music4.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"q":"all of me","shelf":"song"}'
```

## Clean Response Structure
```json
{
  "success": true,
  "message": "success",
  "results": {
    "continuation_token": "string",
    "data": [
      {
        "id": "sQtnhwU2R9Y",
        "item_type": "song",
        "title": "All of Me",
        "artists": [
          {
            "name": "John Legend",
            "channel_id": "UC7wYAi5loaBGEbOQz7VBF2w"
          }
        ],
        "album": {
          "id": "MPREb_JIdvUbsCbwZ",
          "name": "Love In The Future (Deluxe Edition)"
        },
        "duration": {
          "seconds": 270,
          "text": "4:30"
        },
        "thumbnail": [
          {
            "url": "https://...",
            "width": 120,
            "height": 120
          }
        ],
        "play_endpoint": {
          "api_url": "/player",
          "payload": {
            "videoId": "sQtnhwU2R9Y"
          }
        }
      }
    ]
  }
}
```

---

# Simplified Search Result Model

Use this simplified structure for LLM consumption:

```json
{
  "success": true,
  "query": "all of me",
  "filter": "song",
  "next_page_token": "continuation_token",
  "items": [
    {
      "id": "sQtnhwU2R9Y",
      "type": "song",
      "title": "All of Me",
      "artist_names": ["John Legend"],
      "artist_ids": ["UC7wYAi5loaBGEbOQz7VBF2w"],
      "album_name": "Love In The Future (Deluxe Edition)",
      "album_id": "MPREb_JIdvUbsCbwZ",
      "duration_text": "4:30",
      "duration_seconds": 270,
      "thumbnail_url": "https://...",
      "play_api_url": "/player",
      "play_payload": {
        "videoId": "sQtnhwU2R9Y"
      }
    }
  ]
}
```

---

# What to Ignore in Raw Responses

These fields are usually not needed unless you are building a full client UI:

- `runs`
- `flex_columns`
- `fixed_columns`
- `menu`
- `overlay`
- `badges` except when you want explicit labels
- deeply nested `metadata`
- sign-in modal objects
- queue actions
- share panel payloads

For LLM integration, keep only:
- ids
- titles
- artists
- albums
- thumbnails
- durations
- next endpoint payloads
- continuation token

---

# Recommended Parsing Rules for LLMs

## For `/search-suggestions`
Extract:
- `suggestion.text`
- `endpoint.payload.query`

Return compact suggestions like:
```json
{
  "suggestions": ["all of me", "all of the lights"]
}
```

## For `/search`
Extract from each item:
- `id`
- `item_type`
- `title`
- `artists[].name`
- `album.name`
- `album.id`
- `duration.text`
- `duration.seconds`
- first thumbnail URL
- `/player` payload if present

Return normalized items like:
```json
{
  "items": [
    {
      "id": "sQtnhwU2R9Y",
      "type": "song",
      "title": "All of Me",
      "artists": ["John Legend"],
      "album": "Love In The Future (Deluxe Edition)",
      "duration": "4:30"
    }
  ]
}
```

---

# Integration Template for an LLM Agent

## Step 1: Get Suggestions
When user input is partial:
```json
POST /search-suggestions
{
  "q": "<partial_query>"
}
```

## Step 2: Choose Best Suggestion or Use Raw Query
Pick:
- top suggestion, or
- original user query

## Step 3: Search Content
```json
POST /search
{
  "q": "<final_query>",
  "shelf": "song"
}
```

## Step 4: Normalize Results
Convert raw API output into:
```json
{
  "items": [
    {
      "id": "string",
      "title": "string",
      "type": "song|album|artist|playlist",
      "artists": ["string"],
      "album": "string",
      "duration": "string",
      "thumbnail": "string"
    }
  ]
}
```

---

# Clean Node.js Example

```js
const https = require("https");

function rapidApiRequest(path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: "youtube-music4.p.rapidapi.com",
        path,
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "youtube-music4.p.rapidapi.com",
          "Content-Type": "application/json"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function searchSuggestions(q) {
  const res = await rapidApiRequest("/search-suggestions", { q });
  return {
    success: res.success,
    suggestions: (res.results || []).map((x) => x?.suggestion?.text).filter(Boolean)
  };
}

async function searchSongs(q) {
  const res = await rapidApiRequest("/search", { q, shelf: "song" });

  return {
    success: res.success,
    nextPageToken: res?.results?.continuation_token || null,
    items: (res?.results?.data || []).map((item) => ({
      id: item.id,
      type: item.item_type,
      title: item.title,
      artists: (item.artists || []).map((a) => a.name),
      album: item.album?.name || null,
      albumId: item.album?.id || null,
      duration: item.duration?.text || null,
      durationSeconds: item.duration?.seconds || null,
      thumbnail: item.thumbnail?.contents?.[0]?.url || null,
      playPayload: item.overlay?.content?.endpoint?.payload || null
    }))
  };
}
```

---

# Compressed Version for LLM Prompting

```md
## API: YouTube Music RapidAPI

Base host: `youtube-music4.p.rapidapi.com`

Headers:
- `x-rapidapi-key: <RAPIDAPI_KEY>`
- `x-rapidapi-host: youtube-music4.p.rapidapi.com`
- `Content-Type: application/json`

### 1. Search Suggestions
**POST** `/search-suggestions`

Request:
```json
{ "q": "all of" }
```

Important response fields:
```json
{
  "success": true,
  "results": [
    {
      "suggestion": { "text": "all of me" },
      "endpoint": {
        "api_url": "/search",
        "payload": { "query": "all of me" }
      }
    }
  ]
}
```

Normalized output:
```json
{
  "suggestions": ["all of me", "all of the lights"]
}
```

### 2. Search
**POST** `/search`

Request:
```json
{ "q": "all of me", "shelf": "song" }
```

Important response fields:
```json
{
  "success": true,
  "results": {
    "continuation_token": "token",
    "data": [
      {
        "id": "sQtnhwU2R9Y",
        "item_type": "song",
        "title": "All of Me",
        "artists": [{ "name": "John Legend" }],
        "album": {
          "id": "MPREb_JIdvUbsCbwZ",
          "name": "Love In The Future (Deluxe Edition)"
        },
        "duration": {
          "seconds": 270,
          "text": "4:30"
        },
        "thumbnail": {
          "contents": [{ "url": "https://..." }]
        }
      }
    ]
  }
}
```

Normalized output:
```json
{
  "items": [
    {
      "id": "sQtnhwU2R9Y",
      "type": "song",
      "title": "All of Me",
      "artists": ["John Legend"],
      "album": "Love In The Future (Deluxe Edition)",
      "duration": "4:30",
      "duration_seconds": 270,
      "thumbnail": "https://..."
    }
  ],
  "next_page_token": "token"
}
```

### Ignore These Raw Fields
- `runs`
- `menu`
- `overlay`
- `flex_columns`
- `fixed_columns`
- sign-in modal data
- queue/share actions

### LLM Integration Flow
1. Call `/search-suggestions` for partial user text.
2. Pick best suggestion or original query.
3. Call `/search` with `q` and optional `shelf`.
4. Normalize raw response into simple `items[]`.
```
