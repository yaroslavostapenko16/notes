<?php
/**
 * Notes API - Handles all note operations (CRUD)
 * File: api/notes.php
 */

require_once dirname(dirname(__FILE__)) . '/config.php';

// Get request method
$request_method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : '';

// Check if user is logged in
if (!isLoggedIn()) {
    http_response_code(401);
    die(jsonResponse(false, 'Unauthorized. Please log in.', null, 401));
}

$user_id = getCurrentUserId();

switch ($request_method) {
    case 'GET':
        if ($action === 'list') {
            getAllNotes($user_id);
        } elseif ($action === 'get') {
            getNote($user_id);
        } elseif ($action === 'search') {
            searchNotes($user_id);
        } elseif ($action === 'get_all') {
            getAllNotesForExport($user_id);
        } elseif ($action === 'analytics') {
            getAnalytics($user_id);
        } elseif ($action === 'statistics') {
            getNoteStatisticsByPeriod($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'POST':
        if ($action === 'create') {
            createNote($user_id);
        } elseif ($action === 'restore_multiple') {
            restoreMultipleNotes($user_id);
        } elseif ($action === 'archive_multiple') {
            archiveMultipleNotes($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'PUT':
        if ($action === 'update') {
            updateNote($user_id);
        } elseif ($action === 'toggle_pin') {
            togglePin($user_id);
        } elseif ($action === 'toggle_archive') {
            toggleArchive($user_id);
        } else {
            http_response_code(400);
            die(jsonResponse(false, 'Invalid action'));
        }
        break;

    case 'DELETE':
        if ($action === 'delete') {
            deleteNote($user_id);
        } elseif ($action === 'restore') {
            restoreNote($user_id);
        } elseif ($action === 'permanent_delete') {
            permanentDeleteNote($user_id);
        } elseif ($action === 'delete_multiple') {
            deleteMultipleNotes($user_id);
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
 * Get all notes for the user (excluding deleted)
 */
function getAllNotes($user_id) {
    global $mysqli;
    
    $sort_by = isset($_GET['sort']) ? sanitizeInput($_GET['sort']) : 'updated_at';
    $valid_sorts = ['updated_at', 'created_at', 'title'];
    $sort_by = in_array($sort_by, $valid_sorts) ? $sort_by : 'updated_at';
    
    $include_archived = isset($_GET['archived']) ? intval($_GET['archived']) : 0;
    $only_pinned = isset($_GET['pinned']) ? intval($_GET['pinned']) : 0;
    
    $query = "SELECT id, title, content, color, is_pinned, is_archived, created_at, updated_at, image_url, reminder_date, tags 
              FROM notes 
              WHERE user_id = ? AND is_deleted = FALSE";
    
    if (!$include_archived) {
        $query .= " AND is_archived = FALSE";
    }
    
    if ($only_pinned) {
        $query .= " AND is_pinned = TRUE";
    }
    
    $query .= " ORDER BY is_pinned DESC, " . $sort_by . " DESC LIMIT 1000";
    
    $stmt = $mysqli->prepare($query);
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notes = [];
    while ($row = $result->fetch_assoc()) {
        $notes[] = $row;
    }
    
    $stmt->close();
    die(jsonResponse(true, 'Notes retrieved successfully', $notes));
}

/**
 * Get single note by ID
 */
function getNote($user_id) {
    global $mysqli;
    
    $note_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    if (!canViewNote($note_id, $user_id)) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to view this note'));
    }
    
    $stmt = $mysqli->prepare("
        SELECT id, title, content, color, is_pinned, is_archived, created_at, updated_at, image_url, reminder_date, tags
        FROM notes 
        WHERE id = ? AND is_deleted = FALSE
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('i', $note_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $note = $result->fetch_assoc();
    
    $stmt->close();
    
    if (!$note) {
        http_response_code(404);
        die(jsonResponse(false, 'Note not found'));
    }
    
    die(jsonResponse(true, 'Note retrieved successfully', $note));
}

/**
 * Create a new note
 */
function createNote($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $title = isset($input['title']) ? sanitizeInput($input['title']) : '';
    $content = isset($input['content']) ? sanitizeInput($input['content']) : '';
    $color = isset($input['color']) ? sanitizeInput($input['color']) : '#FFFFFF';
    $tags = isset($input['tags']) ? sanitizeInput($input['tags']) : '';
    
    // Validate color format (basic hex color validation)
    if (!preg_match('/^#[0-9A-F]{6}$/i', $color)) {
        $color = '#FFFFFF';
    }
    
    $stmt = $mysqli->prepare("
        INSERT INTO notes (user_id, title, content, color, tags)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('issss', $user_id, $title, $content, $color, $tags);
    
    if ($stmt->execute()) {
        $note_id = $stmt->insert_id;
        
        // Log to history
        logNoteHistory($note_id, $user_id, $content, $title, 'created');
        
        $stmt->close();
        die(jsonResponse(true, 'Note created successfully', ['id' => $note_id]));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to create note: ' . $mysqli->error));
    }
}

/**
 * Update a note
 */
function updateNote($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    $title = isset($input['title']) ? sanitizeInput($input['title']) : '';
    $content = isset($input['content']) ? sanitizeInput($input['content']) : '';
    $color = isset($input['color']) ? sanitizeInput($input['color']) : '#FFFFFF';
    $tags = isset($input['tags']) ? sanitizeInput($input['tags']) : '';
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    if (!canEditNote($note_id, $user_id)) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to edit this note'));
    }
    
    // Validate color
    if (!preg_match('/^#[0-9A-F]{6}$/i', $color)) {
        $color = '#FFFFFF';
    }
    
    $stmt = $mysqli->prepare("
        UPDATE notes 
        SET title = ?, content = ?, color = ?, tags = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('sssisi', $title, $content, $color, $tags, $note_id, $user_id);
    
    if ($stmt->execute()) {
        logNoteHistory($note_id, $user_id, $content, $title, 'updated');
        $stmt->close();
        die(jsonResponse(true, 'Note updated successfully', ['id' => $note_id]));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to update note: ' . $mysqli->error));
    }
}

/**
 * Toggle note pin status
 */
function togglePin($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    if (!canEditNote($note_id, $user_id)) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to edit this note'));
    }
    
    $stmt = $mysqli->prepare("
        UPDATE notes 
        SET is_pinned = IF(is_pinned = 1, 0, 1), updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ii', $note_id, $user_id);
    
    if ($stmt->execute()) {
        $stmt->close();
        die(jsonResponse(true, 'Note pin status updated'));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to update note: ' . $mysqli->error));
    }
}

/**
 * Toggle note archive status
 */
function toggleArchive($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    if (!canEditNote($note_id, $user_id)) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to edit this note'));
    }
    
    $stmt = $mysqli->prepare("
        UPDATE notes 
        SET is_archived = IF(is_archived = 1, 0, 1), updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ii', $note_id, $user_id);
    
    if ($stmt->execute()) {
        $stmt->close();
        die(jsonResponse(true, 'Note archive status updated'));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to update note: ' . $mysqli->error));
    }
}

/**
 * Soft delete note
 */
function deleteNote($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    if (!canEditNote($note_id, $user_id)) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to delete this note'));
    }
    
    $stmt = $mysqli->prepare("
        UPDATE notes 
        SET is_deleted = TRUE, updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ii', $note_id, $user_id);
    
    if ($stmt->execute()) {
        logNoteHistory($note_id, $user_id, '', '', 'deleted');
        $stmt->close();
        die(jsonResponse(true, 'Note deleted successfully'));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to delete note: ' . $mysqli->error));
    }
}

/**
 * Restore deleted note
 */
function restoreNote($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    $stmt = $mysqli->prepare("
        UPDATE notes 
        SET is_deleted = FALSE, updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('ii', $note_id, $user_id);
    
    if ($stmt->execute()) {
        logNoteHistory($note_id, $user_id, '', '', 'restored');
        $stmt->close();
        die(jsonResponse(true, 'Note restored successfully'));
    } else {
        http_response_code(500);
        $stmt->close();
        die(jsonResponse(false, 'Failed to restore note: ' . $mysqli->error));
    }
}

/**
 * Permanently delete note from database
 */
function permanentDeleteNote($user_id) {
    global $mysqli;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $note_id = isset($input['id']) ? intval($input['id']) : 0;
    
    if (!$note_id) {
        http_response_code(400);
        die(jsonResponse(false, 'Note ID is required'));
    }
    
    // Verify user owns the note
    $check_stmt = $mysqli->prepare("SELECT user_id FROM notes WHERE id = ?");
    $check_stmt->bind_param('i', $note_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    $note = $result->fetch_assoc();
    $check_stmt->close();
    
    if (!$note || $note['user_id'] != $user_id) {
        http_response_code(403);
        die(jsonResponse(false, 'You do not have permission to delete this note'));
    }
    
    // Begin transaction
    $mysqli->begin_transaction();
    
    try {
        // Delete note history
        $history_stmt = $mysqli->prepare("DELETE FROM note_history WHERE note_id = ?");
        $history_stmt->bind_param('i', $note_id);
        $history_stmt->execute();
        $history_stmt->close();
        
        // Delete note labels
        $labels_stmt = $mysqli->prepare("DELETE FROM note_labels WHERE note_id = ?");
        $labels_stmt->bind_param('i', $note_id);
        $labels_stmt->execute();
        $labels_stmt->close();
        
        // Delete collaborators
        $collab_stmt = $mysqli->prepare("DELETE FROM collaborators WHERE note_id = ?");
        $collab_stmt->bind_param('i', $note_id);
        $collab_stmt->execute();
        $collab_stmt->close();
        
        // Delete note
        $delete_stmt = $mysqli->prepare("DELETE FROM notes WHERE id = ?");
        $delete_stmt->bind_param('i', $note_id);
        $delete_stmt->execute();
        $delete_stmt->close();
        
        $mysqli->commit();
        die(jsonResponse(true, 'Note permanently deleted'));
    } catch (Exception $e) {
        $mysqli->rollback();
        http_response_code(500);
        die(jsonResponse(false, 'Failed to delete note: ' . $e->getMessage()));
    }
}

/**
 * Search notes
 */
function searchNotes($user_id) {
    global $mysqli;
    
    $query = isset($_GET['q']) ? sanitizeInput($_GET['q']) : '';
    
    if (strlen($query) < 2) {
        http_response_code(400);
        die(jsonResponse(false, 'Search query must be at least 2 characters'));
    }
    
    $search_term = '%' . $query . '%';
    
    $stmt = $mysqli->prepare("
        SELECT id, title, content, color, is_pinned, is_archived, created_at, updated_at, image_url, reminder_date, tags
        FROM notes 
        WHERE user_id = ? AND is_deleted = FALSE AND (
            title LIKE ? OR 
            content LIKE ? OR 
            tags LIKE ?
        )
        ORDER BY updated_at DESC
        LIMIT 100
    ");
    
    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }
    
    $stmt->bind_param('isss', $user_id, $search_term, $search_term, $search_term);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notes = [];
    while ($row = $result->fetch_assoc()) {
        $notes[] = $row;
    }
    
    $stmt->close();
    die(jsonResponse(true, 'Search completed', $notes));
}

/**
 * Log note history for undo functionality
 */
function logNoteHistory($note_id, $user_id, $content, $title, $action) {
    global $mysqli;
    
    $stmt = $mysqli->prepare("
        INSERT INTO note_history (note_id, user_id, content, title, action)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    if ($stmt) {
        $stmt->bind_param('iisss', $note_id, $user_id, $content, $title, $action);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Get analytics data for user's notes
 */
function getAnalytics($user_id) {
    global $mysqli;

    $stmt = $mysqli->prepare("
        SELECT 
            COUNT(*) as total_notes,
            SUM(CASE WHEN is_pinned = 1 THEN 1 ELSE 0 END) as pinned_notes,
            SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived_notes,
            SUM(CHAR_LENGTH(content)) as total_characters,
            SUM(CHAR_LENGTH(content) - CHAR_LENGTH(REPLACE(content, ' ', '')) + 1) as total_words,
            MAX(updated_at) as last_modified,
            color
        FROM notes
        WHERE user_id = ? AND is_deleted = 0
        GROUP BY color
    ");

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $analytics = [
        'total_notes' => 0,
        'pinned_notes' => 0,
        'archived_notes' => 0,
        'total_characters' => 0,
        'total_words' => 0,
        'last_modified' => null,
        'color_distribution' => []
    ];

    while ($row = $result->fetch_assoc()) {
        $analytics['total_notes'] += $row['total_notes'];
        $analytics['pinned_notes'] += $row['pinned_notes'] ?? 0;
        $analytics['archived_notes'] += $row['archived_notes'] ?? 0;
        $analytics['total_characters'] += $row['total_characters'] ?? 0;
        $analytics['total_words'] += $row['total_words'] ?? 0;
        if ($row['last_modified']) {
            $analytics['last_modified'] = $row['last_modified'];
        }
        
        if ($row['color']) {
            $analytics['color_distribution'][$row['color']] = $row['total_notes'];
        }
    }

    $stmt->close();
    jsonResponse(true, 'Analytics retrieved successfully', $analytics);
}

/**
 * Get all notes including deleted (for use in exports)
 */
function getAllNotesForExport($user_id) {
    global $mysqli;

    $stmt = $mysqli->prepare("
        SELECT id, title, content, color, is_pinned, is_archived, created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");

    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $notes = [];

    while ($note = $result->fetch_assoc()) {
        $notes[] = [
            'id' => $note['id'],
            'title' => $note['title'],
            'content' => $note['content'],
            'color' => $note['color'],
            'is_pinned' => (bool)$note['is_pinned'],
            'is_archived' => (bool)$note['is_archived'],
            'created_at' => $note['created_at'],
            'updated_at' => $note['updated_at']
        ];
    }

    $stmt->close();
    jsonResponse(true, 'Notes retrieved for export', $notes);
}

/**
 * Restore multiple notes at once
 */
function restoreMultipleNotes($user_id) {
    global $mysqli;

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['note_ids']) || !is_array($input['note_ids'])) {
        http_response_code(400);
        die(jsonResponse(false, 'Invalid note IDs'));
    }

    $note_ids = $input['note_ids'];
    $success_count = 0;

    foreach ($note_ids as $note_id) {
        $stmt = $mysqli->prepare("
            UPDATE notes 
            SET is_deleted = 0, updated_at = NOW()
            WHERE id = ? AND user_id = ? AND is_deleted = 1
        ");

        if ($stmt) {
            $stmt->bind_param('ii', $note_id, $user_id);
            if ($stmt->execute() && $stmt->affected_rows > 0) {
                $success_count++;
            }
            $stmt->close();
        }
    }

    if ($success_count > 0) {
        jsonResponse(true, $success_count . ' note(s) restored successfully');
    } else {
        http_response_code(400);
        die(jsonResponse(false, 'No notes were restored'));
    }
}

/**
 * Delete multiple notes permanently
 */
function deleteMultipleNotes($user_id) {
    global $mysqli;

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['note_ids']) || !is_array($input['note_ids'])) {
        http_response_code(400);
        die(jsonResponse(false, 'Invalid note IDs'));
    }

    $note_ids = $input['note_ids'];
    $success_count = 0;

    foreach ($note_ids as $note_id) {
        $stmt = $mysqli->prepare("
            DELETE FROM notes 
            WHERE id = ? AND user_id = ? AND is_deleted = 1
        ");

        if ($stmt) {
            $stmt->bind_param('ii', $note_id, $user_id);
            if ($stmt->execute() && $stmt->affected_rows > 0) {
                $success_count++;
            }
            $stmt->close();
        }
    }

    if ($success_count > 0) {
        jsonResponse(true, $success_count . ' note(s) permanently deleted');
    } else {
        http_response_code(400);
        die(jsonResponse(false, 'No notes were deleted'));
    }
}

/**
 * Archive multiple notes at once
 */
function archiveMultipleNotes($user_id) {
    global $mysqli;

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['note_ids']) || !is_array($input['note_ids'])) {
        http_response_code(400);
        die(jsonResponse(false, 'Invalid note IDs'));
    }

    $note_ids = $input['note_ids'];
    $success_count = 0;

    foreach ($note_ids as $note_id) {
        $stmt = $mysqli->prepare("
            UPDATE notes 
            SET is_archived = 1, updated_at = NOW()
            WHERE id = ? AND user_id = ? AND is_deleted = 0
        ");

        if ($stmt) {
            $stmt->bind_param('ii', $note_id, $user_id);
            if ($stmt->execute() && $stmt->affected_rows > 0) {
                $success_count++;
            }
            $stmt->close();
        }
    }

    if ($success_count > 0) {
        jsonResponse(true, $success_count . ' note(s) archived');
    } else {
        http_response_code(400);
        die(jsonResponse(false, 'No notes were archived'));
    }
}

/**
 * Get notes statistics by time period
 */
function getNoteStatisticsByPeriod($user_id) {
    global $mysqli;

    $stmt = $mysqli->prepare("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(CHAR_LENGTH(content)) as characters
        FROM notes
        WHERE user_id = ? AND is_deleted = 0
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
    ");

    if (!$stmt) {
        http_response_code(500);
        die(jsonResponse(false, 'Database error: ' . $mysqli->error));
    }

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $stats = [];

    while ($row = $result->fetch_assoc()) {
        $stats[] = $row;
    }

    $stmt->close();
    jsonResponse(true, 'Statistics retrieved successfully', $stats);
}

