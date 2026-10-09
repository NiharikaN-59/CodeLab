const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let projectId = '';

async function run() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@codelab.dev',
      password: 'password123'
    });
    token = loginRes.data.token;
    console.log('Logged in successfully');

    // 2. Create a test project
    const projRes = await axios.post(`${BASE_URL}/projects`, {
      name: 'Nested Folder Test',
      description: 'Testing recursive folder uploads'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    projectId = projRes.data.project._id;
    console.log('Project created:', projectId);

    // 3. Create dummy files
    fs.mkdirSync('./test-upload/src/auth', { recursive: true });
    fs.mkdirSync('./test-upload/src/utils', { recursive: true });
    fs.mkdirSync('./test-upload/public', { recursive: true });
    fs.mkdirSync('./test-upload/config', { recursive: true });

    fs.writeFileSync('./test-upload/package.json', '{"name": "test"}');
    fs.writeFileSync('./test-upload/README.md', '# Test Project');
    fs.writeFileSync('./test-upload/src/app.js', 'console.log("app");');
    fs.writeFileSync('./test-upload/src/auth/login.js', 'console.log("login");');
    fs.writeFileSync('./test-upload/src/auth/register.js', 'console.log("register");');
    fs.writeFileSync('./test-upload/src/utils/helpers.js', 'console.log("helpers");');
    fs.writeFileSync('./test-upload/public/index.html', '<html></html>');
    fs.writeFileSync('./test-upload/public/styles.css', 'body {}');
    fs.writeFileSync('./test-upload/config/database.js', 'module.exports = {};');
    
    // 4. Upload as folder
    const form = new FormData();
    const addFileToForm = (filePath, relativePath) => {
      form.append('files', fs.createReadStream(filePath));
      form.append('paths', relativePath);
    };

    addFileToForm('./test-upload/package.json', 'test-upload/package.json');
    addFileToForm('./test-upload/README.md', 'test-upload/README.md');
    addFileToForm('./test-upload/src/app.js', 'test-upload/src/app.js');
    addFileToForm('./test-upload/src/auth/login.js', 'test-upload/src/auth/login.js');
    addFileToForm('./test-upload/src/auth/register.js', 'test-upload/src/auth/register.js');
    addFileToForm('./test-upload/src/utils/helpers.js', 'test-upload/src/utils/helpers.js');
    addFileToForm('./test-upload/public/index.html', 'test-upload/public/index.html');
    addFileToForm('./test-upload/public/styles.css', 'test-upload/public/styles.css');
    addFileToForm('./test-upload/config/database.js', 'test-upload/config/database.js');

    console.log('Uploading files...');
    const uploadRes = await axios.post(`${BASE_URL}/projects/${projectId}/upload`, form, {
      headers: { 
        ...form.getHeaders(),
        Authorization: `Bearer ${token}` 
      }
    });

    console.log('Upload result:', JSON.stringify(uploadRes.data, null, 2));

    // 5. Fetch project and verify structure
    const fetchRes = await axios.get(`${BASE_URL}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const files = fetchRes.data.project.files;
    console.log(`Project has ${files.length} files/folders`);
    files.forEach(f => {
      console.log(`- [${f.isDirectory ? 'DIR' : 'FILE'}] ${f.path} (parent: ${f.parent})`);
    });

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

run();
