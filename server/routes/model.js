const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { exec } = require('child_process');
const { ensurePremiumOrAdmin } = require('../auth'); // Import premium middleware

let modelStatus = {};

// Base path to the EFS-mounted `ml-models` directory
const EFS_BASE_PATH = path.join(__dirname, '../../efs/ml-models');

// Function to get model metrics
function getModelMetrics(modelId) {
  const metricsDir = path.join(EFS_BASE_PATH, modelId);
  if (fs.existsSync(metricsDir)) {
    return fs.readdirSync(metricsDir)
      .filter(file => file.endsWith('.txt'))
      .map(file => `/efs/ml-models/${modelId}/${file}`);
  }
  return [];
}

// Function to get all models
function getAllModels() {
  const modelDirs = fs.readdirSync(EFS_BASE_PATH);
  return modelDirs
    .filter(dir => dir.startsWith('m'))
    .map(modelId => {
      const modelInfo = getModelInfo(modelId);
      if (modelInfo) {
        return { id: modelId, ...modelInfo };
      }
      return null;
    })
    .filter(info => info !== null);
}

// Function to get model info
function getModelInfo(modelId) {
  const infoFilePath = path.join(EFS_BASE_PATH, modelId, 'info.json');
  if (fs.existsSync(infoFilePath)) {
    const data = fs.readFileSync(infoFilePath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// Function to get model visualizations
function getModelVisualizations(modelId) {
  const visualsDir = path.join(EFS_BASE_PATH, modelId);
  if (fs.existsSync(visualsDir)) {
    return fs.readdirSync(visualsDir)
      .filter(file => file.endsWith('.png'))
      .map(file => `/efs/ml-models/${modelId}/${file}`);
  }
  return [];
}



// Route to render the models page (only requires authentication, not premium)
router.get('/', (req, res) => {
  const models = getAllModels();
  res.render('models', { title: 'Models', models });
});

// Premium-protected route to get model info as JSON
router.get('/:modelId/info', ensurePremiumOrAdmin, (req, res) => {
  const modelId = req.params.modelId;
  const info = getModelInfo(modelId);
  if (info) {
    res.json(info);
  } else {
    res.status(404).json({ error: 'Model not found' });
  }
});

// Premium-protected route to render a specific model's details
router.get('/:modelId', ensurePremiumOrAdmin, (req, res) => {
  const modelId = req.params.modelId;
  const modelInfo = getModelInfo(modelId);
  if (modelInfo) {
    const visuals = getModelVisualizations(modelId);
    const metrics = getModelMetrics(modelId);

    const metricsContent = metrics.map(metricPath => {
      return {
        path: metricPath,
        content: fs.readFileSync(path.join(EFS_BASE_PATH, modelId, path.basename(metricPath)), 'utf8')
      };
    });

    res.render('model', {
      title: `Model ${modelId}`,
      model: {
        id: modelId,
        ...modelInfo,
        visuals: visuals,
        metrics: metricsContent
      }
    });
  } else {
    res.status(404).send('Model not found');
  }
});

// Premium-protected route to execute model script
router.post('/:modelId/execute', ensurePremiumOrAdmin, (req, res) => {
  const modelId = req.params.modelId;
  const scriptName = req.body.script;

  if (!scriptName) {
    console.error('Error: Script name is undefined.');
    return res.status(400).json({ error: 'Script name is required.' });
  }

  const scriptPath = path.join(EFS_BASE_PATH, modelId, scriptName);
  const pythonPath = path.join(EFS_BASE_PATH, 'venv/bin/python3');

  // Set status to 'running'
  modelStatus[modelId] = 'running';

  if (fs.existsSync(scriptPath)) {
    exec(`${pythonPath} ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${stderr}`);
        modelStatus[modelId] = 'error';
        return res.status(500).json({ error: 'Error executing script', details: stderr });
      }
      console.log(`Script output: ${stdout}`);
      modelStatus[modelId] = 'finished';
      res.redirect(`/models/${modelId}`);
    });
  } else {
    modelStatus[modelId] = 'not found';
    res.status(404).json({ error: 'Script not found' });
  }
});

// Premium-protected route to check model execution status
router.get('/:modelId/status', ensurePremiumOrAdmin, (req, res) => {
  const modelId = req.params.modelId;
  const status = modelStatus[modelId] || 'not started';
  res.json({ status });
});

module.exports = router;
