const express = require('express');
const app = express();
const PORT = 4000;

app.get('/', (req, res) => {
  res.send('LisaStake Express backend running!');
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
