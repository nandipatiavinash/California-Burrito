import app, { storageMode } from './app.js';

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Incident API running on http://localhost:${port}`);
  console.log(`Storage mode: ${storageMode}`);
});
