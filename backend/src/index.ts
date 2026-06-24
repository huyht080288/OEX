import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`OEX API listening on http://localhost:${port}/api/v1`);
  if (process.env.SWAGGER_ENABLED !== 'false') {
    console.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }
});
