import mongoose from 'mongoose';

const getUri = () => process.env.MONGO_URI || process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const MONGODB_URI = getUri();
  if (!MONGODB_URI) {
    throw new Error('Define MONGO_URI (or MONGODB_URI) in .env');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
