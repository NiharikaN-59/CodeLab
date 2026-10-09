const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function run() {
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@codelab.dev',
      password: 'password123'
    });
    token = loginRes.data.token;
    console.log('Logged in successfully');

    // Create a new project for analysis test
    const projRes = await axios.post(`${BASE_URL}/projects`, {
      name: 'Analysis Test',
      description: 'Testing analysis persistence'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const projectId = projRes.data.project._id;
    console.log('Project created:', projectId);

    // Create a file with multiple types of issues
    await axios.post(`${BASE_URL}/projects/${projectId}/files`, {
      name: 'app.js',
      path: 'app.js',
      content: `
// Security issue
eval('some code');

// Security issue 2
const password = 'hardcoded_secret';

// Bug
if (val == null) {}

// Code Smell
console.log('debug');

// Maintainability
// TODO: fix this

// Complexity
if (a) {
  if (b) {
    if (c) {
      console.log('too deep');
    }
  }
}
      `
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Run analysis
    console.log('Running analysis...');
    const analysisRes = await axios.post(`${BASE_URL}/analysis/${projectId}/run`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Analysis result issues:', analysisRes.data.analysis.issues.map(i => ({
      title: i.title,
      type: i.type,
      priority: i.priority
    })));

    // Fetch issues to verify persistence
    const issuesRes = await axios.get(`${BASE_URL}/analysis/${projectId}/issues`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Fetched issues:', issuesRes.data.issues.map(i => ({
      title: i.title,
      type: i.type,
      priority: i.priority
    })));

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
