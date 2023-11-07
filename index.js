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


// custom middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if(!token){
    return res.status(401).send({ message: 'Unauthorized access'})
  }
  if(token){
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
      if(error){
        return res.status(401).send({message : 'Unauthorized access'})
      }
      req.user = decode;
      next();
    })
  }
}

  // check the requested user is same or not!

  const checkSameUser = (req, res, next ) => {
    const requestedUserEmail = req.query.email;
    const tokenDecodedEmail = req.user.email;

    if(requestedUserEmail !== tokenDecodedEmail){
      return res.status(403).send({message : 'Forbidden bad request'})
    }else{
      next();
    }
  }



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
    const orderedCollection = client.db('savorSpot').collection('orderedFoods');
    const specialCollection = client.db('savorSpot').collection('specialMenus');



    // generate jwt toker for user
    app.post('/jwt', async (req, res) => {
      const userEmail = req.body;
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {expiresIn : '1h'})
     res.cookie( 'token', token, { httpOnly: true, secure: false})
     .send({success : true})
    })

    // clear client side cookie
    app.get('/logout', async (req, res) => {
      res.clearCookie('token', {maxAge: '0'})
      .send({success : true})
    })


    app.get('/special-menu', async (req, res) => {
      const result = await specialCollection.find().toArray();
      res.send(result)
    })

    app.get('/all-foods', async (req, res) => {
      const skip = parseInt(req.query.skip);
      const size = parseInt(req.query.size);

      const foodName = req.query.name;
      const query = {};

      if(foodName){
        query.foodName = { $regex : foodName, $options: 'i'}
      }
      const totalFood = await allFoodCollection.estimatedDocumentCount();

      const foods = await allFoodCollection.find(query).skip(skip).limit(size).toArray();
      res.send({totalFood, foods})
    })

    // get top 6 food depends on most ordered value

    app.get('/top-foods', async (req, res) => {

      const topFoods = await allFoodCollection.find().sort({ ordered: -1 }).limit(6).toArray();
      res.send(topFoods)
    })

    // get user based added food items
    app.get('/my-added-foods', verifyToken, checkSameUser,  async (req, res) => {
      const userEmail = req.query.email;
      const query = { addedUserEmail : userEmail};
      const foods = await allFoodCollection.find(query).toArray();
      res.send(foods);
    })

    // get a single food with food Id

    app.get('/single-food/:id', async (req, res) => {
      const foodId = req.params.id;
      const query = { _id : new ObjectId(foodId)};
      const singleFood = await allFoodCollection.findOne(query);
      res.send(singleFood)
    })

    app.get('/ordered-foods', verifyToken, checkSameUser, async (req, res)=> {
      const userEmail = req.query.email;
      const query = { orderedEmail : userEmail}
      const foods = await orderedCollection.find(query).toArray();
      res.send(foods)
    })
    
    // add single food api
    app.post('/add-food', async (req, res) => {
      const newFood = req.body;
      const result = await allFoodCollection.insertOne(newFood);
      res.send(result)
    })

    // insert ordered food in orderedCollection

    app.put('/order-food/:id', async (req, res) => {
      const id = req.params.id;
      const orderedFood = req.body;
      const query = { mainFoodId : id}
      const options = { upsert: true };
      const updatedDoc = {
        $set: {...orderedFood}
      }
      const result = await orderedCollection.updateOne(query, updatedDoc, options);
      res.send(result)
    })

    // update single food data
    app.put('/update-food/:id', async (req, res) => {
      const foodId = req.params.id;
      const updatedFood = req.body;
      const query = {_id : new ObjectId(foodId)}
      const updatedDoc = {
        $set: {...updatedFood}
      }
      const result = await allFoodCollection.updateOne(query, updatedDoc);
      res.send(result)
    })

    app.patch('/update-quantity/:id', async (req, res) => {
      const foodId = req.params;
      const newChanges = req.body;
      const query = { _id : new ObjectId(foodId)};
      const updatedFood = {
        $set : newChanges
      }
      const result = await allFoodCollection.updateOne(query, updatedFood);
      res.send(result)
    })

    // delete single food in cart 
    app.delete('/delete-food/:id', async (req, res) => {
      const foodId = req.params.id;
      const query = { _id : new ObjectId(foodId)};
      const result = await orderedCollection.deleteOne(query);
      res.send(result);
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