import { app } from './app';
import { connectDB } from './config/db';
import { config } from './config/env';

async function main() {
  await connectDB();
  app.listen(Number(config.PORT), () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

main();
