import "dotenv/config";
import app from "./app";
import { logger } from "./utils/logger";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

app.listen(PORT, () => {
  logger.info(`🚀 Recovery Wallet API running on port ${PORT}`);
  logger.info(`   Environment : ${process.env.NODE_ENV ?? "development"}`);
  logger.info(`   Network     : ${process.env.STELLAR_NETWORK ?? "testnet"}`);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});
