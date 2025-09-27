const app = require('../server');

let server;

const startTestServer = (port = 5003) => {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      resolve(server);
    });
  });
};

const stopTestServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Test server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = { startTestServer, stopTestServer, app };
