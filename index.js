const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xm5hqxk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({
            success: false,
            message: 'Unauthorized access'
        })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({
                success: false,
                message: 'Forbidden access'
            })
        }
        req.decoded = decoded;
        next()
    })
}


async function run() {
    try {
        const serviceCollection = client.db("bangoliTaste").collection('services');
        const reviewCollection = client.db("bangoliTaste").collection('reviews');

        //post service
        app.post('/services', async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result)
        })

        //get only three data of services
        app.get('/services', async (req, res) => {
            let query = {};
            const cursor = serviceCollection.find(query).sort({ _id: -1 });
            const result = await cursor.limit(3).toArray();
            res.send(result)
        })

        //get all the services
        app.get('/allServices', async (req, res) => {
            let query = {};
            const cursor = serviceCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        //get specific id base service details
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })

        //store user review
        app.post('/reviews', async (req, res) => {
            const service = req.body;
            const result = await reviewCollection.insertOne(service);
            res.send(result)
        })

        //get all review base on service
        app.get('/reviews', async (req, res) => {
            let query = {};
            if (req.query.serviceId) {
                query = { service: req.query.serviceId }
            }
            const cursor = reviewCollection.find(query)
            const result = await cursor.sort({ date: -1 }).toArray();
            res.send(result)
        })

        //get all review base on user
        app.get('/myReviews', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                res.status(403).send({
                    success: false,
                    message: 'forbidden access'
                })
            }

            let query = {};
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const cursor = reviewCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        //get all review base on review id
        app.get('/editReview/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await reviewCollection.findOne(query);
            res.send(result);
        })

        //delete review base on user
        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            let query = { _id: ObjectId(id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result)
        })


        //update review
        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const updateReview = req.body;
            const query = { _id: ObjectId(id) }

            const modifiedReview = {
                $set: {
                    date: updateReview.date,
                    rating: updateReview.rating,
                    message: updateReview.message
                }
            }
            const result = await reviewCollection.updateOne(query, modifiedReview);
            res.send(result)
        })
        
        //jwt token create
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
            res.send({ token })
        })
    }
    finally {
        //await client.close();
    }
}
run().catch(error => console.log(error.message))


app.get('/', (req, res) => {
    res.send('Bengali Taste Server is Running')
})

app.listen(port, () => {
    console.log(`Bengali Taste Server is Online on ${port}`);
})
