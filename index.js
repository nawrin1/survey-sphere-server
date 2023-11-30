const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
const dbConnect = async () => {
  try {
      client.connect()
      console.log('DB Connected Successfully')
  } catch (error) {
      console.log(error.name, error.message)
  }
}
dbConnect()
const allSurvey=client.db("surverDb").collection("allSurvey")
const userCollection = client.db("surverDb").collection("users");
const voteCollection = client.db("surverDb").collection("vote");
const commentCollection = client.db("surverDb").collection("comment");
const reportCollection = client.db("surverDb").collection("report");
const unpublishCollection = client.db("surverDb").collection("unpublish");
const paymentCollection = client.db("surverDb").collection("payment");
app.get('/', async(req, res) => {
  res.send('survey is sitting')
})

app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
  res.send({ token });
})

const verifyToken = (req, res, next) => {
  console.log('inside verify', req.headers.authorization);
  if (!req.headers.authorization) {
    console.log('token shomossha?')

    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log('token shomossha')
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

app.get('/users', async (req, res) => {
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
app.get('/users/role/:email', verifyToken,async (req, res) => {
  const email = req.params.email;
  console.log(email,"regular user from backend")

  if (email !== req.decoded.email) {
    console.log('not auth user')
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let regularUser= false;
  if (user) {
    regularUser= user?.role === 'user';
  }
  res.send({regularUser});
})

// app.get('/allSurvey',async (req, res) => {
    
//     const result = await allSurvey.find().sort({ votedNumber: -1 }).limit(6).toArray();
//     res.send(result);
//   });
app.get('/allSurvey', async (req, res) => {
    const result = await allSurvey.find({ status: 'publish' }).sort({ votedNumber: -1 }).limit(6).toArray();
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

  app.patch('/users/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
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
  app.patch('/users/surveyor/:id',verifyToken,verifyAdmin,async (req, res) => {
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
app.get('/vote',verifyToken,async (req, res) => {
  

    

 
    const result = await voteCollection.find().toArray();
    res.send(result);
  });
app.get('/comment',verifyToken,async (req, res) => {
  let query={}
  comment=req.query.title
console.log(comment,"from bacjend")  
if (comment){
  query={title:comment}
}

    

 
    const result = await commentCollection.find(query).toArray();
    res.send(result);
  });
app.get('/comment/:email',verifyToken,async (req, res) => {
 

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
    
    const result = await allSurvey.insertOne(newitem);
    res.send(result);
  });
  app.post('/vote',verifyToken,async(req, res) => {
   
    const data= req.body;
    console.log(data,"vote from backend")
  
    const result = await voteCollection.insertOne(data);
    const surveyId = data.surveyId;
    const likeOrDislike = data.likeordislike;
    
    const filter = { _id: new ObjectId(surveyId) };
    
    let update;
    if (likeOrDislike === 'LIKE') {
      update = { $inc: { liked: 1, votedNumber: 1 } };
    } else if (likeOrDislike === 'DISLIKE') {
      update = { $inc: { disliked: 1, votedNumber: 1 } };
    } 
    
    const updateResult = await allSurvey.updateOne(filter, update);
    

    res.send(result);
  });
  app.post('/unpublish',verifyToken,verifyAdmin,async(req, res) => {
   
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
  app.patch('/surveys/:id',verifyToken,verifySurveyor, async (req, res) => {
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
    console.log(result,"what")
    res.send(result);
  })
  app.get('/unpublish',verifyToken, async (req, res) => {
    let filter={}
    const surveyor=req.query.email
    if(surveyor){
      filter={surveyor:surveyor}
    }
    
    const result = await unpublishCollection.find(filter).toArray();
    res.send(result);
  })
  app.patch('/survey/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const statusUpdate=req.body
   
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
  app.delete('/survey/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter={surveyId:id}
    console.log(filter,"from del")
    const result = await unpublishCollection.deleteOne(filter)
   
    res.send(result);



  })
  app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    console.log(amount, 'amount inside the intent')

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    });

    res.send({
      clientSecret: paymentIntent.client_secret
    })
  });
  app.post('/payment', async (req, res) => {
    const payment = req.body;
    const result = await paymentCollection.insertOne(payment);

    console.log('payment info from backend', payment);
    



    res.send(result);
  })
  app.patch('/updatePayment/:email',verifyToken,async (req, res) => {
    const email= req.params.email;
    const filter = {email:email};
    const updatedDoc = {
      $set: {
        role: 'pro-user'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
  app.get('/payment',verifyToken,verifyAdmin,async (req, res) => {
    
    const result = await paymentCollection.find().toArray();
    res.send(result);
  });







app.get('/getSurveyData/:surveyId', async (req, res) => {
  try {
    const surveyId = req.params.surveyId;
    const filter={ _id: new ObjectId(surveyId) }
    console.log(filter,">>>>>>>>>")
    const survey = await voteCollection.find(filter).toArray()

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    console.log(survey,"serrr")
    let yes=0
    let no=0
    survey[0].ans1=='YES'?yes=yes+1:no=no+1
    survey[0].ans2=='YES'?yes=yes+1:no=no+1
    survey[0].ans3=='YES'?yes=yes+1:no=no+1

    
    console.log(yes,no,"count from bacj")

    res.send({
     yes,no
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getSurveyChartData/:surveyId', async (req, res) => {
  try {
    const surveyId = req.params.surveyId;
    const filter = { title: surveyId };
    console.log(filter, ">>>>>>>>>");
    const survey = await voteCollection.find(filter).toArray();

    if (!survey || survey.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    console.log(survey, "serrr chartttt details");

    let yes = 0;
    let no = 0;

   
    survey.forEach(item => {
     
      item.ans1 === 'YES' ? (yes += 1) : (no += 1);

      
      item.ans2 === 'YES' ? (yes += 1) : (no += 1);

    
      item.ans3 === 'YES' ? (yes += 1) : (no += 1);
    });

    console.log(yes, no, "count from backend");

    res.send({
      yes,
      no,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



 



  app.listen(port, () => {
    console.log(`survey is sitting on port ${port}`);
})