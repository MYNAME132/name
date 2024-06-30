const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { log } = require('console');

const app = express();
const port = 4000;

// Middleware
app.use(express.json());
app.use(cors());

// Middleware to catch JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON:', req.body);
        return res.status(400).send({ message: 'Bad JSON' });
    }
    next();
});

// MongoDB connection
mongoose.connect('mongodb+srv://tabatadzeilia:09032000ilia@cluster0.sfg3734.mongodb.net/ecommerce', 
{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
});

app.get('/', (req, res) => {
    res.send('Express app is running');
});

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

app.use('/images', express.static('upload/images'));

app.post('/upload', upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

const Product = mongoose.model('Product', {
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    new_price: {
        type: Number,
        required: true
    },
    old_price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true
    }
});

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });
    console.log(product);
    await product.save();
    res.json({
        success: true,
        name: req.body.name
    });
});

app.get('/newcollections',async(req,res)=>{
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("new collection fetched")
    res.send(newcollection);
})

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("removed");
    res.json({
        success: true,
        name: req.body.name
    });
});

app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log('all products fetched');
    res.send(products);
});

const User = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

app.post('/signup', async (req, res) => {
    let check = await User.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }

    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    });

    await user.save();
    const data = {
        user: {
            id: user.id
        }
    };

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });                                                 
    if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }
    
    if (password !== user.password) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }
    
    const data = {
        user: {
            id: user.id
        }
    };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
});


const fetchUser=async (req,res,next)=>{
    const token=req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"not valid token"})
    }
    else{
        try{
            const data=jwt.verify(token,'secret_ecom');
            req.user=data.user;
            next();
        }catch(error){
            res.status(401).send({errors:'not valid token'})
        }
    }
}

app.post('/addtocart', fetchUser, async (req, res) => {
    console.log(req.body);


    let userData = await User.findOne({ _id: req.user.id });

    userData.cartData[req.body.itemid] += 1;
    await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.json({ message: 'added' });
});

app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log(req.body);

    let userData = await User.findOne({ _id: req.user.id });

    if(userData.cartData[req.body.itemid]>0)
    userData.cartData[req.body.itemid] -= 1;
    await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.json({ message: 'removed' });
});

app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("getcart");
    let userData=await User.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port, (error) => {
    if (!error) {
        console.log('Server running on port ' + port);
    } else {
        console.log('Error:', error);
    }
});