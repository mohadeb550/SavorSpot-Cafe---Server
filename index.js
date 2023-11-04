const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');


// use middleWare 

app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())



// mongoDB connection 
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.vn1kdxv.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {

  try {
    // await client.connect();

    const allFoodCollection = client.db('savorSpot').collection('foods');
    const orderedFoodsCollection = client.db('savorSpot').collection('orderedFoods');

    
    // add single food api
    app.post('/add-food', async (req, res) => {
      const newFood = req.body;
      const result = await allFoodCollection.insertOne(newFood);
      res.send(result)
    })



    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('savorSpot Cafe Server is running now');
})

app.listen(port, ()=>{
    console.log('server running on port', port)   
})