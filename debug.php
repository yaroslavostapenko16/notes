<?php
/**
 * Debug/Diagnosis Page
 * Used to test database connection and API endpoints
 * Remove this file on production for security
 */

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>";
echo "<html><head><title>Debug Page</title>";
echo "<style>";
echo "body { font-family: Arial; margin: 20px; }";
echo ".success { color: green; background: #e8f5e9; padding: 10px; margin: 5px 0; }";
echo ".error { color: red; background: #ffebee; padding: 10px; margin: 5px 0; }";
echo ".info { color: blue; background: #e3f2fd; padding: 10px; margin: 5px 0; }";
echo ".test-section { margin: 20px 0; border: 1px solid #ccc; padding: 15px; }";
echo "h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }";
echo "pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }";
echo "</style></head><body>";
echo "<h1>🔍 Notes App - Debug Console</h1>";

// Test 1: PHP Version
echo "<div class='test-section'>";
echo "<h2>1. PHP Version</h2>";
echo "<div class='info'>PHP Version: " . phpversion() . "</div>";
echo "</div>";

// Test 2: Required Extensions
echo "<div class='test-section'>";
echo "<h2>2. Required Extensions</h2>";
$extensions = ['mysqli', 'json', 'filter'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<div class='success'>✓ Extension '$ext' is loaded</div>";
    } else {
        echo "<div class='error'>✗ Extension '$ext' is NOT loaded</div>";
    }
}
echo "</div>";

// Test 3: File Permissions
echo "<div class='test-section'>";
echo "<h2>3. File Permissions</h2>";
$files = [
    'config.php',
    'api/auth.php',
    'api/notes.php',
    'api/labels.php',
    'index.html',
    'script.js'
];
foreach ($files as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        echo "<div class='success'>✓ File '$file' exists (permissions: $perms)</div>";
    } else {
        echo "<div class='error'>✗ File '$file' does NOT exist</div>";
    }
}
echo "</div>";

// Test 4: Database Connection
echo "<div class='test-section'>";
echo "<h2>4. Database Connection Test</h2>";
echo "<h3>Configuration:</h3>";
echo "<pre>";
echo "Host: localhost\n";
echo "User: u757840095_note2\n";
echo "Database: u757840095_note\n";
echo "</pre>";

try {
    $mysqli = new mysqli('localhost', 'u757840095_note2', 'MB?EM6aTa7&M', 'u757840095_note');
    
    if ($mysqli->connect_error) {
        echo "<div class='error'>";
        echo "Connection Error: " . $mysqli->connect_error . " (Error Code: " . $mysqli->connect_errno . ")";
        echo "</div>";
    } else {
        echo "<div class='success'>✓ Database connection successful</div>";
        
        // Check charset
        $charset = $mysqli->character_set_name();
        echo "<div class='info'>Character Set: " . htmlspecialchars($charset) . "</div>";
        
        // Test 5: Database Tables
        echo "<h3>Database Tables:</h3>";
        $tables = ['users', 'notes', 'labels', 'note_labels', 'collaborators', 'note_history'];
        
        foreach ($tables as $table) {
            $result = $mysqli->query("SHOW TABLES LIKE '$table'");
            if ($result && $result->num_rows > 0) {
                // Get table info
                $info = $mysqli->query("SELECT COUNT(*) as count FROM $table");
                $row = $info->fetch_assoc();
                echo "<div class='success'>✓ Table '$table' exists (Records: " . $row['count'] . ")</div>";
            } else {
                echo "<div class='error'>✗ Table '$table' does NOT exist</div>";
            }
        }
        
        // Test 6: Sample Query
        echo "<h3>Sample Data Check:</h3>";
        $users = $mysqli->query("SELECT COUNT(*) as count FROM users");
        if ($users) {
            $row = $users->fetch_assoc();
            echo "<div class='info'>Total Users: " . $row['count'] . "</div>";
        }
        
        $mysqli->close();
    }
} catch (Exception $e) {
    echo "<div class='error'>";
    echo "Exception: " . htmlspecialchars($e->getMessage());
    echo "</div>";
}

echo "</div>";

// Test 7: Session Test
echo "<div class='test-section'>";
echo "<h2>5. Session Configuration</h2>";
echo "<div class='info'>Session Status: " . (session_status() === PHP_SESSION_ACTIVE ? 'Active' : 'Not Active') . "</div>";
echo "<div class='info'>Session Save Path: " . session_save_path() . "</div>";
echo "<div class='info'>Session Cookie HttpOnly: " . (ini_get('session.cookie_httponly') ? 'Yes' : 'No') . "</div>";
echo "</div>";

// Test 8: API Test
echo "<div class='test-section'>";
echo "<h2>6. API Endpoint Test</h2>";
echo "<p><strong>Note:</strong> The following endpoints require authentication. Use the interface to test.</p>";
echo "<ul>";
echo "<li>GET <code>/api/auth.php?action=check_session</code> - Check if user is logged in</li>";
echo "<li>POST <code>/api/auth.php?action=login</code> - Login user</li>";
echo "<li>POST <code>/api/auth.php?action=register</code> - Register new user</li>";
echo "<li>GET <code>/api/notes.php?action=list</code> - Get all notes</li>";
echo "</ul>";
echo "</div>";

// Test 9: Error Log
echo "<div class='test-section'>";
echo "<h2>7. Error Log</h2>";
$error_log = __DIR__ . '/error.log';
if (file_exists($error_log)) {
    $content = file_get_contents($error_log);
    if (strlen($content) > 0) {
        echo "<pre>" . htmlspecialchars(substr($content, -2000)) . "</pre>";
    } else {
        echo "<div class='success'>No errors logged</div>";
    }
} else {
    echo "<div class='info'>Error log file not yet created (will be created on first error)</div>";
}
echo "</div>";

echo "</body></html>";
?>
