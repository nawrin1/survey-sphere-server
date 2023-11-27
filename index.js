const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const voteCollection = client.db("surverDb").collection("vote");
const commentCollection = client.db("surverDb").collection("comment");
const reportCollection = client.db("surverDb").collection("report");
const unpublishCollection = client.db("surverDb").collection("unpublish");

app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
  res.send({ token });
})

const verifyToken = (req, res, next) => {
  console.log('inside verify', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  console.log(email,"is it admin? verify admin")
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    console.log('.......')
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}
const verifySurveyor = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isSurveyor = user?.role === 'surveyor';
  if (!isSurveyor) {
    console.log('.......')
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}

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

app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  console.log(req.headers, "backnd hitted");
  let filter = {};

  const search = req.query.search;
  console.log(search,"user rone from back");

  if (search) {
  
    filter = {
      role: { $regex: search, $options: 'i' }
    };
  }

  const result = await userCollection.find(filter).toArray();
  res.send(result);
});

app.get('/users/surveyor/:email', verifyToken,async (req, res) => {
  const email = req.params.email;
  console.log(email,"servey from backend")

  if (email !== req.decoded.email) {
    console.log('not survey')
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let surveyor= false;
  if (user) {
    surveyor= user?.role === 'surveyor';
  }
  res.send({ surveyor });
})

app.get('/users/admin/:email', verifyToken,async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    console.log('nottt veridyyy')
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
    console.log('admin found')
  }
  res.send({ admin });
})
app.get('/users/userRole/:email', verifyToken,async (req, res) => {
  const email = req.params.email;
  console.log(email,"user from backend")

  if (email !== req.decoded.email) {
    console.log('not user')
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let proUser= false;
  if (user) {
    proUser= user?.role === 'pro-user';
  }
  res.send({proUser});
})

app.get('/allSurvey',async (req, res) => {
    
    const result = await allSurvey.find().sort({ votedNumber: -1 }).limit(6).toArray();
    res.send(result);
  });

app.get('/survey',async (req, res) => {
  let filter={}

    const search = req.query.search
    console.log(search,"bcz of surer status")
    console.log(typeof(search))
    if(search){
      console.log('ehy uou')
      if (typeof(search)=='string'){
        
        filter = {
        $or: [
      { title: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { votedNumber: { $eq: parseInt(search) } }]
       }}
  
   
      const result = await allSurvey.find(filter).toArray();
      res.send(result);

    }
    else{
      console.log('admin survey stat')
      const result = await allSurvey.find().toArray();
      res.send(result);


    }
    
    

    
    
   
  });

  app.patch('/users/admin/:id',verifyToken, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
  app.patch('/users/surveyor/:id',verifyToken,async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'surveyor'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

app.get('/surveys',async (req, res) => {
  let query={}

    const surveyor = req.query.surveyor
    console.log(surveyor,"surveyor from backend")
   
    if(surveyor){
      query={surveyor:surveyor}
    }
    

 
    const result = await allSurvey.find(query).toArray();
    res.send(result);
  });
app.get('/vote',async (req, res) => {
  

    

 
    const result = await voteCollection.find().toArray();
    res.send(result);
  });
app.get('/comment',async (req, res) => {
  let query={}
  comment=req.query.title
console.log(comment,"from bacjend")  
if (comment){
  query={title:comment}
}

    

 
    const result = await commentCollection.find(query).toArray();
    res.send(result);
  });
app.get('/comment/:email',async (req, res) => {
 

    const email=req.params.email
    console.log(email,"from backemd comment email")
    const query={surveyor:email}
    

 
    const result = await commentCollection.find(query).toArray();
    res.send(result);
  });
  app.post('/survey',verifyToken,verifySurveyor,async(req, res) => {
    const timestamp = new Date()
    console.log(format(timestamp, 'yyyy-MM-dd'));
    const timevalue=format(timestamp, 'yyyy-MM-dd')
    const data= req.body;
    const newitem={ title: data.title, category: data.category,description:data.description,ques1:data.ques1,ques2:data.ques2,ques3:data.ques3,votedNumber:data.votedNumber,liked:data.liked,disliked:data.disliked,status:data.status,deadline:data.deadline,surveyor:data.surveyor, time:timevalue}
    console.log(newitem)
    // const newItem={item,time:timevalue}
    // console.log(item,'surveyyy')
    const result = await allSurvey.insertOne(newitem);
    res.send(result);
  });
  app.post('/vote',verifyToken,async(req, res) => {
   
    const data= req.body;
    console.log(data,"vote from backend")
  
    const result = await voteCollection.insertOne(data);
    res.send(result);
  });
  app.post('/unpublish',verifyToken,async(req, res) => {
   
    const data= req.body;
    
  
    const result = await unpublishCollection.insertOne(data);
    res.send(result);
  });
  app.post('/comment',verifyToken,async(req, res) => {
   
    const data= req.body;
    console.log(data,"comment from backend")
  
    const result = await commentCollection.insertOne(data);
    res.send(result);
  });
  app.post('/report',verifyToken,async(req, res) => {
   
    const data= req.body;
    console.log(data,"report from backend")
  
    const result = await reportCollection.insertOne(data);
    res.send(result);
  });
  app.patch('/surveys/:id', async (req, res) => {
    const item = req.body;
    const id = req.params.id;
    console.log('inside update')
    const filter = { _id: new ObjectId(id) }
    const updatedDoc = {
      $set: {
        title: item.title,
        category: item.category,
        description: item.description,
       ques1: item.ques1,
       ques2: item.ques2,
       ques3: item.ques3,
       deadline:item.deadline
        
      }
    }
    console.log(updatedDoc)

    const result = await allSurvey.updateOne(filter, updatedDoc)
    console.log(result)
    res.send(result);
  })
  app.get('/surveys/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await allSurvey.findOne(query);
    res.send(result);
  })
  app.get('/survey/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await allSurvey.findOne(query);
    res.send(result);
  })
  app.patch('/survey/:id', async (req, res) => {
    const id = req.params.id;
    const statusUpdate=req.body
    // console.log(status,"latst")
    const query = { _id: new ObjectId(id) }
    const updatedDoc = {
      $set: {
        status:statusUpdate.status
       
        
      }
    }
    console.log(updatedDoc)

    const result = await allSurvey.updateOne(query, updatedDoc)
   
    res.send(result);
  })


  app.get('/', async(req, res) => {
    res.send('survey is sitting')
})
  app.listen(port, () => {
    console.log(`survey is sitting on port ${port}`);
})