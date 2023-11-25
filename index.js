const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vqv383i.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);
const Dbconnect = async()=>{
    try{
        await client.connect()
        console.log('database connected ')

    }
    catch(error){
        console.log(error.mesage)
    }
}
Dbconnect();
const allSurvey=client.db("surverDb").collection("allSurvey")


app.get('/', async(req, res) => {
    res.send('survey is sitting')
})
app.get('/allSurvey',async (req, res) => {
    
    const result = await allSurvey.find().sort({ votedNumber: -1 }).limit(6).toArray();
    res.send(result);
  });
app.get('/survey',async (req, res) => {

    const search = req.query

const filter = {
  $or: [
    { title: { $regex: search.search, $options: 'i' } },
    { category: { $regex: search.search, $options: 'i' } },
    { votedNumber: { $eq: parseInt(search.search) } }
  ]
};
    
    const result = await allSurvey.find(filter).toArray();
    res.send(result);
  });

  
  app.listen(port, () => {
    console.log(`survey is sitting on port ${port}`);
})