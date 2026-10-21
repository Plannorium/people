import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
    }
    console.warn("MONGODB_URI is not set. Database operations will fail unless connected.");
  }

  if (!cached!.promise && MONGODB_URI) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    if (cached!.promise) {
      cached!.conn = await cached!.promise;
    }
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn as typeof mongoose;
}
