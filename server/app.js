import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

export const storageMode = supabase ? 'Supabase/Postgres' : 'local JSON fallback';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'incidents.json');

const categories = new Set([
  'POS Issue',
  'Delivery Delay',
  'Inventory',
  'Kitchen Equipment',
  'Customer Complaint',
  'Other',
]);

const severities = new Set(['Low', 'Medium', 'High', 'Critical']);
const statuses = new Set(['Open', 'In Progress', 'Resolved']);

const seedIncidents = [
  {
    id: 1,
    title: 'POS terminal offline during lunch rush',
    description: 'Front counter POS terminal stopped taking card payments and needs a restart.',
    category: 'POS Issue',
    storeLocation: 'Bengaluru - Indiranagar',
    severity: 'Critical',
    status: 'Open',
    createdAt: '2026-06-05T12:38:00.000Z',
    updatedAt: '2026-06-05T12:38:00.000Z',
  },
  {
    id: 2,
    title: 'Rice warmer temperature fluctuation',
    description: 'Kitchen team noticed the rice warmer dipping below safe hold temperature.',
    category: 'Kitchen Equipment',
    storeLocation: 'Bengaluru - Koramangala',
    severity: 'High',
    status: 'In Progress',
    createdAt: '2026-06-05T10:12:00.000Z',
    updatedAt: '2026-06-05T10:12:00.000Z',
  },
  {
    id: 3,
    title: 'Avocado stock running low',
    description: 'Only two trays of avocado remain for the evening service window.',
    category: 'Inventory',
    storeLocation: 'Hyderabad - Hitech City',
    severity: 'Medium',
    status: 'Open',
    createdAt: '2026-06-04T17:45:00.000Z',
    updatedAt: '2026-06-04T17:45:00.000Z',
  },
  {
    id: 4,
    title: 'Delivery partner pickup delay',
    description: 'Multiple app orders waited over 15 minutes for rider assignment.',
    category: 'Delivery Delay',
    storeLocation: 'Chennai - T Nagar',
    severity: 'Low',
    status: 'Resolved',
    createdAt: '2026-06-04T14:20:00.000Z',
    updatedAt: '2026-06-04T14:20:00.000Z',
  },
];

const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || 'http://localhost:3000,https://california-burrito.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    name: 'California Burrito Incident API',
    ok: true,
    health: '/api/health',
    incidents: '/api/incidents',
  });
});

function toClient(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    storeLocation: row.store_location ?? row.storeLocation,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function toDatabase(incident) {
  return {
    title: incident.title,
    description: incident.description,
    category: incident.category,
    store_location: incident.storeLocation,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.createdAt,
    updated_at: incident.updatedAt,
  };
}

async function readLocalIncidents() {
  try {
    const data = await readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seedIncidents, null, 2));
    return seedIncidents;
  }
}

async function writeLocalIncidents(incidents) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(incidents, null, 2));
}

function validateIncident(body) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim();
  const storeLocation = String(body.storeLocation || '').trim();
  const severity = String(body.severity || '').trim();
  const createdAt = body.createdAt ? new Date(body.createdAt) : new Date();
  const errors = {};

  if (title.length < 5) errors.title = 'Incident title must be at least 5 characters.';
  if (description.length < 10) errors.description = 'Incident description must be at least 10 characters.';
  if (!categories.has(category)) errors.category = 'Choose a valid incident category.';
  if (!storeLocation) errors.storeLocation = 'Store location is required.';
  if (!severities.has(severity)) errors.severity = 'Choose a valid severity.';
  if (Number.isNaN(createdAt.getTime())) errors.createdAt = 'Choose a valid date and time.';

  return {
    errors,
    incident: {
      title,
      description,
      category,
      storeLocation,
      severity,
      status: 'Open',
      createdAt: createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, storage: supabase ? 'supabase' : 'local-json' });
});

app.get('/api/incidents', async (req, res, next) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data.map(toClient));
      return;
    }

    const incidents = await readLocalIncidents();
    res.json(incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    next(error);
  }
});

