<?php
/**
 * Labels API - Handles label/tag management for notes
 * File: api/labels.php
 */

require_once dirname(dirname(__FILE__)) . '/config.php';

// Check if user is logged in
if (!isLoggedIn()) {
    http_response_code(401);
    die(jsonResponse(false, 'Unauthorized. Please log in.', null, 401));
}

$request_method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : '';
$user_id = getCurrentUserId();

switch ($request_method) {
    case 'GET':
        if ($action === 'list') {
            getLabels($user_id);
        } elseif ($action === 'get') {
            getLabel($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'POST':
        if ($action === 'create') {
            createLabel($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'PUT':
        if ($action === 'update') {
            updateLabel($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'DELETE':
        if ($action === 'delete') {
            deleteLabel($user_id);
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
 * Get all labels for the user
 */
function getLabels($user_id) {
    global $mysqli;
    
    $stmt = $mysqli->prepare("
        SELECT l.id, l.name, l.color, COUNT(nl.id) as note_count
        FROM labels l
        LEFT JOIN note_labels nl ON l.id = nl.label_id
        WHERE l.user_id = ?
        GROUP BY l.id
        ORDER BY l.name ASC
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $labels = [];
    while ($row = $result->fetch_assoc()) {
        $labels[] = $row;
    }
    
    $stmt->close();
    die(jsonResponse(true, 'Labels retrieved successfully', $labels));
}

/**
 * Get single label by ID
 */
function getLabel($user_id) {
    global $mysqli;
    
    $label_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if (!$label_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Label ID is required'));
    }
    
    $stmt = $mysqli->prepare("
        SELECT id, name, color, user_id
        FROM labels
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ii', $label_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $label = $result->fetch_assoc();
    
    $stmt->close();
    
    if (!$label) {
        http_response_code(404);
        die(jsonResponse(false, 'Label not found'));
    }
    
    die(jsonResponse(true, 'Label retrieved successfully', $label));
}

/**
 * Create a new label
 */
function createLabel($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $name = isset($input['name']) ? sanitizeInput($input['name']) : '';
    $color = isset($input['color']) ? sanitizeInput($input['color']) : '#999999';
    
    if (strlen($name) < 1) {
        http_response_code(400);
        die(jsonResponse(false, 'Label name is required'));
    }
    
    if (strlen($name) > 100) {
        http_response_code(400);
        die(jsonResponse(false, 'Label name must not exceed 100 characters'));
    }
    
    // Validate color format
    if (!preg_match('/^#[0-9A-F]{6}$/i', $color)) {
        $color = '#999999';
    }
    
    // Check if label already exists for this user
    $check_stmt = $mysqli->prepare("
        SELECT id FROM labels WHERE user_id = ? AND LOWER(name) = LOWER(?)
    ");
    
    if (!$check_stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $check_stmt->bind_param('is', $user_id, $name);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if ($check_result->num_rows > 0) {
        http_response_code(400);
        $check_stmt->close();
        die(jsonResponse(false, 'Label already exists'));
    }
    
    $check_stmt->close();
    
    $stmt = $mysqli->prepare("
        INSERT INTO labels (user_id, name, color)
        VALUES (?, ?, ?)
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('iss', $user_id, $name, $color);
    
    if ($stmt->execute()) {
        $label_id = $stmt->insert_id;
        $stmt->close();
        die(jsonResponse(true, 'Label created successfully', ['id' => $label_id]));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to create label: ' . $mysqli->error));
    }
}

/**
 * Update a label
 */
function updateLabel($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $label_id = isset($input['id']) ? intval($input['id']) : 0;
    $name = isset($input['name']) ? sanitizeInput($input['name']) : '';
    $color = isset($input['color']) ? sanitizeInput($input['color']) : '#999999';
    
    if (!$label_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Label ID is required'));
    }
    
    if (strlen($name) < 1) {
        http_response_code(400);
        die(jsonResponse(false, 'Label name is required'));
    }
    
    // Verify user owns the label
    $verify_stmt = $mysqli->prepare("SELECT user_id FROM labels WHERE id = ?");
    $verify_stmt->bind_param('i', $label_id);
    $verify_stmt->execute();
    $verify_result = $verify_stmt->get_result();
    $label = $verify_result->fetch_assoc();
    $verify_stmt->close();
    
    if (!$label || $label['user_id'] != $user_id) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to edit this label'));
    }
    
    // Validate color
    if (!preg_match('/^#[0-9A-F]{6}$/i', $color)) {
        $color = '#999999';
    }
    
    $stmt = $mysqli->prepare("
        UPDATE labels 
        SET name = ?, color = ?
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ssii', $name, $color, $label_id, $user_id);
    
    if ($stmt->execute()) {
        $stmt->close();
        die(jsonResponse(true, 'Label updated successfully', ['id' => $label_id]));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to update label: ' . $mysqli->error));
    }
}

/**
 * Delete a label
 */
function deleteLabel($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $label_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$label_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Label ID is required'));
    }
    
    // Verify user owns the label
    $verify_stmt = $mysqli->prepare("SELECT user_id FROM labels WHERE id = ?");
    $verify_stmt->bind_param('i', $label_id);
    $verify_stmt->execute();
    $verify_result = $verify_stmt->get_result();
    $label = $verify_result->fetch_assoc();
    $verify_stmt->close();
    
    if (!$label || $label['user_id'] != $user_id) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to delete this label'));
    }
    
    // Begin transaction
    $mysqli->begin_transaction();
    
    try {
        // Delete label associations
        $assoc_stmt = $mysqli->prepare("DELETE FROM note_labels WHERE label_id = ?");
        $assoc_stmt->bind_param('i', $label_id);
        $assoc_stmt->execute();
        $assoc_stmt->close();
        
        // Delete label
        $delete_stmt = $mysqli->prepare("DELETE FROM labels WHERE id = ?");
        $delete_stmt->bind_param('i', $label_id);
        $delete_stmt->execute();
        $delete_stmt->close();
        
        $mysqli->commit();
        die(jsonResponse(true, 'Label deleted successfully'));
    } catch (Exception $e) {
        $mysqli->rollback();
        http_response_code(500);
        die(jsonResponse(false, 'Failed to delete label: ' . $e->getMessage()));
    }
}

?>
