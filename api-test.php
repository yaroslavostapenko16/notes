<?php
/**
 * API Test Page
 * Simple interface to test all API endpoints
 * Remove this file on production for security
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get request data
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['test']) ? $_GET['test'] : '';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Console</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #4ec9b0;
            margin-bottom: 20px;
        }
        .test-section {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .test-button {
            background: #007acc;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 4px;
            margin-right: 5px;
            margin-bottom: 10px;
        }
        .test-button:hover {
            background: #005a9e;
        }
        .endpoint {
            background: #1e1e1e;
            color: #ce9178;
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
            overflow-x: auto;
        }
        .response {
            background: #0d0d0d;
            color: #4ec9b0;
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
            border-left: 3px solid #007acc;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        .error {
            color: #f48771;
            border-left-color: #f48771;
        }
        .success {
            color: #4ec9b0;
            border-left-color: #4ec9b0;
        }
        input, textarea {
            background: #3c3c3c;
            color: #d4d4d4;
            border: 1px solid #3e3e42;
            padding: 8px;
            border-radius: 4px;
            width: 100%;
            font-family: 'Courier New', monospace;
            margin-bottom: 10px;
        }
        label {
            display: block;
            color: #9cdcfe;
            margin-top: 10px;
            margin-bottom: 5px;
        }
        .tabs {
            display: flex;
            border-bottom: 1px solid #3e3e42;
            margin-bottom: 15px;
        }
        .tab {
            background: #1e1e1e;
            border: none;
            color: #d4d4d4;
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }
        .tab.active {
            background: #252526;
            color: #4ec9b0;
            border-bottom-color: #007acc;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 API Test Console</h1>
        <p style="margin-bottom: 20px; color: #808080;">Test all API endpoints and debug issues</p>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('connection')">Connection</button>
            <button class="tab" onclick="switchTab('auth')">Authentication</button>
            <button class="tab" onclick="switchTab('notes')">Notes</button>
            <button class="tab" onclick="switchTab('labels')">Labels</button>
            <button class="tab" onclick="switchTab('manual')">Manual Request</button>
        </div>
        
        <!-- Connection Test -->
        <div id="connection" class="tab-content active">
            <div class="test-section">
                <h2>Database Connection Test</h2>
                <button class="test-button" onclick="testConnection()">Test Database</button>
                <div id="connectionResult"></div>
            </div>
            
            <div class="test-section">
                <h2>File Structure Test</h2>
                <button class="test-button" onclick="testFiles()">Check Files</button>
                <div id="filesResult"></div>
            </div>
        </div>
        
        <!-- Authentication Test -->
        <div id="auth" class="tab-content">
            <div class="test-section">
                <h2>Check Session</h2>
                <button class="test-button" onclick="testCheckSession()">Check Session</button>
                <div id="checkSessionResult"></div>
            </div>
            
            <div class="test-section">
                <h2>Register User</h2>
                <label>Username:</label>
                <input type="text" id="regUsername" placeholder="testuser" value="testuser">
                <label>Email:</label>
                <input type="email" id="regEmail" placeholder="test@example.com" value="test@example.com">
                <label>Password:</label>
                <input type="password" id="regPassword" placeholder="password123" value="password123">
                <button class="test-button" onclick="testRegister()">Register</button>
                <div id="registerResult"></div>
            </div>
            
            <div class="test-section">
                <h2>Login User</h2>
                <label>Username/Email:</label>
                <input type="text" id="loginUsername" placeholder="testuser" value="testuser">
                <label>Password:</label>
                <input type="password" id="loginPassword" placeholder="password123" value="password123">
                <button class="test-button" onclick="testLogin()">Login</button>
                <div id="loginResult"></div>
            </div>
        </div>
        
        <!-- Notes Test -->
        <div id="notes" class="tab-content">
            <div class="test-section">
                <h2>Get All Notes</h2>
                <button class="test-button" onclick="testGetNotes()">Load Notes</button>
                <div id="getNotesResult"></div>
            </div>
            
            <div class="test-section">
                <h2>Create Note</h2>
                <label>Title:</label>
                <input type="text" id="noteTitle" placeholder="Note Title" value="Test Note">
                <label>Content:</label>
                <textarea id="noteContent" placeholder="Note Content" rows="4">This is a test note</textarea>
                <label>Color (hex):</label>
                <input type="text" id="noteColor" placeholder="#FFFFFF" value="#FFE082">
                <button class="test-button" onclick="testCreateNote()">Create Note</button>
                <div id="createNoteResult"></div>
            </div>
        </div>
        
        <!-- Labels Test -->
        <div id="labels" class="tab-content">
            <div class="test-section">
                <h2>Get All Labels</h2>
                <button class="test-button" onclick="testGetLabels()">Load Labels</button>
                <div id="getLabelsResult"></div>
            </div>
            
            <div class="test-section">
                <h2>Create Label</h2>
                <label>Label Name:</label>
                <input type="text" id="labelName" placeholder="Label Name" value="Important">
                <label>Color (hex):</label>
                <input type="text" id="labelColor" placeholder="#999999" value="#FF6B6B">
                <button class="test-button" onclick="testCreateLabel()">Create Label</button>
                <div id="createLabelResult"></div>
            </div>
        </div>
        
        <!-- Manual Request -->
        <div id="manual" class="tab-content">
            <div class="test-section">
                <h2>Manual API Request</h2>
                <label>Method:</label>
                <select id="requestMethod" style="width: 100%; padding: 8px; background: #3c3c3c; color: #d4d4d4; border: 1px solid #3e3e42; border-radius: 4px; margin-bottom: 10px;">
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                </select>
                <label>Endpoint (relative to api/):</label>
                <input type="text" id="requestEndpoint" placeholder="auth.php?action=check_session">
                <label>Request Body (JSON):</label>
                <textarea id="requestBody" placeholder='{"key": "value"}' rows="6"></textarea>
                <button class="test-button" onclick="testManualRequest()">Send Request</button>
                <div id="manualResult"></div>
            </div>
        </div>
    </div>
    
    <script>
        const API_BASE = './api';
        
        function switchTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });
            
            // Remove active from all tab buttons
            document.querySelectorAll('.tab').forEach(el => {
                el.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Add active to clicked button
            event.target.classList.add('active');
        }
        
        function displayResult(elementId, data, isError = false) {
            const el = document.getElementById(elementId);
            el.className = isError ? 'response error' : 'response success';
            el.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        
        function testConnection() {
            const resultEl = document.getElementById('connectionResult');
            resultEl.innerHTML = '<p>Testing connection...</p>';
            
            fetch('debug.php')
                .then(res => res.text())
                .then(html => {
                    if (html.includes('successful')) {
                        displayResult('connectionResult', {
                            status: 'SUCCESS',
                            message: 'Database connection is working',
                            timestamp: new Date().toLocaleString()
                        });
                    } else {
                        displayResult('connectionResult', {
                            status: 'FAILED',
                            message: 'Database connection failed',
                            details: 'Check debug.php for more information',
                            timestamp: new Date().toLocaleString()
                        }, true);
                    }
                })
                .catch(err => displayResult('connectionResult', {error: err.message}, true));
        }
        
        function testFiles() {
            const files = ['config.php', 'api/auth.php', 'api/notes.php', 'api/labels.php'];
            const resultEl = document.getElementById('filesResult');
            resultEl.innerHTML = '<p>Checking files...</p>';
            
            Promise.all(files.map(f => 
                fetch(f, {method: 'HEAD'})
                    .then(res => ({file: f, exists: res.ok}))
                    .catch(() => ({file: f, exists: false}))
            )).then(results => {
                displayResult('filesResult', {
                    files: results,
                    timestamp: new Date().toLocaleString()
                });
            });
        }
        
        function testCheckSession() {
            fetch(`${API_BASE}/auth.php?action=check_session`)
                .then(res => res.json())
                .then(data => displayResult('checkSessionResult', data, !data.success))
                .catch(err => displayResult('checkSessionResult', {error: err.message}, true));
        }
        
        function testRegister() {
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            fetch(`${API_BASE}/auth.php?action=register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, email, password, password_confirm: password})
            })
            .then(res => res.json())
            .then(data => displayResult('registerResult', data, !data.success))
            .catch(err => displayResult('registerResult', {error: err.message}, true));
        }
        
        function testLogin() {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            fetch(`${API_BASE}/auth.php?action=login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            })
            .then(res => res.json())
            .then(data => displayResult('loginResult', data, !data.success))
            .catch(err => displayResult('loginResult', {error: err.message}, true));
        }
        
        function testGetNotes() {
            fetch(`${API_BASE}/notes.php?action=list`)
                .then(res => res.json())
                .then(data => displayResult('getNotesResult', data, !data.success))
                .catch(err => displayResult('getNotesResult', {error: err.message}, true));
        }
        
        function testCreateNote() {
            const title = document.getElementById('noteTitle').value;
            const content = document.getElementById('noteContent').value;
            const color = document.getElementById('noteColor').value;
            
            fetch(`${API_BASE}/notes.php?action=create`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title, content, color})
            })
            .then(res => res.json())
            .then(data => displayResult('createNoteResult', data, !data.success))
            .catch(err => displayResult('createNoteResult', {error: err.message}, true));
        }
        
        function testGetLabels() {
            fetch(`${API_BASE}/labels.php?action=list`)
                .then(res => res.json())
                .then(data => displayResult('getLabelsResult', data, !data.success))
                .catch(err => displayResult('getLabelsResult', {error: err.message}, true));
        }
        
        function testCreateLabel() {
            const name = document.getElementById('labelName').value;
            const color = document.getElementById('labelColor').value;
            
            fetch(`${API_BASE}/labels.php?action=create`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, color})
            })
            .then(res => res.json())
            .then(data => displayResult('createLabelResult', data, !data.success))
            .catch(err => displayResult('createLabelResult', {error: err.message}, true));
        }
        
        function testManualRequest() {
            const method = document.getElementById('requestMethod').value;
            const endpoint = document.getElementById('requestEndpoint').value;
            const bodyText = document.getElementById('requestBody').value;
            
            let body = null;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            } catch (e) {
                displayResult('manualResult', {error: 'Invalid JSON: ' + e.message}, true);
                return;
            }
            
            const options = {method};
            
            if (body) {
                options.headers = {'Content-Type': 'application/json'};
                options.body = JSON.stringify(body);
            }
            
            fetch(`${API_BASE}/${endpoint}`, options)
                .then(res => res.json())
                .then(data => displayResult('manualResult', data, !data.success))
                .catch(err => displayResult('manualResult', {error: err.message}, true));
        }
        
        // Auto-test on load
        window.addEventListener('load', () => {
            console.log('Test console loaded');
        });
    </script>
</body>
</html>
