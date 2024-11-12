const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { authenticateJWT, ensureAuthenticated } = require('./auth');
const modelRoutes = require('./routes/model');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../efs', 'Client', 'views'));

// Serve static files from the EFS directory
app.use('/efs', express.static(path.join(__dirname, '../efs')));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply authentication to all `/models` routes
app.use('/models', authenticateJWT, ensureAuthenticated, modelRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`TrainTrackModelService running on port ${PORT}`);
});
