<?php
/**
 * Authentication API
 * File: api/auth.php
 * Handles user login, registration, and logout
 */

require_once dirname(dirname(__FILE__)) . '/config.php';

$request_method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : '';

switch ($request_method) {
    case 'POST':
        if ($action === 'register') {
            registerUser();
        } elseif ($action === 'login') {
            loginUser();
        } elseif ($action === 'logout') {
            logoutUser();
        } elseif ($action === 'change_password') {
            changePassword();
        } elseif ($action === 'delete_account') {
            deleteAccount();
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'GET':
        if ($action === 'check_session') {
            checkSession();
        } elseif ($action === 'get_user') {
            getUser();
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    default:
        http_response_code(405);
        die(jsonResponse(false, 'Method Not Allowed'));
}

/**
 * Register new user
 */
function registerUser() {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    // Get input and sanitize
    $username = isset($input['username']) ? sanitizeInput($input['username']) : '';
    $email = isset($input['email']) ? sanitizeInput($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $password_confirm = isset($input['password_confirm']) ? $input['password_confirm'] : '';
    
    // Validate input
    if (strlen($username) < 3) {
        http_response_code(400);
        die(jsonResponse(false, 'Username must be at least 3 characters long'));
    }
    
    if (strlen($username) > 50) {
        http_response_code(400);
        die(jsonResponse(false, 'Username must not exceed 50 characters'));
    }
    
    if (!validateEmail($email)) {
        http_response_code(400);
        die(jsonResponse(false, 'Invalid email address'));
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        die(jsonResponse(false, 'Password must be at least 6 characters long'));
    }
    
    if ($password !== $password_confirm) {
        http_response_code(400);
        die(jsonResponse(false, 'Passwords do not match'));
    }
    
    // Check if username already exists
    $check_stmt = $mysqli->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    if (!$check_stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $check_stmt->bind_param('ss', $username, $email);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if ($check_result->num_rows > 0) {
        http_response_code(400);
        $check_stmt->close();
        die(jsonResponse(false, 'Username or email already exists'));
    }
    
    $check_stmt->close();
    
    // Hash password using SHA2 algorithm
    $password_hash = hash('sha256', $password);
    
    // Insert new user
    $insert_stmt = $mysqli->prepare("
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
    ");
    
    if (!$insert_stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $insert_stmt->bind_param('sss', $username, $email, $password_hash);
    
    if ($insert_stmt->execute()) {
        $user_id = $insert_stmt->insert_id;
        $insert_stmt->close();
        
        // Create sample notes for new user
        createSampleNotes($user_id);
        
        http_response_code(201);
        die(jsonResponse(true, 'User registered successfully. Please log in.', ['user_id' => $user_id]));
    } else {
        http_response_code(500);
        $insert_stmt->close();
        die(jsonResponse(false, 'Failed to register user: ' . $mysqli->error));
    }
}

/**
 * Login user
 */
function loginUser() {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $username_or_email = isset($input['username']) ? sanitizeInput($input['username']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    // Validate input
    if (empty($username_or_email) || empty($password)) {
        http_response_code(400);
        die(jsonResponse(false, 'Username and password are required'));
    }
    
    // Fetch user by username or email
    $select_stmt = $mysqli->prepare("
        SELECT id, username, email, password 
        FROM users 
        WHERE username = ? OR email = ?
    ");
    
    if (!$select_stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $select_stmt->bind_param('ss', $username_or_email, $username_or_email);
    $select_stmt->execute();
    $result = $select_stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(401);
        $select_stmt->close();
        die(jsonResponse(false, 'Invalid username or password'));
    }
    
    $user = $result->fetch_assoc();
    $select_stmt->close();
    
    // Verify password
    $password_hash = hash('sha256', $password);
    
    if ($user['password'] !== $password_hash) {
        http_response_code(401);
        die(jsonResponse(false, 'Invalid username or password'));
    }
    
    // Set session
    setSession('user_id', $user['id']);
    setSession('username', $user['username']);
    setSession('email', $user['email']);
    setSession('login_time', time());
    
    die(jsonResponse(true, 'Login successful', [
        'user_id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email']
    ]));
}

/**
 * Logout user
 */
function logoutUser() {
    // Clear session data
    unsetSession('user_id');
    unsetSession('username');
    unsetSession('email');
    unsetSession('login_time');
    
    // Destroy session
    session_destroy();
    
    die(jsonResponse(true, 'Logged out successfully'));
}

/**
 * Check if user session is valid
 */
function checkSession() {
    if (isLoggedIn()) {
        die(jsonResponse(true, 'Session is valid', [
            'user_id' => getCurrentUserId(),
            'username' => getCurrentUsername()
        ]));
    } else {
        http_response_code(401);
        die(jsonResponse(false, 'Session expired or not logged in'));
    }
}

/**
 * Get current logged-in user info
 */
function getUser() {
    global $mysqli;
    
    if (!isLoggedIn()) {
        http_response_code(401);
        die(jsonResponse(false, 'Not logged in'));
    }
    
    $user_id = getCurrentUserId();
    
    $stmt = $mysqli->prepare("
        SELECT id, username, email, created_at 
        FROM users 
        WHERE id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!$user) {
        http_response_code(404);
        die(jsonResponse(false, 'User not found'));
    }
    
    // Get note counts
    $count_stmt = $mysqli->prepare("
        SELECT 
            SUM(CASE WHEN is_deleted = FALSE AND is_archived = FALSE THEN 1 ELSE 0 END) as active_notes,
            SUM(CASE WHEN is_deleted = FALSE AND is_archived = TRUE THEN 1 ELSE 0 END) as archived_notes,
            SUM(CASE WHEN is_deleted = TRUE THEN 1 ELSE 0 END) as deleted_notes
        FROM notes 
        WHERE user_id = ?
    ");
    
    $count_stmt->bind_param('i', $user_id);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $counts = $count_result->fetch_assoc();
    $count_stmt->close();
    
    $user['note_counts'] = [
        'active' => intval($counts['active_notes'] ?? 0),
        'archived' => intval($counts['archived_notes'] ?? 0),
        'deleted' => intval($counts['deleted_notes'] ?? 0)
    ];
    
    die(jsonResponse(true, 'User information retrieved', $user));
}

/**
 * Create sample notes for new user
 */
function createSampleNotes($user_id) {
    global $mysqli;
    
    $sample_notes = [
        [
            'title' => 'Welcome to Notes App',
            'content' => 'Welcome! This is your first note. You can:\n- Create new notes by clicking the "+" button\n- Edit any note by clicking on it\n- Pin important notes to keep them at the top\n- Archive notes you don\'t need right now\n- Delete notes you want to remove\n- Search for notes using keywords',
            'color' => '#FFE082',
            'is_pinned' => 1
        ],
        [
            'title' => 'Features',
            'content' => '✓ Quick note creation\n✓ Color-coded notes\n✓ Pin important notes\n✓ Archive old notes\n✓ Full-text search\n✓ Auto-save functionality\n✓ Responsive design\n✓ Dark mode support',
            'color' => '#C5E1A5',
            'is_pinned' => 0
        ],
        [
            'title' => 'Getting Started',
            'content' => '1. Click the create button to start\n2. Type your note title and content\n3. Choose a color that suits you\n4. Your note is saved automatically\n5. Share or collaborate with others\n6. Use tags to organize better',
            'color' => '#FFCCBC',
            'is_pinned' => 0
        ]
    ];
    
    $stmt = $mysqli->prepare("
        INSERT INTO notes (user_id, title, content, color, is_pinned)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    foreach ($sample_notes as $note) {
        $stmt->bind_param('isssi', 
            $user_id, 
            $note['title'], 
            $note['content'], 
            $note['color'], 
            $note['is_pinned']
        );
        $stmt->execute();
    }
    
    $stmt->close();
}

/**
 * Change user password
 */
function changePassword() {
    global $mysqli;
    
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(jsonResponse(false, 'Unauthorized'));
    }

    $current_password = isset($_POST['current_password']) ? $_POST['current_password'] : '';
    $new_password = isset($_POST['new_password']) ? $_POST['new_password'] : '';

    if (empty($current_password) || empty($new_password)) {
        http_response_code(400);
        die(jsonResponse(false, 'Missing required fields'));
    }

    if (strlen($new_password) < 6) {
        http_response_code(400);
        die(jsonResponse(false, 'Password must be at least 6 characters'));
    }

    $user_id = $_SESSION['user_id'];

    // Verify current password
    $stmt = $mysqli->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        die(jsonResponse(false, 'User not found'));
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    if (!password_verify($current_password, $user['password'])) {
        http_response_code(401);
        die(jsonResponse(false, 'Current password is incorrect'));
    }

    // Update password
    $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $mysqli->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->bind_param('si', $hashed_password, $user_id);

    if ($stmt->execute()) {
        $stmt->close();
        jsonResponse(true, 'Password changed successfully');
    } else {
        $stmt->close();
        http_response_code(500);
        die(jsonResponse(false, 'Failed to change password'));
    }
}

/**
 * Delete user account and all associated data
 */
function deleteAccount() {
    global $mysqli;

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(jsonResponse(false, 'Unauthorized'));
    }

    $user_id = $_SESSION['user_id'];

    // Start transaction
    $mysqli->begin_transaction();

    try {
        // Delete all notes for the user
        $stmt = $mysqli->prepare("DELETE FROM notes WHERE user_id = ?");
        $stmt->bind_param('i', $user_id);
        if (!$stmt->execute()) {
            throw new Exception('Failed to delete notes');
        }
        $stmt->close();

        // Delete user record
        $stmt = $mysqli->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param('i', $user_id);
        if (!$stmt->execute()) {
            throw new Exception('Failed to delete user');
        }
        $stmt->close();

        // Commit transaction
        $mysqli->commit();

        // Destroy session
        session_destroy();

        jsonResponse(true, 'Account deleted successfully');
    } catch (Exception $e) {
        // Rollback transaction
        $mysqli->rollback();
        http_response_code(500);
        die(jsonResponse(false, 'Failed to delete account: ' . $e->getMessage()));
    }
}

