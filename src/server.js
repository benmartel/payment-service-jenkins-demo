const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, () => {
  console.log(`payment-service listening on port ${server.address().port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
