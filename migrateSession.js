import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

// Configuración
const SESSION_FOLDER = path.join(process.cwd(), 'session', 'session'); // Ajusta esta ruta si es distinta
const MAX_FILE_SIZE = 100 * 1024; // 100 KB máximo por archivo (puedes aumentar si quieres)
const IGNORE_FOLDERS = [
  'Service Worker',
  'CacheStorage',
  'IndexedDB',
  'Local Storage',
  'databases',
  'Cache'
];

// Mongoose esquema y modelo
const sessionSchema = new mongoose.Schema({
  _id: String,
  sessionData: Object
});
const SessionModel = mongoose.model('Session', sessionSchema);

async function readBinaryFiles(folder) {
  const result = {};
  const entries = await fs.readdir(folder, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_FOLDERS.includes(entry.name)) {
        console.log(`⚠️ Ignorando carpeta: ${entry.name}`);
        continue;
      }
      result[entry.name] = await readBinaryFiles(path.join(folder, entry.name));
    } else {
      const fullPath = path.join(folder, entry.name);
      const stats = await fs.stat(fullPath);

      if (stats.size > MAX_FILE_SIZE) {
        console.log(`⚠️ Ignorando archivo muy grande: ${entry.name} (${stats.size} bytes)`);
        continue;
      }

      const data = await fs.readFile(fullPath);
      result[entry.name] = data.toString('base64');
      console.log(`Archivo guardado: ${entry.name} (${stats.size} bytes)`);
    }
  }
  return result;
}

async function migrateSession() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Conectado a MongoDB');

    const sessionData = await readBinaryFiles(SESSION_FOLDER);

    if (Object.keys(sessionData).length === 0) {
      console.warn('⚠️ No se encontró data válida para guardar en sesión.');
      return;
    }

    await SessionModel.findByIdAndUpdate(
      'whatsapp-session',
      { sessionData },
      { upsert: true, new: true }
    );

    console.log('✅ Sesión migrada correctamente a MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error migrando sesión:', err);
    process.exit(1);
  }
}

migrateSession();
