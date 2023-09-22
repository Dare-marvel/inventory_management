const express = require('express');
const router = express.Router();
const User = require('../models/User')
const Vendor = require('../models/Vendor')
const ContactForm = require('../models/Contact')
const Order = require('../models/Order')
const bcrypt = require('bcryptjs')
const vendorAuthenticate = require('../middleware/vendorAuthenticate')
const authenticateContact = require('../middleware/authenticateContact')
const cookieParser = require('cookie-parser');
const Company = require('../models/Company');
router.use(cookieParser());


router.post('/vendorregister', async (req, res) => {
    const {name, email, phone, password, cPassword} = req.body;

    if(!name || !email || !phone || !password || !cPassword){
        res.status(422).json({msg: "All fields need to be filled"});
    }
    
    try {
        const vendorExist = await Vendor.findOne({email: email});
        if(vendorExist){
            res.status(409).json({msg: "Email already registered"});
        }
        else if(password!=cPassword){
            res.status(422).json({msg: "Passwords do not match"});
        }
        const ven = new Vendor({name, email, phone, password, confirmPassword});
        await ven.save();
        res.status(200).json({msg: "User registered successfully"});
    } catch (error) {
        res.status(500).json({msg: "Some unexpected error occured"});
    }
})

router.post('/signin', async (req, res) => {
    const {email, password} = req.body;
    if(!email || !password){
        res.status(400).json({msg: "Please fill all required fields"})
    }
    try {
        const emailExist = await User.findOne({email: email});
        if(emailExist){
            const isMatch = await bcrypt.compare(password, emailExist.password);
            if(isMatch){
                token = await emailExist.generateAuthToken();
                res.cookie('libcoo', token, {
                    expires: new Date(Date.now() + 604800),
                    httpOnly: true
                })
                res.status(200).json({msg: "User login successful"})
            }
            else{
                res.status(400).json({msg: "User login failed"})
            }
        }
        else{
            res.status(400).json({msg: "Invalid credentials"})
        }
    } catch (error) {
        res.status(500).json({msg: "Some unexpected error occured"});
    }
})

router.post('/addproducts', async (req, res) => {
    const { email, name, desc, quantity, category, pid, manufacturer } = req.body;
    console.log("Request Body: ", req.body);

    try {
        const vendor = await Vendor.findOne({ email: email });
        if (!vendor) {
            return res.status(400).json({ error: "Vendor not found" });
        }
        const newProduct = {
            name: name,
            desc: desc,
            quantity: quantity,
            category: category,
            pid: pid,
            manufacturer:manufacturer
        };
        vendor.products.push(newProduct); // Use push to add a newProduct to the products array
        await vendor.save(); // Save the updated vendor document

        res.status(201).json({ message: "Product added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});


// addstock
router.post('/addstock1', async (req, res) => {
    const { email, quantity, pid } = req.body;
    console.log("Request Body: ", req.body);

    try {
        const vendor = await Vendor.findOne({ email: email });
        if (!vendor) {
            return res.status(400).json({ error: "Vendor not found" });
        }
        const product = vendor.products.find((product) => product.pid === pid);
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        // Ensure the quantity is valid and subtract it from the product
        product.quantity += quantity;
        // vendor.find(product).quantity += quantity;
        // await vendor.save(); // Save the updated vendor document
        await Vendor.replaceOne({ email: email }, vendor);

        res.status(200).json({ message: "Stock added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});

router.post('/addstock2', async (req, res) => {
    const { email, quantity, pid } = req.body;
    console.log("Request Body: ", req.body);

    try {
        const vendor = await Vendor.findOne({ email: email });
        if (!vendor) {
            return res.status(400).json({ error: "Vendor not found" });
        }
        const product = vendor.products.find((product) => product.pid === pid);
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        // Ensure the quantity is valid and add it to the product
        product.quantity += quantity;

        await vendor.save(); // Save the updated vendor document

        res.status(200).json({ message: "Stock added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});



// substock
router.post('/subtractstock', async (req, res) => {
    const { email, quantity, pid } = req.body;
    console.log("Request Body: ", req.body);

    try {
        const vendor = await Vendor.findOne({ email: email });
        if (!vendor) {
            return res.status(400).json({ error: "Vendor not found" });
        }
        
        // Find the product with the matching pid
        const product = vendor.products.find((product) => product.pid === pid);
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        // Ensure the quantity is valid and subtract it from the product
        if (product.quantity >= quantity) {
            product.quantity -= quantity;
        } else {
            return res.status(400).json({ error: "Insufficient stock quantity" });
        }

        await vendor.save(); // Save the updated vendor document

        res.status(200).json({ message: "Stock subtracted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});



router.post('/substock', async (req, res) => {
    const { email, name, desc, quantity, category, pid } = req.body;
    console.log("Request Body: ", req.body);

    try {
        const vendor = await Vendor.findOne({ email: email });
        if (!vendor) {
            return res.status(400).json({ error: "Vendor not found" });
        }
        const newProduct = {
            name: name,
            desc: desc,
            quantity: quantity,
            category: category,
            pid: pid
        };
        vendor.products.push(newProduct); // Use push to add a newProduct to the products array
        await vendor.save(); // Save the updated vendor document

        res.status(201).json({ message: "Product added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});


// getallproductsofvendor
router.post('/getallproducts', async (req, res) => {
    const email = req.body.email;
    console.log("Request Body: ", req.body);
    try{
        const vendor = Vendor.find({email: email});
        if(!vendor){
            return res.status(400).json({error: "Vendor not found"});
        }
        const products = vendor.products;
        if(!products){
            return res.status(400).json({error: "No products found"});
        }
        res.status(200).json(products);
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
    
});


// getallproductsofcompany
router.post('/getallproducts', async (req, res) => {
    const email = req.body.email;
    console.log("Request Body: ", req.body);
    try{
        const Company = Conpany.find({email: email});
        if(!Company){
            return res.status(400).json({error: "Vendor not found"});
        }
        const products = Company.products;
        if(!products){
            return res.status(400).json({error: "No products found"});
        }
        res.status(200).json(products);
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
    
});


router.get('/allcompanies', async (req, res) => {
  try {
    // Use the Company model to find all companies in the database
    const companies = await Company.find();

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: 'No companies found' });
    }

    // Send the list of companies as a JSON response
    res.status(200).json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// order_request
// router.post('/request', async (req, res) => {
//     console.log("Request Body: ", req.body);
//     const products = req.body.product;
//     const c_email = req.body.c_email;
//     const v_email = req.body.v_email;
//     try {

//         const 

       
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal server error" }); // Handle errors properly
//     }
// })

module.exports = router;