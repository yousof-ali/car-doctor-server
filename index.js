const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;


app.use(cors({
  origin:['http://localhost:5174','http://localhost:5173'],
  credentials:true
}))
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lewcb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// middlewares

const verifyToken = async(req,res,next) => {
  const token = req.cookies?.token

  if(!token){
    return res.status(401).send({message:'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
    if(err){
      return res.status(401).send({message:'unauthorized'})
    }
    req.user = decoded
    next();
  })
  
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("service");

    const bookingCollections = client.db("carDoctor").collection("order");

    // auth related api 
    app.post('/jwt',async(req,res) => {
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false,
      })
      .send({success:true});
    })
   

    app.get('/services',async(req,res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id',async(req,res) => {
        const id = req.params.id
        const query = {_id : new ObjectId(id)}
        const filter = await serviceCollection.findOne(query);
        res.send(filter)
    })

    // booking
    app.post('/bookings',async(req,res) => {
      const booking = req.body
      const result =  await bookingCollections.insertOne(booking)
      res.send(result);
    })

    app.delete('/delete/:id',async(req,res) => {
      const query = {_id : new ObjectId(req.params.id)}
      const result = await bookingCollections.deleteOne(query);
      res.send(result);
    })

    app.patch('/update/:id',async(req,res) => {
      const id = req.params.id
      const query = {_id:new ObjectId(id)}
      const updatedContent = req.body
      const newData = {
        $set:{
          status:updatedContent.status
        }
      }
      const result = await bookingCollections.updateOne(query,newData)
      res.send(result);
    })

    app.get('/bookings',verifyToken,async(req,res) => {
      // console.log('token line 104', req.cookies.token)
      console.log('from valid token ',req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message:'forbidden'})
      }
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email};
      }
      const booking = await bookingCollections.find(query).toArray();
      res.send(booking);
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res) => {
    res.send("car doctor server running")
})

app.listen( port, () => {
    console.log(`car doctor is running on port ${port}`);
})