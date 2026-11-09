// Platform-owned: do not edit. Local and Preview entry point.
import app from './app';
import { closeDatabase } from './db/client';

const port = Number(process.env.PORT) || 3001;
const server = app.listen(port, () => {
  console.log(`[api] listening on ${port}`);
});

function shutdown() {
  server.close(() => {
    void closeDatabase().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
