const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs')
const companyAuthenticate = require('../middleware/companyAuthenticate')
const cookieParser = require('cookie-parser');
router.use(cookieParser());
const Company = require('../models/Company')
const Vendor = require('../models/Vendor')
const Dashboard = require('../models/Dashboard')
const Order = require('../models/Order')

router.post('/companyregister', async (req, res) => {
    const { name, email, phone, password, cpassword } = req.body;

    if (!name || !email || !phone || !password || !cpassword) {
        res.status(422).json({ msg: "All fields need to be filled" });
    }

    try {
        const companyExist = await Company.findOne({ email: email });
        if (companyExist) {
            res.status(409).json({ msg: "Email already registered" });
        }
        else if (password != cpassword) {
            res.status(422).json({ msg: "Passwords do not match" });
        }
        const comp = new Company({ name, email, phone, password, cpassword });
        await comp.save();
        res.status(200).json({ msg: "Company registered successfully" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Some unexpected error occured" });
    }
})

router.post('/companysignin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ msg: "Please fill all required fields" })
    }
    try {
        const emailExist = await Company.findOne({ email: email });
        if (emailExist) {
            const isMatch = await bcrypt.compare(password, emailExist.password);
            if (isMatch) {
                token = await emailExist.generateAuthToken();
                res.cookie('inv_man', {token, role:"company", email:email}, {
                    expires: new Date(Date.now() + 604800),
                    httpOnly: true
                })
                res.status(200).json({ msg: "Login successful" })
            }
            else {
                res.status(400).json({ msg: "Login failed" })
            }
        }
        else {
            res.status(400).json({ msg: "Invalid credentials" })
        }
    } catch (error) {
        res.status(500).json({ msg: "Some unexpected error occured" });
    }
})

