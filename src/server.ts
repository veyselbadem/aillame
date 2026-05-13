import app from './app';
import { APP_CONFIG } from './config/app.config';

const startServer = () => {
  const port = APP_CONFIG.PORT;
  
  app.listen(port, () => {
    console.log(`[Aillame API] Server is running at http://127.0.0.1:${port}`);
    console.log(`[Aillame API] Health check: http://127.0.0.1:${port}/api/aillame/health`);
  });
};

startServer();
