const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../modals/user_modal');

const router = express.Router();



// Register route
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' , status   : false});
        }

        // Hash password
        const salt =await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(200).json({ message: 'User registered successfully' , status   : true});
    } catch (error) {
    let msg = "Something went wrong";

    // अगर validation error है
    if (error.name === "ValidationError") {
        msg = Object.values(error.errors).map(err => err.message).join(", ");
    } else {
        msg = error.message;
    }

    res.status(500).json({ message: msg, status: false });
}

});




// Login route
router.post('/login', async (req, res) => {
    const { email, password,device_token} = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User Not Found' , status   : false});
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' , status   : false});
        }
        if(device_token==null || device_token==undefined){
          return res.status(400).json({ message: 'Device Token is required' , status   : false});
        }

        if(device_token && device_token.trim() !=""){
          user.device_token = device_token.trim();
          await user.save();
        }

        // Create and assign a token
        const token = jwt.sign({ id: user._id }, 'rahulKaPalhaBackend', { expiresIn: '1h' });
        res.status(200).json({ token, user: { id: user._id, username: user.username, email: user.email , userId:user.userId } , status: true});
    } catch (error) {
        res.status(500).json({ error: error.message , status   : false});
    }
});

//Get user data

router.get("/user/:userId", async (req, res) => {
  try {

    const userId = parseInt(req.params.userId); // <-- yahan userId
    console.log("userId from URL:", userId);

    const user = await User.findOne({ userId: userId }).select("-password");

    if (user) {
      res.status(200).json({ user, status: true });
    } else {
      res.status(404).json({ message: "User not found", status: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
});

const verifyToken = require('../middlware/verify_token');

router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // saare users without password
    
    if (users && users.length > 0) {
      res.status(200).json({ status: true , users});
    } else {
      res.status(404).json({ message: "No users found", status: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, status: false });
  }
});
 
module.exports = router;

