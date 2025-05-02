const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Request = require('./models/Request');
const router = express.Router();

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/emergencyAppli', {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// --- ROUTES ---

// Signup
app.post('/signup', async (req, res) => {
  const { name, email, phone, password, type } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, message: "User already exists" });

    const user = new User({ name, email, phone, password, type, available: false, location: {} });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    res.json({ success: false, message: "Signup failed" });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password, type } = req.body;
  try {
    const user = await User.findOne({ email, password, type });
    if (!user) return res.json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: "Login failed" });
  }
});

// Update driver status and location
app.post('/driver/status', async (req, res) => {
  const { driverId, available, location } = req.body;
  try {
    await User.updateOne({ _id: driverId }, { available, location });
    res.json({ success: true });
  } catch (err) {
    console.error('Driver status error:', err);
    res.json({ success: false });
  }
});

// Get nearby available drivers
app.post('/customer/nearby-drivers', async (req, res) => {
  const { location } = req.body;
  try {
    const drivers = await User.find({ type: 'driver', available: true });
    res.json({ success: true, drivers });
  } catch (err) {
    console.error('Nearby drivers error:', err);
    res.json({ success: false });
  }
});

// Add these new routes to your server.js file

// Get driver status (used when driver refreshes page)
app.get('/driver/status/:driverId', async (req, res) => {
    const { driverId } = req.params;
    try {
      const driver = await User.findById(driverId);
      if (!driver) return res.json({ success: false, message: "Driver not found" });
      res.json({ success: true, available: driver.available });
    } catch (err) {
      console.error('Driver status error:', err);
      res.json({ success: false, message: "Failed to get driver status" });
    }
  });
  
  // Get driver's current location
  app.get('/driver/location/:driverId', async (req, res) => {
    const { driverId } = req.params;
    try {
      const driver = await User.findById(driverId);
      if (!driver) return res.json({ success: false, message: "Driver not found" });
      res.json({ success: true, location: driver.location });
    } catch (err) {
      console.error('Driver location error:', err);
      res.json({ success: false, message: "Failed to get driver location" });
    }
  });
  
  // Update customer's live location
  app.post('/customer/update-location', async (req, res) => {
    const { customerId, driverId, location } = req.body;
    try {
      // Store customer location (optional, depending on your needs)
      await User.findByIdAndUpdate(customerId, { location });
      
      // You could store this in the request document too if needed
      res.json({ success: true });
    } catch (err) {
      console.error('Customer location update error:', err);
      res.json({ success: false, message: "Failed to update customer location" });
    }
  });
  
  // Check if a driver has accepted a customer's request
  app.post('/request/check-acceptance', async (req, res) => {
    const { customerId, driverId } = req.body;
    try {
      // Find the most recent request between this customer and driver
      const request = await Request.findOne({ 
        customerId, 
        driverId,
        status: 'accepted'  // Only return accepted requests
      }).sort({ createdAt: -1 }); // Most recent first
      
      if (request) {
        // If request is accepted, get driver details
        const driver = await User.findById(driverId);
        res.json({ 
          success: true, 
          accepted: true,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverLocation: driver.location 
        });
      } else {
        res.json({ success: true, accepted: false });
      }
    } catch (err) {
      console.error('Check acceptance error:', err);
      res.json({ success: false, message: "Failed to check request status" });
    }
  });
  
// Send request from customer to driver - Make sure this works correctly
// --- DRIVER ACCEPTS REQUEST ---
// Update your request accept endpoint to match what frontend expects
app.post('/driver/accept-request', async (req, res) => {
    const { requestId, driverId, customerId } = req.body;
    console.log('Accepting request:', { requestId, driverId, customerId });
  
    try {
      const request = await Request.findByIdAndUpdate(
        requestId, 
        { status: 'accepted' }, 
        { new: true }
      ).populate('customerId');
  
      if (!request) {
        return res.json({ success: false, message: 'Request not found' });
      }
  
      // Update driver's availability
      await User.findByIdAndUpdate(driverId, { available: false });
  
      res.json({ 
        success: true, 
        customerName: request.customerId.name,
        customerPhone: request.customerId.phone 
      });
    } catch (err) {
      console.error('Error accepting request:', err);
      res.status(500).json({ success: false, message: 'Failed to accept request' });
    }
  });

  // TEMPORARY - View all requests in database
// Send request from customer to driver - Make sure this works correctly
app.post('/request', async (req, res) => {
    try {
      const { customerId, driverId, customerLocation } = req.body;
  
      console.log("Creating request:", req.body);
  
      const newRequest = await Request.create({
        customerId,
        driverId,
        customerLocation,
        status: "pending",
      });
  
      res.json({ success: true, requestId: newRequest._id });
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Replace both /driver/pending-requests and /driver/requests with this single endpoint
  app.get('/driver/pending-requests/:id', async (req, res) => {
    console.log('Received GET /driver/pending-requests/', req.params.id);
  
    try {
      const driverObjectId = new mongoose.Types.ObjectId(req.params.id);
  
      const requests = await Request.find({ 
        driverId: driverObjectId,
        status: 'pending' 
      })
      .populate('customerId', 'name phone') // This might return null if customerId doesn't exist
      .lean();
  
      // Log missing customer IDs for debugging
      requests.forEach(req => {
        if (!req.customerId) {
          console.warn("Missing customerId for request:", req._id);
        }
      });
  
      // Safely format the requests
      const formattedRequests = requests.map(req => ({
        ...req,
        customerName: req.customerId?.name || "Unknown",
        customerPhone: req.customerId?.phone || "N/A"
      }));
  
      res.json({ success: true, requests: formattedRequests });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  });
  
  
  
  


  

// Get pending requests for driver
// app.post('/customer/request', async (req, res) => {
//     const { customerId, driverId, customerLocation } = req.body;
    
//     if (!customerId || !driverId || !customerLocation) {
//       return res.status(400).json({ success: false, message: 'Missing required fields' });
//     }
  
//     try {
//       // Create a new pending request
//       const request = new Request({
//         customerId,
//         driverId,
//         customerLocation,
//         status: 'pending'
//       });
  
//       await request.save();
  
//       res.json({ success: true, message: 'Request sent successfully' });
//     } catch (err) {
//       console.error('Error creating request:', err);
//       res.status(500).json({ success: false, message: 'Internal server error' });
//     }
//   });
  
// Get pending requests for driver - This is the most important one to fix
app.post('/driver/requests', async (req, res) => {
    const { driverId } = req.body;
  
    console.log('Incoming /driver/requests for driverId:', driverId);
  
    if (!driverId) {
      console.log('Missing driverId in /driver/requests');
      return res.status(400).json({ success: false, message: 'driverId is required' });
    }
  
    try {
      const requests = await Request.find({ 
        driverId: driverId, 
        status: 'pending' 
      }).populate('customerId');
  
      console.log(`Found ${requests.length} pending requests for driverId ${driverId}`);
  
      res.json({ success: true, requests });
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });


  

// Send driver info to customer after acceptance
app.post('/customer/send-driver-location', async (req, res) => {
  const { customerId, driverId, driverLocation, driverName, driverPhone } = req.body;
  try {
    const customer = await User.findById(customerId);
    if (!customer) return res.json({ success: false, message: "Customer not found" });

    console.log(`Sending driver info to customer ${customerId}`);
    res.json({ success: true, driverLocation, driverName, driverPhone });
  } catch (err) {
    console.error('Send driver info error:', err);
    res.json({ success: false });
  }
});

app.listen(4000, () => console.log('Server started on port 4000'));
