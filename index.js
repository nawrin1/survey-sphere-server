const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');

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
const userCollection = client.db("surverDb").collection("users");

app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({ token });
})
app.post('/users',async(req,res)=>{
  const user=req.body
  const query={email:user.email}
  const exist=await userCollection.findOne(query)
  if (exist){
    return res.send({ message: 'this user already exists', insertedId: null })

  }
  const result = await userCollection.insertOne(user);
  res.send(result);

})

app.get('/users',async (req, res) => {
  console.log(req.headers,">>--->")
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get('/allSurvey',async (req, res) => {
    
    const result = await allSurvey.find().sort({ votedNumber: -1 }).limit(6).toArray();
    res.send(result);
  });
app.get('/survey',async (req, res) => {
  let filter={}

    const search = req.query.search
    console.log(typeof(search))
    if (typeof(search)=='string'){
      console.log('string true')
      filter = {
      $or: [
    { title: { $regex: search, $options: 'i' } },
    { category: { $regex: search, $options: 'i' } },
    { votedNumber: { $eq: parseInt(search) } }]
     }}


    
//     else{
//       console.log('num true')
//      filter = {$or: [{ votedNumber: { $eq: parseInt(search) } }]
  
// }}




    
    const result = await allSurvey.find(filter).toArray();
    res.send(result);
  });

  app.get('/', async(req, res) => {
    res.send('survey is sitting')
})
  app.listen(port, () => {
    console.log(`survey is sitting on port ${port}`);
})