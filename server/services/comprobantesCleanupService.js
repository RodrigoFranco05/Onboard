const fs = require('fs');
const path = require('path');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STATE_FILE_PATH = path.resolve(__dirname, '../limpieza-documentos-cada-24hs');
const COMPROBANTES_ROOT = path.resolve(__dirname, '../../client/src/comprobantes');
const WHATSAPP_COMPROBANTES_ROOT = path.resolve(__dirname, '../public/comprobantesWhatsapp');

async function readLastRunTimestamp() {
  try {
    const content = await fs.promises.readFile(STATE_FILE_PATH, 'utf8');
    const timestamp = Date.parse(content.trim());
    return Number.isNaN(timestamp) ? null : new Date(timestamp);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeLastRunTimestamp(date = new Date()) {
  await fs.promises.writeFile(STATE_FILE_PATH, date.toISOString(), 'utf8');
}

async function cleanupOldFiles(directory, maxAgeMs, now) {
  let removedFiles = 0;
  let dirEntries;

  try {
    dirEntries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return removedFiles;
    }
    throw error;
  }

  for (const entry of dirEntries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      removedFiles += await cleanupOldFiles(fullPath, maxAgeMs, now);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    let stats;
    try {
      stats = await fs.promises.stat(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    const referenceTime = !Number.isNaN(stats.birthtimeMs) && stats.birthtimeMs > 0
      ? stats.birthtimeMs
      : stats.mtimeMs;

    if (now - referenceTime >= maxAgeMs) {
      try {
        await fs.promises.unlink(fullPath);
        removedFiles += 1;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  return removedFiles;
}

async function cleanupOldComprobantes(maxAgeMs = DAY_IN_MS) {
  const now = Date.now();
  const roots = [COMPROBANTES_ROOT, WHATSAPP_COMPROBANTES_ROOT];
  let removedTotal = 0;

  for (const root of roots) {
    removedTotal += await cleanupOldFiles(root, maxAgeMs, now);
  }

  return removedTotal;
}

async function shouldRunCleanup(lastRunDate, now = Date.now()) {
  if (!lastRunDate) {
    return true;
  }

  return now - lastRunDate.getTime() >= DAY_IN_MS;
}

module.exports = {
  cleanupOldComprobantes,
  readLastRunTimestamp,
  writeLastRunTimestamp,
  shouldRunCleanup,
  CONSTANTS: {
    DAY_IN_MS,
    STATE_FILE_PATH,
    COMPROBANTES_ROOT,
    WHATSAPP_COMPROBANTES_ROOT,
  },
};



