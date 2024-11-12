// execute.js
const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { ensurePremiumOrAdmin } = require('../auth');
const pool = require('../db'); // Import your RDS connection

// Configure AWS SDK
AWS.config.update({ region: 'ap-southeast-2' });
const sqs = new AWS.SQS();

const EFS_BASE_PATH = path.join(__dirname, '../../efs/ml-models');

// Route to execute model script
router.post('/:modelId/execute', ensurePremiumOrAdmin, async (req, res) => {
  const modelId = req.params.modelId;
  const scriptName = req.body.script;

  if (!scriptName) {
    console.error('Error: Script name is undefined.');
    return res.status(400).json({ error: 'Script name is required.' });
  }

  const jobId = uuidv4(); // Generate a unique job ID

  // Create a job message
  const jobMessage = {
    jobId,
    modelId,
    scriptName,
    userId: res.locals.user.username, // Use username as userId
    timestamp: new Date().toISOString(),
    // Add any additional data needed
  };

  // Send the job to SQS
  const params = {
    QueueUrl: 'https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11357428-ModelProcessingQueue', // Your SQS queue URL
    MessageBody: JSON.stringify(jobMessage),
  };

  try {
    await sqs.sendMessage(params).promise();

    // Save initial job status in RDS
    await pool.query(
      'INSERT INTO model_jobs (job_id, model_id, user_id, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [jobId, modelId, res.locals.user.username, 'Queued']
    );

    // Redirect or respond to the user
    res.redirect(`/models/${modelId}`);
    //res.json({ message: 'Job submitted successfully', jobId });
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

module.exports = router;