app.get('/api/incidents/:id', async (req, res, next) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error) throw error;
      res.json(toClient(data));
      return;
    }

    const incidents = await readLocalIncidents();
    const found = incidents.find((incident) => String(incident.id) === String(req.params.id));
    if (!found) {
      res.status(404).json({ errors: { incident: 'Incident not found.' } });
      return;
    }

    res.json(found);
  } catch (error) {
    next(error);
  }
});

app.post('/api/incidents', async (req, res, next) => {
  try {
    const { errors, incident } = validateIncident(req.body);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('incidents')
        .insert(toDatabase(incident))
        .select('*')
        .single();

      if (error) throw error;
      res.status(201).json(toClient(data));
      return;
    }

    const incidents = await readLocalIncidents();
    const nextIncident = {
      id: Date.now(),
      ...incident,
    };
    await writeLocalIncidents([nextIncident, ...incidents]);
    res.status(201).json(nextIncident);
  } catch (error) {
    next(error);
  }
});

app.put('/api/incidents/:id', async (req, res, next) => {
  try {
    const { errors, incident } = validateIncident(req.body);
    const status = String(req.body.status || 'Open').trim();
    if (!statuses.has(status)) errors.status = 'Choose a valid status.';

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const updatedIncident = {
      ...incident,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('incidents')
        .update(toDatabase(updatedIncident))
        .eq('id', req.params.id)
        .select('*')
        .single();

      if (error) throw error;
      res.json(toClient(data));
      return;
    }

    const incidents = await readLocalIncidents();
    const found = incidents.find((item) => String(item.id) === String(req.params.id));
    if (!found) {
      res.status(404).json({ errors: { incident: 'Incident not found.' } });
      return;
    }

    const nextIncident = { ...found, ...updatedIncident };
    await writeLocalIncidents(
      incidents.map((item) => (String(item.id) === String(req.params.id) ? nextIncident : item)),
    );
    res.json(nextIncident);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/incidents/:id/status', async (req, res, next) => {
  try {
    const updated = await updateIncidentStatus(req.params.id, req.body.status);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.post('/api/incidents/:id/status', async (req, res, next) => {
  try {
    const updated = await updateIncidentStatus(req.params.id, req.body.status);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

async function updateIncidentStatus(id, rawStatus) {
  const status = String(rawStatus || '').trim();
  if (!statuses.has(status)) {
    const error = new Error('Choose a valid status.');
    error.statusCode = 400;
    error.errors = { status: 'Choose a valid status.' };
    throw error;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      error.statusCode = 500;
      throw error;
    }

    if (!data) {
      const notFound = new Error('Incident not found.');
      notFound.statusCode = 404;
      notFound.errors = { incident: 'Incident not found.' };
      throw notFound;
    }

    return toClient(data);
  }

  const incidents = await readLocalIncidents();
  const found = incidents.find((incident) => String(incident.id) === String(id));
  if (!found) {
    const error = new Error('Incident not found.');
    error.statusCode = 404;
    error.errors = { incident: 'Incident not found.' };
    throw error;
  }

  const updated = {
    ...found,
    status,
    updatedAt: new Date().toISOString(),
  };
  await writeLocalIncidents(
    incidents.map((incident) => (String(incident.id) === String(id) ? updated : incident)),
  );
  return updated;
}

app.delete('/api/incidents/:id', async (req, res, next) => {
  try {
    if (supabase) {
      const { error } = await supabase.from('incidents').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).send();
      return;
    }

    const incidents = await readLocalIncidents();
    const nextIncidents = incidents.filter((incident) => String(incident.id) !== String(req.params.id));
    if (nextIncidents.length === incidents.length) {
      res.status(404).json({ errors: { incident: 'Incident not found.' } });
      return;
    }

    await writeLocalIncidents(nextIncidents);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    error: error.message || 'Something went wrong while handling incidents.',
    errors: error.errors,
  });
});

export default app;
