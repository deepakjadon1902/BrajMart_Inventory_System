import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

async function bootstrap() {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 [Server] BrajMart Inventory API listening on http://localhost:${env.PORT}`);
      console.log(`📌 [Server] Health Check available at http://localhost:${env.PORT}/api/health`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 [Server] Received ${signal}. Commencing graceful shutdown...`);
      server.close(async () => {
        await disconnectDB();
        console.log('✅ [Server] Clean shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ [Server] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
