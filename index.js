// Import packages
const dotenv = require('dotenv');
const ngrok = require('ngrok');

// Import express app
const api = require("./src/api");

const port = '8888';

// Dotenv init
dotenv.config();


// Start listening on provided port
api.listen(port, () =>
  console.log(`===== Server running on port ${port} =====`)
);

