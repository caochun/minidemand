const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || 'localhost';
const execAsync = promisify(exec);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
    }
  }
}));
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory job storage (in production, use a database)
let jobs = [];
let jobTemplates = [];

// Initialize default templates
const initializeTemplates = async () => {
  const templatesDir = path.join(__dirname, '../templates');
  console.log('Initializing templates in:', templatesDir);
  try {
    await fs.mkdir(templatesDir, { recursive: true });
    
    // Create default templates if they don't exist
    const defaultTemplates = [
      {
        id: 'basic-job',
        name: 'Basic Job',
        description: 'A simple batch job template',
        script: `#!/bin/bash
#SBATCH --job-name=basic-job
#SBATCH --time=01:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=1G

echo "Hello from job $SLURM_JOB_ID"
echo "Running on node: $(hostname)"
echo "Start time: $(date)"
sleep 30
echo "End time: $(date)"`
      },
      {
        id: 'parallel-job',
        name: 'Parallel Job',
        description: 'A parallel processing job template',
        script: `#!/bin/bash
#SBATCH --job-name=parallel-job
#SBATCH --time=02:00:00
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G

echo "Parallel job $SLURM_JOB_ID starting"
echo "Nodes: $SLURM_JOB_NUM_NODES"
echo "Tasks per node: $SLURM_NTASKS_PER_NODE"
echo "Total tasks: $SLURM_NTASKS"

# Your parallel processing code here
for i in $(seq 1 $SLURM_NTASKS); do
  echo "Task $i running on $(hostname)"
done

echo "Job completed"`
      },
      {
        id: 'gpu-job',
        name: 'GPU Job',
        description: 'A GPU-accelerated job template',
        script: `#!/bin/bash
#SBATCH --job-name=gpu-job
#SBATCH --time=04:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --gres=gpu:1

echo "GPU job $SLURM_JOB_ID starting"
echo "GPU: $CUDA_VISIBLE_DEVICES"

# Load CUDA module if available
module load cuda 2>/dev/null || echo "CUDA module not available"

# Your GPU code here
nvidia-smi
echo "GPU job completed"`
      }
    ];

    for (const template of defaultTemplates) {
      const templatePath = path.join(templatesDir, `${template.id}.sh`);
      console.log('Processing template:', template.id, 'at', templatePath);
      try {
        await fs.access(templatePath);
        // File exists, load it
        const script = await fs.readFile(templatePath, 'utf8');
        const templateData = {
          ...template,
          script,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        jobTemplates.push(templateData);
        console.log('Loaded existing template:', template.id);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(templatePath, template.script);
        const templateData = {
          ...template,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        jobTemplates.push(templateData);
        console.log('Created new template:', template.id);
      }
    }
    console.log('Total templates loaded:', jobTemplates.length);
    console.log('jobTemplates array:', jobTemplates);
  } catch (error) {
    console.error('Error initializing templates:', error);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    title: 'MiniDemand Job Composer',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Job Templates API
app.get('/api/templates', (req, res) => {
  console.log('Templates API called, jobTemplates length:', jobTemplates.length);
  res.json(jobTemplates);
});

app.get('/api/templates/:id', (req, res) => {
  const template = jobTemplates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

app.post('/api/templates', async (req, res) => {
  try {
    const { name, description, script, category } = req.body;
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if template with same ID already exists
    if (jobTemplates.find(t => t.id === id)) {
      return res.status(400).json({ error: 'Template with this name already exists' });
    }
    
    const template = {
      id,
      name,
      description,
      script,
      category: category || 'Custom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save template to file
    const templatePath = path.join(__dirname, '../templates', `${id}.sh`);
    await fs.writeFile(templatePath, script);
    
    jobTemplates.push(template);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const { name, description, script, category } = req.body;
    const templateIndex = jobTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = jobTemplates[templateIndex];
    template.name = name || template.name;
    template.description = description || template.description;
    template.script = script || template.script;
    template.category = category || template.category;
    template.updatedAt = new Date().toISOString();
    
    // Update template file
    const templatePath = path.join(__dirname, '../templates', `${template.id}.sh`);
    await fs.writeFile(templatePath, template.script);
    
    jobTemplates[templateIndex] = template;
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const templateIndex = jobTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = jobTemplates[templateIndex];
    
    // Delete template file
    const templatePath = path.join(__dirname, '../templates', `${template.id}.sh`);
    try {
      await fs.unlink(templatePath);
    } catch (error) {
      console.warn('Could not delete template file:', error.message);
    }
    
    jobTemplates.splice(templateIndex, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Jobs API
app.get('/api/jobs', (req, res) => {
  res.json(jobs);
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { name, templateId, script, cluster, options } = req.body;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      name,
      templateId,
      script,
      cluster: cluster || 'localhost',
      status: 'pending',
      createdAt: new Date().toISOString(),
      options: options || {},
      logs: [],
      output: '',
      error: ''
    };
    
    jobs.push(job);
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.post('/api/jobs/:id/submit', async (req, res) => {
  try {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Simulate job submission
    job.status = 'submitted';
    job.submittedAt = new Date().toISOString();
    job.slurmJobId = `SLURM_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate job execution
    setTimeout(() => {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
    }, 2000);
    
    setTimeout(() => {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.output = `Job ${job.slurmJobId} completed successfully\nOutput: Hello from job ${job.slurmJobId}\nRunning on node: localhost\nStart time: ${job.startedAt}\nEnd time: ${job.completedAt}`;
    }, 10000);
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/:id/cancel', async (req, res) => {
  try {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status === 'running' || job.status === 'submitted') {
      job.status = 'cancelled';
      job.cancelledAt = new Date().toISOString();
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const jobIndex = jobs.findIndex(j => j.id === req.params.id);
    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    jobs.splice(jobIndex, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Job logs API
app.get('/api/jobs/:id/logs', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    logs: job.logs,
    output: job.output,
    error: job.error
  });
});

// Clusters API (simulated)
app.get('/api/clusters', (req, res) => {
  res.json([
    {
      id: 'localhost',
      name: 'Local Development',
      description: 'Local development cluster',
      status: 'active'
    },
    {
      id: 'cluster1',
      name: 'Production Cluster 1',
      description: 'Main production cluster',
      status: 'active'
    },
    {
      id: 'cluster2',
      name: 'GPU Cluster',
      description: 'GPU-accelerated cluster',
      status: 'maintenance'
    }
  ]);
});

// Start server after templates are initialized
async function startServer() {
  try {
    await initializeTemplates();
    console.log('Templates initialization completed');
    
    app.listen(PORT, HOST, () => {
      console.log(`MiniDemand Job Composer Server running on http://${HOST}:${PORT}`);
      console.log(`Templates directory: ${path.join(__dirname, '../templates')}`);
    });
  } catch (error) {
    console.error('Templates initialization failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
