const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;

// middle wares
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId, ConnectionCheckOutFailedEvent } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4zx1pf4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();


    const destinationCollection = client.db("travelJournal").collection("destination")
    const quoteCollection = client.db("travelJournal").collection("quote");

    const cartCollection = client.db("travelJournal").collection("carts");

    const usersCollection = client.db("travelJournal").collection("users");

    const popularDestinationCollection = client.db("travelJournal").collection("popularDestination");

    const vanueCollection = client.db("travelJournal").collection("vanue");

    const vanueBookedCollection = client.db("travelJournal").collection("vanueBooked");

    const articleCollection = client.db("travelJournal").collection("article");

    const guideCollection = client.db("travelJournal").collection("guide");


    // JWT Token
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })


    // verifyAdmin start
    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }


    // destination data load
    app.get("/destination", async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.send(result);
    })


    // destination post
    app.post('/destination', verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await destinationCollection.insertOne(newItem);
      res.send(result)
    })

    // delete
    app.delete('/destination/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await destinationCollection.deleteOne(query);
      res.send(result);
    })


    // single data load from destination dairy
    app.get('/destination/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {
          name: 1,
          image1: 1,
          description: 1,
          cost: 1,
          residenceName: 1,
          image2: 1,
          residenceDetail: 1,
          foodName: 1,
          foodDetail: 1,
          image3: 1,
          seat: 1,
          date: 1,
          category: 1,

        }
      }

      const result = await destinationCollection.findOne(query, options);
      res.send(result);
    });


    //  quote data load
    app.get("/quote", async (req, res) => {
      const result = await quoteCollection.find().toArray();
      res.send(result);
    })


    // add cart
    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);

      const result = await cartCollection.insertOne(item);

      res.send(result);
    })

    // get cart
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    // delete cart
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })


    // users related api post
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })


    // users related api get
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })



    // for admin panel
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);

      res.send(result);
    })


    // for admin get
    // get
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);

    })


    // delete admin
    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    // get popular destination
    app.get("/popularDestination", async (req, res) => {
      const result = await popularDestinationCollection.find().toArray();
      res.send(result);
    })


    // single data load from popular destination
    app.get('/popularDestination/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {

          name: 1,
          price: 1,
          exploring: 1,
          adventure: 1,
          food: 1,
          seeAndDo: 1,
          around: 1,
          img1: 1,
          img2: 1,
          img3: 1,
          stay: 1

        }
      }

      const result = await popularDestinationCollection.findOne(query, options);
      res.send(result);
    });


    // get vanue
    app.get("/vanue", async (req, res) => {
      const result = await vanueCollection.find().toArray();
      res.send(result);
    })


    // single data load from popular destination
    app.get('/vanue/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {

          price: 1,
          name: 1,
          place: 1,
          day1: 1,
          day2: 1,
          day3: 1,
          day4: 1,
          img1: 1,
          img2: 1,
          img3: 1

        }
      }

      const result = await vanueCollection.findOne(query, options);
      res.send(result);
    });


    // post booking vanue
    app.post('/bookedVanue', async (req, res) => {
      const newItem = req.body;
      const result = await vanueBookedCollection.insertOne(newItem);
      res.send(result);
    })


    // get booking vanue
    app.get("/bookedVanue", async (req, res) => {
      const result = await vanueBookedCollection.find().toArray();
      res.send(result);
    })


    // get article   
    app.get('/article', async(req, res)=>{
      const result = await articleCollection.find().toArray();
      res.send(result);
    })


    // single data load from article
    app.get('/article/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {

          date: 1,
          headLine: 1,
          img: 1,
          detail: 1

        }
      }

      const result = await articleCollection.findOne(query, options);
      res.send(result);
    });


    // get guide  
    app.get('/guide', async(req, res)=>{
      const result = await guideCollection.find().toArray();
      res.send(result);
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



app.get('/', (req, res) => {
  res.send('Nabilar Tour')
})

app.listen(port, () => {
  console.log(`Nabilar tour is comming soon ${port}`)
})