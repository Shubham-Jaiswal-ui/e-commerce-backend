const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { Product, Users } = require("./models");

app.use(express.json());
app.use(cors());

// Database connection with mongoDb

mongoose.connect(
	"mongodb+srv://shubham51jaiswal:1602731138@cluster0.ldwzzte.mongodb.net/e-commerce"
);

// API creation

app.get("/", (req, res) => {
	res.send("Express App is running");
});

//Image Storage Engine

const storage = multer.diskStorage({
	destination: "./upload/images",
	filename: (req, file, cb) => {
		return cb(
			null,
			`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
		);
	},
});

const upload = multer({ storage });

// Creating upload Endpoint for images
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
	res.json({
		success: 1,
		image_url: `http://localhost:${port}/images/${req.file.filename}`,
	});
});

app.post("/addproduct", async (req, res) => {
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
		old_price: req.body.old_price,
	});
	console.log(product);

	await product.save();
	console.log("save");
	res.json({ success: true, name: req.body.name });
});

//Creating API for deleting produc
app.delete("/removeproduct", async (req, res) => {
	let id = req.id;
	await Product.findOneAndDelete({ id: req.body.id });

	console.log("Removed");

	res.json({ success: true, name: req.body.name });
});

// Creating API to get all products
app.get("/allproducts", async (req, res) => {
	let id = req.id;
	let products = await Product.find({});

	console.log("all products fetched");

	res.json(products);
});

// Creating end point for registering the user

app.post("/signup", async (req, res) => {
	let check = await Users.findOne({ email: req.body.email });
	if (check) {
		return res.status(400).json({
			sucess: false,
			errors: "Existing user found with same email Id",
		});
	}
	let cart = {};
	for (let index = 0; index < 300; index++) {
		cart[index] = 0;
	}

	const user = new Users({
		name: req.body.username,
		email: req.body.email,
		password: req.body.password,
		cartData: cart,
	});

	await user.save();
	const date = {
		user: {
			id: user.id,
		},
	};
	const token = jwt.sign(date, "secret_ecom");
	res.json({ success: true, token });
});

//Creating end point for user login
app.post("/login", async (req, res) => {
	let user = await Users.findOne({ email: req.body.email });

	if (user) {
		const checkPassword = req.body.password === user.password;
		if (checkPassword) {
			const data = {
				user: {
					id: user.id,
				},
			};

			const token = jwt.sign(data, "secret_ecom");
			res.json({ success: true, token });
		} else {
			res.json({ success: false, errors: "Wrong password" });
		}
	} else {
		res.status(404).json({ success: false, errors: "Wrong email id" });
	}
});

//Creating endpoint for new collection data
app.get("/newcollections", async (req, res) => {
	let products = await Product.find({});
	let newcollection = products.slice(1).slice(-8);
	res.send(newcollection);
});

//Creating endpoint for popular in women category data
app.get("/popularinwomen", async (req, res) => {
	let products = await Product.find({ category: "women" });
	let popular_in_women = products.slice(0, 4);
	res.send(popular_in_women);
});

// Creating middleware to fetch user

const fetchUser = async (req, res, next) => {
	const token = req.header("auth-token");
	if (!token) {
		res.status(401).send({ errors: "Please aunthenticate using valid token" });
	} else {
		try {
			const data = jwt.verify(token, "secret_ecom");
			req.user = data.user;
			next();
		} catch (error) {
			res
				.status(401)
				.send({ errors: "Please authenticate using a valid token" });
		}
	}
};

// Creating endpoint for add to cart
app.post("/addtocart", fetchUser, async (req, res) => {
	let userData = await Users.findOne({ _id: req.user.id });
	userData.cartData[req.body.itemId] += 1;
	await Users.findOneAndUpdate(
		{ _id: req.user.id },
		{ cartData: userData.cartData }
	);
	res.send("Added");
});

// Creating endpoint for removing from cart
app.post("/removefromcart", fetchUser, async (req, res) => {
	let userData = await Users.findOne({ _id: req.user.id });
	if (userData.cartData[req.body.itemId] > 0) {
		userData.cartData[req.body.itemId] -= 1;
	}
	await Users.findOneAndUpdate(
		{ _id: req.user.id },
		{ cartData: userData.cartData }
	);
	res.send("Removed");
});

// Creating endpoint to get cartdata

app.post("/getcart", fetchUser, async (req, res) => {
	let userData = await Users.findOne({ _id: req.user.id });
	res.json(userData.cartData);
});

app.listen(port, (error) => {
	if (!error) {
		console.log("Server running on Port " + port);
	} else {
		console.log("Error :" + error);
	}
});
