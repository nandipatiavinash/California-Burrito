# California Burrito Incident Desk

Restaurant incident reporting tool with a React/Vite frontend and Express API. The API can run locally as an Express server and deploy on Vercel as serverless functions.

## Submission Links

- GitHub Repository: https://github.com/nandipatiavinash/California-Burrito
- Deployed Application: https://california-burrito.vercel.app

## Features

- Separate pages for dashboard, report submission, incident queue, and incident details
- Incident create, read, update, delete, and status update flows
- AI incident assistant for category, severity, and summary suggestions
- Search by incident title
- Filters for category, severity, and status
- Responsive QSR-style UI inspired by California Burrito branding
- Local JSON persistence for quick review, with optional Supabase/Postgres storage

## Run Locally

Install dependencies:

```powershell
npm install
```

Start the backend locally:

```powershell
npm run dev:api
```

Start the frontend in a second terminal:

```powershell
npm run dev -- --port 3000
```

Open `http://localhost:3000`.

## Tech Stack

- React
- Vite
- React Router
- Node.js
- Express
- Supabase/Postgres optional database
- Local JSON fallback for zero-config review

## External Libraries And Services

- `react`, `react-dom` - frontend UI
- `react-router-dom` - multi-page routing
- `lucide-react` - UI icons
- `express` - API routing
- `@supabase/supabase-js` - Supabase/Postgres database access
- `cors` and `dotenv` - API configuration
- Vercel - deployed frontend and serverless API
- Supabase - production PostgreSQL database
- OpenAI Responses API - optional AI assistant provider

## AI Assistant

The report form includes an AI assistant that suggests:

- Incident category
- Severity level
- Short manager summary
- Reason for the recommendation

It works without external services using local restaurant-operations rules. To use OpenAI instead, add these environment variables in Vercel:

```text
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5-mini
```

If the OpenAI request fails or no key is configured, the app automatically falls back to local suggestions.

## Database

By default, the backend persists incidents to `data/incidents.json`, so the app works without a database.

To use Supabase/Postgres:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Restart `npm run dev:api`.

## API

- `GET /api/health`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents`
- `PUT /api/incidents/:id`
- `PATCH /api/incidents/:id/status`
- `POST /api/incidents/:id/status`
- `DELETE /api/incidents/:id`
- `POST /api/assistant`

## Pages

- `/` - operations dashboard and summary metrics
- `/report` - incident submission form
- `/incidents` - searchable/filterable manager queue
- `/incidents/:id` - incident detail, edit, and delete page

## Deployment

Recommended deployment:

- Frontend and API: Vercel
- Database: Supabase Postgres

Set these Vercel environment variables:

```text
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=optional-openai-api-key
OPENAI_MODEL=gpt-5-mini
```

Vercel serves the React app and the API from the same domain. Keep `vercel.json` so browser routes like `/report` and `/incidents/1` load correctly on refresh.

Test these after deployment:

- `/api/health`
- `/api/incidents`

## Assumptions

- Authentication and role-based access are optional bonus scope and not required for the core assessment.
- The local JSON fallback is for development/review only; Supabase/Postgres should be used for Vercel production persistence.
- Incident status starts as `Open` unless edited by a manager.