// router.post('/addproducts', vendorAuthenticate, async (req, res) => {
router.post('/addproducts_c', async (req, res) => {
    const { name, desc, quantity, category, pid, threshold, s_price, c_price } = req.body;
    const email=req.cookies.inv_man.email
    
    try {
        const company = await Company.findOne({ email: email });

        if (!company) {
            return res.status(400).json({ error: "Company not found" });
        }
        const newProduct = {
            name: name,
            desc: desc,
            quantity: quantity,
            category: category,
            pid: pid,
            threshold: threshold,
            s_price:s_price,
            c_price:c_price
        };
        company.products.push(newProduct); // Use push to add a newProduct to the products array
        await company.save(); // Save the updated vendor document

        res.status(201).json({ message: "Product added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});


// addstock
// router.post('/addstock', vendorAuthenticate, async (req, res) => {
router.post('/addstock_c', async (req, res) => {
    const { email, quantity, pid } = req.body;
    // console.log("Request Body: ", req.body);

    if(isNaN(quantity)){
        res.status(422).json({ msg: "Invalid request made" });
    }

    try {
        const company = await Company.findOne({ email: email });
        if (!company) {
            return res.status(400).json({ error: "Company not found" });
        }
        const product = company.products.find((product) => product.pid === pid);
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        // Ensure the quantity is valid and subtract it from the product
        product.quantity += quantity;
        // vendor.find(product).quantity += quantity;
        // await vendor.save(); // Save the updated vendor document
        await Company.replaceOne({ email: email }, company);

        return res.status(200).json({ message: "Stock added successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});

// substock
// router.post('/subtractstock', vendorAuthenticate, async (req, res) => {
router.post('/subtractstock_c', async (req, res) => {
    const { email, quantity, pid } = req.body;
    // console.log("Request Body: ", req.body);

    if(isNaN(quantity)){
        res.status(422).json({ msg: "Invalid request made" });
    }

    try {
        const company = await Company.findOne({ email: email });
        if (!company) {
            return res.status(400).json({ error: "Company not found" });
        }

        // Find the product with the matching pid
        const product = company.products.find((product) => product.pid === pid);
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        // Ensure the quantity is valid and subtract it from the product
        if (product.quantity >= quantity) {
            product.quantity -= quantity;
            product.sales += (quantity * product.s_price)
            // month 
            // vendor _ dashboard  -> month + quantity * product.s_price
            const date = new Date();
            const month = date.getMonth().toString();;
            const year = date.getFullYear().toString();

            // Find or create a dashboard document based on the email
            let dashboard = await Dashboard.findOne({ email: email });
            if (!dashboard){
                dashboard = new Dashboard({
                    email: email,
                    data: [{
                        month: month,
                        year: year,
                        monthly_data: {
                            // revenue: 0,
                            profit: (quantity * product.s_price)  - (quantity * product.c_price),
                            sales: quantity * product.s_price,
                        },
                    }],
                });

            }
            else{
                const monthData = dashboard.data.find((data) => data.month === month && data.year === year);

                if (monthData) {
                    // If a record for the current month exists, update its sales
                    monthData.monthly_data.sales += quantity * product.s_price;
                    monthData.monthly_data.profit += (quantity * product.s_price)-(quantity * product.c_price);
                } else {
                    // If a record for the current month doesn't exist, create a new one
                    dashboard.data.push({
                        month: month,
                        year: year,
                        monthly_data: {
                            profit: (quantity * product.s_price)-(quantity * product.c_price),
                            sales: quantity * product.s_price,
                        },
                    });
                }
            }
            await dashboard.save();

        } else {
            return res.status(400).json({ error: "Insufficient stock quantity" });
        }
       
        await Company.replaceOne({ email: email }, company);
        // await vendor.save()
        return res.status(200).json({ message: "Stock subtracted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});

router.post('/getallproducts_c', async (req, res) => {
    const email = req.body.email;
    // console.log("Request Body: ", req.body);
    try {
        const Company = await Company.find({ email: email });
        if (!Company) {
            return res.status(400).json({ error: "Company not found" });
        }
        const products = Company.products;
        if (!products) {
            return res.status(400).json({ error: "No products found" });
        }
        res.status(200).json(products);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" }); // Handle errors properly
    }
});

//orders by vendors
router.get('/orders_c',  async (req, res) => {
    const email = req.cookies.inv_man.email;
    try{
        const orders = await Order.find({c_email: email});
        if(!orders){
            return res.status(400).json({error: "No orders found"});
        }
        res.status(200).json(orders);   
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/orderacceptance', async (req, res) => {
    const { status, id, c_email, v_email } = req.body;
    const {pid, quantity} = req.body.products    

    if(status==="Accepted"){
        try{
            const company = await Company.find ({email: c_email});
            if(!company){
                return res.status(400).json({error: "Company not found"});
            }
            const product = company.products.find((product) => product.pid === pid)
            if(!product){
                return res.status(400).json({error: "Product not found"})
            }
            if(product.quantity<quantity){
                return res.status(400).json({error: "Product quantity not sufficient, cannot accept the order currently"})
            }
            product.quantity-=quantity;
            await order.save();
            res.status(200).json({msg: "Order accepted."});
        }
        catch(error){
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    else if (status==="Completed"){
        try{
            const vendor =  await Vendor.findOne({email: v_email});
            if(!vendor){
                return res.status(400).json({error: "Vendor not found"});
            }
            const product = vendor.products.find((product) => product.pid === pid);
            if(!product){
                return res.status(400).json({error: "Product not found"});
            }
            product.quantity += req.body.quantity;
            await vendor.save();
            res.status(200).json({msg: "Order Status Updated Completed and Vendor data updated"});

        }
        catch(error){
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    try{
        const order = await Order.find ({_id: id});
        if(!order){
            return res.status(400).json({error: "No orders found"});
        }
        order.status = status;
        await order.save();
        res.status(200).json({msg: "Order Status Updated."});
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})



// get all sales and profits for dashboard
router.post('/getupfields', async (req, res) => {
    try {
        const email = req.cookies.inv_man.email
        // const email = req.body.email // Assuming email is in the request body, you can change it if needed
        // Find the company's data by email
        const dashboard = await Dashboard.findOne({ email });
        if (!dashboard) {
            return res.status(404).json({ error: 'Company data not found' });
        }
        
        // Calculate the total sales and profits for the company based on the monthly data
        let tsales = 0;
        let profit = 0;
        
        const date = new Date();
        const month = date.getMonth().toString();;
        const year = date.getFullYear().toString();
        const monthData = dashboard.data.find((monthData) => monthData.month === month && monthData.year === year)
        let sales = monthData.monthly_data.sales
        dashboard.data.forEach((monthlyItem) => {
            tsales += monthlyItem.monthly_data.sales;
            profit += monthlyItem.monthly_data.profit;
        });
        
        res.status(200).json({ sales, profit, tsales });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/getrole', (req, res) => {
    let role
    if(req.cookies){
        if(req.cookies.inv_man){
            if(req.cookies.inv_man.role){
                role=req.cookies.inv_man.role
            }
        }
        else{
            role="visitor"
        }
    }
    else{
        role="visitor"
    }
    return res.json({role:role})
})

router.post('/acceptRequest', async (req, res) => {
    const email = req.cookies.inv_man.email
    const {id} = req.body
    try{
        const order = await Order.findOne({_id: id});
        const company = await Company.findOne({email: email});
        if(!order){
            return res.status(400).json({error: "No order found"});
        }
        for (const product of order.products) {
            const companyProduct = company.products.find(item => item.pid === product.pid);
            if (companyProduct.quantity < product.quantity) {
                return res.status(400).json({error: "Could not accept order now. Some items not in sufficient quantity"})
            }
        }
        for (const product of order.products) {
            const companyProduct = company.products.find(item => item.pid === product.pid);
            companyProduct.quantity-=product.quantity;
        }
        
        order.status = 'Accepted';
        await Order.replaceOne({ _id: id }, order);
        await Company.replaceOne({ email: email }, company);
        res.status(200).json({msg: "Order accepted successfully"})
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/rejectRequest', async (req, res) => {
    const id = req.body.id
    try{
        const order = await Order.findOne({_id: id});
        if(!order){
            return res.status(400).json({error: "No order found"});
        }

        order.status = 'Rejected';
        await Order.replaceOne({ _id: id }, order);
        res.status(200).json({msg: "Order rejected"})
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/dispatchRequest', async (req, res) => {
    const id = req.body.id
    try{
        const order = await Order.findOne({_id: id});
        if(!order){
            return res.status(400).json({error: "No order found"});
        }

        order.status = 'Dispatched';
        await Order.replaceOne({ _id: id }, order);
        res.status(200).json({msg: "Order dispatched"})
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/confirmationPending', async (req, res) => {
    const id = req.body.id
    try{
        const order = await Order.findOne({_id: id});
        if(!order){
            return res.status(400).json({error: "No order found"});
        }

        order.status = 'Confirmation pending';
        await Order.replaceOne({ _id: id }, order);
        res.status(200).json({msg: "Confirmation request sent"})
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/revokeRequest', async (req, res) => {
    const id = req.body.id
    try{
        const order = await Order.findOne({_id: id});
        if(!order){
            return res.status(400).json({error: "No order found"});
        }

        order.status = 'Revoked';
        await order.deleteOne();
        res.status(200).json({msg: "Order revoked successfully"})
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post('/companylogout', (req, res) => {
    res.clearCookie('inv_man', {path:'/'})
    res.status(200).json({msg:"Logged out successfully"})
})

module.exports = router;