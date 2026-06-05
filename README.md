# California Burrito Incident Desk

Restaurant incident reporting tool with a React/Vite frontend and Express API.

## Features

- Separate pages for dashboard, report submission, incident queue, and incident details
- Incident create, read, update, delete, and status update flows
- Search by incident title
- Filters for category, severity, and status
- Responsive QSR-style UI inspired by California Burrito branding
- Local JSON persistence for quick review, with optional Supabase/Postgres storage

## Run Locally

Install dependencies:

```powershell
npm install
```

Start the backend:

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
- `DELETE /api/incidents/:id`

## Pages

- `/` - operations dashboard and summary metrics
- `/report` - incident submission form
- `/incidents` - searchable/filterable manager queue
- `/incidents/:id` - incident detail, edit, and delete page

## Deployment

Suggested deployment:

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or Azure App Service
- Database: Supabase Postgres

Set these backend environment variables in production:

```text
PORT=4000
CLIENT_ORIGIN=https://your-frontend-domain.example
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The included `vercel.json` proxies `/api/*` to the Render backend:

```text
https://california-burrito.onrender.com
```

Alternatively, set this frontend environment variable when the API is deployed on a different domain:

```text
VITE_API_URL=https://your-api-domain.example
```

For Vercel, keep `vercel.json` so browser routes like `/report` and `/incidents/1` load correctly on refresh.

## Assumptions

- Authentication and role-based access are optional bonus scope and not required for the core assessment.
- The local JSON fallback is for development/review only; Supabase/Postgres should be used for production persistence.
- Incident status starts as `Open` unless edited by a manager.
