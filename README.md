# Instagram Connector Service

A simplified TypeScript + Node.js + Express service for fetching public Instagram reels.

## Features

- Clean REST API for fetching Instagram reels
- TypeScript for type safety and better development experience
- Support for pagination with cursors
- Configurable Instagram API constants

## Prerequisites

- Node.js (v14+)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and modify as needed:

```bash
cp .env.example .env
```

4. Build the TypeScript code:

```bash
npm run build
```

## Usage

### Start the server

```bash
npm start
```

### Development mode with hot reloading

```bash
npm run dev
```

## API Endpoints

### REST API

- **GET /instagram/reels/:username** - Get reels for a specific username
  - Query parameters:
    - `cursor` - Optional pagination cursor

Example: `http://localhost:4000/instagram/reels/:username?cursor=abc123`


## Response Format

```json
{
  "nodes": [
    {
      "id": "12345",
      "code": "ABC123",
      "originalUrl": "https://instagram.fcdg3-1.fna.fbcdn.net/..."
    }
    // more nodes...
  ],
  "pageInfo": {
    "cursor": "next_page_cursor",
    "hasNextPage": true
  }
}
```

## Configuration

All Instagram API constants are configurable via environment variables:

```
INSTAGRAM_USER_AGENT - User agent to use for Instagram API requests
INSTAGRAM_APP_ID - Instagram App ID for API requests
INSTAGRAM_API_BASE_URL - Base URL for Instagram API
MEDIA_COUNT - Number of media items to fetch per request
```

This flexibility allows you to quickly update settings if Instagram changes their API structure or blocks certain requests.

## Notes

- This service only works with public Instagram accounts
- Instagram's API may change, requiring updates to this service

## License

ISC