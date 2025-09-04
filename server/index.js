const express = require('express');
const app = express();
const cors = require('cors');
const dextoolsRoute = require('./routes/dextools');
const PORT = 4000;

app.use(cors()); // Allow CORS for your frontend
app.use('/api', dextoolsRoute);

app.get('/', (req, res) => {
  res.send('LisaStake Express backend running!');
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});