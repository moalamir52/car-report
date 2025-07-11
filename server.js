const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uri = "mongodb+srv://moalamir52:Moh%40med%212020@moalamir.vxoug6o.mongodb.net/?retryWrites=true&w=majority&appName=moalamir";
const client = new MongoClient(uri);
const dbName = 'contracts';

app.post('/save', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('reports');
    const { data } = req.body;
    await collection.deleteMany({});
    await collection.insertMany(data);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/load', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('reports');
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => console.log('✅ API running on http://localhost:4000'));
