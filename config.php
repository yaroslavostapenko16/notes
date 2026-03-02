<?php
/**
 * Database Configuration File
 * Notes Application - Google Keep Clone
 * For Hostinger Deployment
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/error.log');

// Custom error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $error_msg = sprintf(
        "[%s] %s in %s (line %d)\n",
        date('Y-m-d H:i:s'),
        $errstr,
        $errfile,
        $errline
    );
    error_log($error_msg);
    
    // Return false to continue with PHP's internal error handler
    return false;
});

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'u757840095_note2');
define('DB_PASS', 'MB?EM6aTa7&M');
define('DB_NAME', 'u757840095_note');

// Application Settings
define('APP_NAME', 'Notes');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', false);

// Security Settings
define('JWT_SECRET', 'your_secret_key_change_in_production_' . md5(DB_PASS));
define('SESSION_TIMEOUT', 3600 * 24 * 7); // 7 days
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB

// Allowed file types for uploads
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('UPLOAD_DIR', dirname(__FILE__) . '/uploads/');

// Ensure upload directory exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Create MySQLi connection with error handling
$connection_attempts = [];
$connect_errors = [];

// Try different host configurations
$hosts_to_try = [
    'localhost',
    '127.0.0.1',
    'localhost:3306',
    '127.0.0.1:3306'
];

$mysqli = null;

foreach ($hosts_to_try as $host) {
    try {
        $test_mysqli = new mysqli(
            $host,
            DB_USER,
            DB_PASS,
            DB_NAME
        );
        
        if (!$test_mysqli->connect_error) {
            $mysqli = $test_mysqli;
            error_log("[SUCCESS] Connected to database using host: $host");
            break;
        } else {
            $connect_errors[$host] = $test_mysqli->connect_error;
        }
    } catch (Exception $e) {
        $connect_errors[$host] = $e->getMessage();
    }
}

if (!$mysqli) {
    http_response_code(500);
    $error_msg = "Database connection failed. Attempted hosts: " . implode(", ", $hosts_to_try) . "\n";
    $error_msg .= "Errors: " . json_encode($connect_errors);
    error_log($error_msg);
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed. Please check your configuration.',
        'debug' => APP_DEBUG ? $connect_errors : null
    ]));
}

// Set charset to UTF-8
if (!$mysqli->set_charset('utf8mb4')) {
    http_response_code(500);
    error_log("Charset error: " . $mysqli->error);
    die(json_encode([
        'success' => false,
        'message' => 'Error setting charset: ' . ($mysqli->error ?: 'Unknown error')
    ]));
}

// Enable CORS for this application
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Session configuration for Hostinger
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.gc_maxlifetime', 3600 * 24 * 7);
    session_start();
}

/**
 * Helper function to set session data
 */
function setSession($key, $value) {
    $_SESSION[$key] = $value;
}

/**
 * Helper function to get session data
 */
function getSession($key, $default = null) {
    return isset($_SESSION[$key]) ? $_SESSION[$key] : $default;
}

/**
 * Helper function to unset session data
 */
function unsetSession($key) {
    if (isset($_SESSION[$key])) {
        unset($_SESSION[$key]);
    }
}

/**
 * Helper function to validate user input
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        $sanitized = [];
        foreach ($input as $key => $value) {
            $sanitized[$key] = sanitizeInput($value);
        }
        return $sanitized;
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Helper function to validate email
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Helper function to check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Helper function to get current user ID
 */
function getCurrentUserId() {
    return getSession('user_id');
}

/**
 * Helper function to get current username
 */
function getCurrentUsername() {
    return getSession('username');
}

/**
 * Helper function to return JSON response
 */
function jsonResponse($success = true, $message = '', $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    return json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
}

/**
 * Helper function for logging
 */
function logActivity($user_id, $action, $description = '') {
    global $mysqli;
    $timestamp = date('Y-m-d H:i:s');
    $ip_address = $_SERVER['REMOTE_ADDR'];
    // You can store logs in a separate table if needed
}

/**
 * Helper function to check if user has permission to edit note
 */
function canEditNote($note_id, $user_id) {
    global $mysqli;
    
    $stmt = $mysqli->prepare("
        SELECT id FROM notes WHERE id = ? AND (user_id = ? OR id IN (
            SELECT note_id FROM collaborators WHERE user_id = ? AND permission_level IN ('edit', 'admin')
        ))
    ");
    
    $stmt->bind_param('iii', $note_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->num_rows > 0;
}

/**
 * Helper function to check if user can view note
 */
function canViewNote($note_id, $user_id) {
    global $mysqli;
    
    $stmt = $mysqli->prepare("
        SELECT id FROM notes WHERE id = ? AND (user_id = ? OR id IN (
            SELECT note_id FROM collaborators WHERE user_id = ?
        ))
    ");
    
    $stmt->bind_param('iii', $note_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->num_rows > 0;
}

?>
