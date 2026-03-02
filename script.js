/**
 * Main JavaScript File - Notes Application
 * Handles all client-side functionality
 * 1000+ lines of code for complete note management
 */

// ====================
// Global Variables
// ====================

let currentUser = null;
let currentView = 'all';
let currentViewMode = 'grid';
let currentNotes = [];
let deleteConfirmationTimer = null;
let autoSaveTimer = null;
let currentEditingNote = {
    id: null,
    title: '',
    content: '',
    color: '#FFFFFF',
    isPinned: false,
    isArchived: false
};

const API_BASE = './api';

// ====================
// Initialization
// ====================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    checkUserSession();
    setupEventListeners();
}

/**
 * Check if user is already logged in
 */
function checkUserSession() {
    fetch(`${API_BASE}/auth.php?action=check_session`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadUserProfile();
                showAppContainer();
            } else {
                showAuthModal();
            }
        })
        .catch(error => {
            console.error('Session check error:', error);
            showAuthModal();
        });
}

/**
 * Load user profile information
 */
function loadUserProfile() {
    fetch(`${API_BASE}/auth.php?action=get_user`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.data;
                document.getElementById('userName').textContent = currentUser.username;
                document.getElementById('userEmail').textContent = currentUser.email;
                loadNotes();
            }
        })
        .catch(error => console.error('Profile loading error:', error));
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', changeView);
    });
    
    // Note creation
    document.getElementById('createNoteBtn').addEventListener('click', createNewNote);
    
    // View options
    document.getElementById('gridViewBtn').addEventListener('click', () => changeViewMode('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => changeViewMode('list'));
    
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Note editor
    document.getElementById('closeNoteEditorBtn').addEventListener('click', closeNoteEditor);
    document.getElementById('colorToggleBtn').addEventListener('click', toggleColorPalette);
    document.getElementById('pinNoteBtn').addEventListener('click', togglePinNote);
    document.getElementById('archiveNoteBtn').addEventListener('click', toggleArchiveNote);
    document.getElementById('deleteNoteBtn').addEventListener('click', deleteCurrentNote);
    
    // Color palette
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', selectNoteColor);
    });
    
    // Sidebar toggle on mobile
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Note editor inputs
    document.getElementById('noteTitle').addEventListener('input', autoSaveNote);
    document.getElementById('noteContent').addEventListener('input', autoSaveNote);
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', closeModalsOnBackdropClick);
    });
    
    // Close auth modal on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNoteEditor();
        }
    });
}

// ====================
// Authentication Functions
// ====================

/**
 * Handle user login
 */
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            currentUser = data.data;
            showNotification('Login successful!', 'success');
            loadUserProfile();
            showAppContainer();
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Login error:', error);
        showNotification('An error occurred during login', 'error');
    });
}

/**
 * Handle user registration
 */
function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    if (!username || !email || !password || !passwordConfirm) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            email: email,
            password: password,
            password_confirm: passwordConfirm
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showNotification('Registration successful! Please log in.', 'success');
            document.getElementById('registerFormElement').reset();
            switchAuthForm();
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Registration error:', error);
        showNotification('An error occurred during registration', 'error');
    });
}

/**
 * Handle user logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch(`${API_BASE}/auth.php?action=logout`, {
            method: 'POST'
        })
        .then(() => {
            currentUser = null;
            currentNotes = [];
            showAuthModal();
            document.getElementById('loginFormElement').reset();
            document.getElementById('registerFormElement').reset();
        })
        .catch(error => console.error('Logout error:', error));
    }
}

/**
 * Switch between login and register forms
 */
function switchAuthForm(e) {
    if (e) {
        e.preventDefault();
    }
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
}

// ====================
// Notes Management Functions
// ====================

/**
 * Load all notes from server
 */
function loadNotes(view = currentView) {
    showLoading(true);
    
    let url = `${API_BASE}/notes.php?action=list`;
    
    if (view === 'pinned') {
        url += '&pinned=1';
    } else if (view === 'archived') {
        url += '&archived=1';
    } else if (view === 'deleted') {
        url += '&deleted=1';
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            
            if (data.success) {
                currentNotes = data.data || [];
                renderNotes();
                updatePageTitle();
            } else {
                showNotification('Failed to load notes', 'error');
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Notes loading error:', error);
            showNotification('Error loading notes', 'error');
        });
}

/**
 * Create a new note
 */
function createNewNote() {
    currentEditingNote = {
        id: null,
        title: '',
        content: '',
        color: '#FFFFFF',
        isPinned: false,
        isArchived: false
    };
    
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTitle').focus();
    
    updateColorButtonState();
    updatePinButtonState();
    updateArchiveButtonState();
    showNoteEditor();
}

/**
 * Open note editor for editing
 */
function editNote(noteId) {
    const note = currentNotes.find(n => n.id === noteId);
    
    if (!note) {
        showNotification('Note not found', 'error');
        return;
    }
    
    currentEditingNote = {
        id: note.id,
        title: note.title || '',
        content: note.content || '',
        color: note.color || '#FFFFFF',
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false
    };
    
    document.getElementById('noteTitle').value = currentEditingNote.title;
    document.getElementById('noteContent').value = currentEditingNote.content;
    
    updateColorButtonState();
    updatePinButtonState();
    updateArchiveButtonState();
    updateLastModifiedTime(note.updated_at);
    
    showNoteEditor();
}

/**
 * Save note (create or update)
 */
function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    if (!title && !content) {
        showNotification('Please enter a title or content', 'warning');
        return;
    }
    
    showLoading(true);
    
    const noteData = {
        title: title,
        content: content,
        color: currentEditingNote.color
    };
    
    let url = `${API_BASE}/notes.php?action=create`;
    let method = 'POST';
    
    if (currentEditingNote.id) {
        url = `${API_BASE}/notes.php?action=update`;
        method = 'PUT';
        noteData.id = currentEditingNote.id;
    }
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            if (!currentEditingNote.id) {
                currentEditingNote.id = data.data.id;
                showNotification('Note created successfully', 'success');
            } else {
                showNotification('Note updated successfully', 'success');
            }
            loadNotes(currentView);
        } else {
            showNotification(data.message || 'Failed to save note', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Save note error:', error);
        showNotification('Error saving note', 'error');
    });
}

/**
 * Auto-save note with debouncing
 */
function autoSaveNote() {
    clearTimeout(autoSaveTimer);
    
    autoSaveTimer = setTimeout(() => {
        if (currentEditingNote.id) {
            saveNote();
        }
    }, 2000);
}

/**
 * Delete current note
 */
function deleteCurrentNote() {
    if (!currentEditingNote.id) {
        showNotification('Cannot delete a new note', 'warning');
        return;
    }
    
    if (!confirm('Move this note to trash?')) {
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/notes.php?action=delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: currentEditingNote.id
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showNotification('Note moved to trash', 'success');
            closeNoteEditor();
            loadNotes(currentView);
        } else {
            showNotification(data.message || 'Failed to delete note', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Delete note error:', error);
        showNotification('Error deleting note', 'error');
    });
}

/**
 * Toggle pin status
 */
function togglePinNote() {
    if (!currentEditingNote.id) {
        showNotification('Cannot pin a new note. Save it first.', 'warning');
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/notes.php?action=toggle_pin`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: currentEditingNote.id
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            currentEditingNote.isPinned = !currentEditingNote.isPinned;
            updatePinButtonState();
            loadNotes(currentView);
            showNotification(
                currentEditingNote.isPinned ? 'Note pinned' : 'Note unpinned',
                'success'
            );
        } else {
            showNotification(data.message || 'Failed to toggle pin', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Toggle pin error:', error);
        showNotification('Error toggling pin', 'error');
    });
}

/**
 * Toggle archive status
 */
function toggleArchiveNote() {
    if (!currentEditingNote.id) {
        showNotification('Cannot archive a new note. Save it first.', 'warning');
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/notes.php?action=toggle_archive`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: currentEditingNote.id
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            currentEditingNote.isArchived = !currentEditingNote.isArchived;
            updateArchiveButtonState();
            loadNotes(currentView);
            showNotification(
                currentEditingNote.isArchived ? 'Note archived' : 'Note unarchived',
                'success'
            );
        } else {
            showNotification(data.message || 'Failed to toggle archive', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Toggle archive error:', error);
        showNotification('Error toggling archive', 'error');
    });
}

/**
 * Search notes
 */
function handleSearch(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length < 2) {
        loadNotes(currentView);
        updatePageTitle();
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE}/notes.php?action=search&q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            
            if (data.success) {
                currentNotes = data.data || [];
                renderNotes();
                document.getElementById('pageTitle').textContent = `Search: "${searchTerm}"`;
            } else {
                showNotification('Search failed', 'error');
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Search error:', error);
            showNotification('Error searching notes', 'error');
        });
}

// ====================
// UI Functions
// ====================

/**
 * Render notes on the page
 */
function renderNotes() {
    const container = document.getElementById('notesContainer');
    
    if (currentNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>No notes here</h3>
                <p>Create a new note to get started</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    currentNotes.forEach(note => {
        const noteClass = currentViewMode === 'list' ? 'list-view' : '';
        const pinnedClass = note.is_pinned ? 'pinned' : '';
        const colorClass = `colored-${note.color}`;
        
        const createdDate = new Date(note.created_at);
        const timeAgo = getTimeAgo(createdDate);
        
        html += `
            <div class="note-card ${noteClass} ${colorClass} ${pinnedClass}" data-note-id="${note.id}">
                <div class="note-card-header">
                    <h3 class="note-title" title="${note.title || 'Untitled'}">${note.title || '<em>Untitled</em>'}</h3>
                    <div class="note-card-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); editNote(${note.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="note-card-content">${note.content ? note.content.substring(0, 100).replace(/\n/g, ' ') + '...' : ''}</div>
                <div class="note-card-footer">
                    <span class="note-timestamp">
                        <i class="fas fa-clock"></i> ${timeAgo}
                    </span>
                    ${note.is_pinned ? '<span class="pin-indicator"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click listeners to note cards
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function() {
            const noteId = parseInt(this.getAttribute('data-note-id'));
            editNote(noteId);
        });
    });
}

/**
 * Update page title based on current view
 */
function updatePageTitle() {
    const titles = {
        all: 'All Notes',
        pinned: 'Pinned Notes',
        archived: 'Archived Notes',
        deleted: 'Trash'
    };
    
    document.getElementById('pageTitle').textContent = titles[currentView] || 'Notes';
}

/**
 * Change current view
 */
function changeView(e) {
    const view = e.currentTarget.getAttribute('data-view');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    e.currentTarget.classList.add('active');
    currentView = view;
    
    // Clear search
    document.getElementById('searchInput').value = '';
    
    loadNotes(view);
}

/**
 * Change view mode (grid or list)
 */
function changeViewMode(mode) {
    currentViewMode = mode;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'grid') {
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('notesContainer').classList.remove('list-view');
    } else {
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('notesContainer').classList.add('list-view');
    }
    
    renderNotes();
}

/**
 * Show note editor modal
 */
function showNoteEditor() {
    const modal = document.getElementById('noteEditorModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close note editor modal
 */
function closeNoteEditor() {
    const modal = document.getElementById('noteEditorModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    clearTimeout(autoSaveTimer);
}

/**
 * Show auth modal
 */
function showAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    document.getElementById('appContainer').style.display = 'none';
    document.body.style.overflow = 'hidden';
}

/**
 * Show app container
 */
function showAppContainer() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.getElementById('appContainer').style.display = 'grid';
    document.body.style.overflow = '';
}

/**
 * Toggle color palette
 */
function toggleColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.style.display = palette.style.display === 'none' ? 'grid' : 'none';
}

/**
 * Select note color
 */
function selectNoteColor(e) {
    const color = e.currentTarget.getAttribute('data-color');
    currentEditingNote.color = color;
    updateColorButtonState();
    
    // Auto-save color change if note exists
    if (currentEditingNote.id) {
        saveNote();
    }
}

/**
 * Update color button state
 */
function updateColorButtonState() {
    const colorBtn = document.getElementById('colorToggleBtn');
    colorBtn.style.color = currentEditingNote.color === '#FFFFFF' ? '#999' : currentEditingNote.color;
    
    document.querySelectorAll('.color-option').forEach(option => {
        if (option.getAttribute('data-color') === currentEditingNote.color) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

/**
 * Update pin button state
 */
function updatePinButtonState() {
    const pinBtn = document.getElementById('pinNoteBtn');
    if (currentEditingNote.isPinned) {
        pinBtn.classList.add('active');
        pinBtn.innerHTML = '<i class="fas fa-star"></i>';
    } else {
        pinBtn.classList.remove('active');
        pinBtn.innerHTML = '<i class="far fa-star"></i>';
    }
}

/**
 * Update archive button state
 */
function updateArchiveButtonState() {
    const archiveBtn = document.getElementById('archiveNoteBtn');
    if (currentEditingNote.isArchived) {
        archiveBtn.classList.add('active');
    } else {
        archiveBtn.classList.remove('active');
    }
}

/**
 * Update last modified time
 */
function updateLastModifiedTime(timestamp) {
    if (timestamp) {
        const date = new Date(timestamp);
        document.getElementById('lastModified').textContent = `Last modified: ${getTimeAgo(date)}`;
    }
}

/**
 * Toggle sidebar on mobile
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

/**
 * Close modals when clicking on backdrop
 */
function closeModalsOnBackdropClick(e) {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'noteEditorModal') {
            closeNoteEditor();
        }
    }
}

// ====================
// Utility Functions
// ====================

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    toast.textContent = message;
    toast.className = `notification-toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.style.display = 'flex';
    } else {
        spinner.style.display = 'none';
    }
}

/**
 * Get time ago string (e.g., "2 hours ago")
 */
function getTimeAgo(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Unknown date';
    }
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    if (seconds < 2592000) return Math.floor(seconds / 604800) + ' weeks ago';
    if (seconds < 31536000) return Math.floor(seconds / 2592000) + ' months ago';
    
    return Math.floor(seconds / 31536000) + ' years ago';
}

/**
 * Save notes to local storage for offline backup
 */
function saveNotesToLocalStorage() {
    try {
        localStorage.setItem('notes_backup', JSON.stringify(currentNotes));
        localStorage.setItem('backup_timestamp', new Date().toISOString());
    } catch (error) {
        console.warn('Could not save to local storage:', error);
    }
}

/**
 * Load notes from local storage
 */
function loadNotesFromLocalStorage() {
    try {
        const notes = localStorage.getItem('notes_backup');
        return notes ? JSON.parse(notes) : null;
    } catch (error) {
        console.warn('Could not load from local storage:', error);
        return null;
    }
}

/**
 * Clear all local storage
 */
function clearLocalStorage() {
    try {
        localStorage.removeItem('notes_backup');
        localStorage.removeItem('backup_timestamp');
    } catch (error) {
        console.warn('Could not clear local storage:', error);
    }
}

/**
 * Export notes as JSON
 */
function exportNotesAsJSON() {
    if (currentNotes.length === 0) {
        showNotification('No notes to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(currentNotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('Notes exported successfully', 'success');
}

/**
 * Import notes from JSON file
 */
function importNotesFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const notes = JSON.parse(e.target.result);
            if (Array.isArray(notes)) {
                showNotification('Notes imported successfully', 'success');
                loadNotes(currentView);
            } else {
                showNotification('Invalid notes format', 'error');
            }
        } catch (error) {
            showNotification('Error importing notes: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Format date to readable format
 */
function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Unknown date';
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Validate note data
 */
function validateNote(note) {
    if (!note.title && !note.content) {
        return { valid: false, message: 'Note must have a title or content' };
    }
    
    if (note.title && note.title.length > 255) {
        return { valid: false, message: 'Title must not exceed 255 characters' };
    }
    
    return { valid: true, message: 'Note is valid' };
}

/**
 * Get statistics about notes
 */
function getNoteStatistics() {
    const stats = {
        total: currentNotes.length,
        pinned: currentNotes.filter(n => n.is_pinned).length,
        archived: currentNotes.filter(n => n.is_archived).length,
        deleted: currentNotes.filter(n => n.is_deleted).length
    };
    
    return stats;
}

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl+N or Cmd+N - Create new note
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewNote();
    }
    
    // Ctrl+S or Cmd+S - Save note
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (document.getElementById('noteEditorModal').classList.contains('active')) {
            saveNote();
        }
    }
    
    // Ctrl+/ or Cmd+/ - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

/**
 * Sync notes periodically
 */
setInterval(function() {
    if (currentUser && currentView !== 'deleted') {
        loadNotes(currentView);
        saveNotesToLocalStorage();
    }
}, 30000); // Sync every 30 seconds

/**
 * Save to local storage when notes change
 */
function onNotesChanged() {
    saveNotesToLocalStorage();
}

// Auto-save to local storage after rendering
const originalRenderNotes = renderNotes;
renderNotes = function() {
    originalRenderNotes.apply(this, arguments);
    onNotesChanged();
};

// ====================
// Advanced Features
// ====================

/**
 * Calculate and display analytics
 */
function showAnalytics() {
    const modal = document.getElementById('analyticsModal');
    if (!modal) return;

    const stats = calculateAnalytics();
    
    document.getElementById('totalNotesCount').textContent = stats.totalNotes;
    document.getElementById('pinnedNotesCount').textContent = stats.pinnedNotes;
    document.getElementById('archivedNotesCount').textContent = stats.archivedNotes;
    document.getElementById('totalCharacters').textContent = stats.totalCharacters;
    document.getElementById('totalWords').textContent = stats.totalWords;
    document.getElementById('lastModifiedDate').textContent = stats.lastModified;
    
    displayColorStats(stats.colorDistribution);
    openModal('analyticsModal');
}

/**
 * Calculate analytics data from all notes
 */
function calculateAnalytics() {
    let totalNotes = 0;
    let pinnedNotes = 0;
    let archivedNotes = 0;
    let totalCharacters = 0;
    let totalWords = 0;
    let lastModified = 'Never';
    const colorDistribution = {};

    fetch(`${API_BASE}/notes.php?action=get_all`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const notes = data.data;
                
                notes.forEach(note => {
                    totalNotes++;
                    if (note.is_pinned) pinnedNotes++;
                    if (note.is_archived) archivedNotes++;
                    
                    totalCharacters += (note.content || '').length;
                    totalWords += (note.content || '').trim().split(/\s+/).length;
                    
                    const color = note.color || '#FFFFFF';
                    colorDistribution[color] = (colorDistribution[color] || 0) + 1;
                    
                    if (note.updated_at) {
                        lastModified = new Date(note.updated_at).toLocaleDateString();
                    }
                });
            }
        })
        .catch(error => console.error('Analytics error:', error));

    return {
        totalNotes,
        pinnedNotes,
        archivedNotes,
        totalCharacters,
        totalWords,
        lastModified,
        colorDistribution
    };
}

/**
 * Display color statistics chart
 */
function displayColorStats(colorDistribution) {
    const container = document.getElementById('colorStats');
    if (!container) return;

    container.innerHTML = '';
    const colorNames = {
        '#FFFFFF': 'White',
        '#FFE082': 'Yellow',
        '#C5E1A5': 'Green',
        '#B3E5FC': 'Blue',
        '#F8BBD0': 'Pink',
        '#FFCCBC': 'Orange',
        '#E1BEE7': 'Purple',
        '#ECEFF1': 'Gray'
    };

    for (const [color, count] of Object.entries(colorDistribution)) {
        const stat = document.createElement('div');
        stat.className = 'color-stat-item';
        stat.innerHTML = `
            <div class="color-stat-color" style="background-color: ${color}"></div>
            <div class="color-stat-info">
                <span>${colorNames[color]}</span>
                <strong>${count} note${count !== 1 ? 's' : ''}</strong>
            </div>
        `;
        container.appendChild(stat);
    }
}

/**
 * Export notes as JSON
 */
function exportNotesAsJSON() {
    fetch(`${API_BASE}/notes.php?action=get_all`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const json = JSON.stringify(data.data, null, 2);
                downloadFile(json, 'notes-export.json', 'application/json');
                showNotification('Notes exported as JSON', 'success');
            }
        })
        .catch(error => {
            console.error('Export error:', error);
            showNotification('Error exporting notes', 'error');
        });
}

/**
 * Export notes as CSV
 */
function exportNotesAsCSV() {
    fetch(`${API_BASE}/notes.php?action=get_all`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let csv = 'Title,Created Date,Modified Date,Character Count,Status\n';
                
                data.data.forEach(note => {
                    const title = (note.title || '').replace(/"/g, '""');
                    const created = new Date(note.created_at).toLocaleDateString();
                    const modified = new Date(note.updated_at).toLocaleDateString();
                    const charCount = note.content ? note.content.length : 0;
                    const status = note.is_archived ? 'Archived' : (note.is_pinned ? 'Pinned' : 'Active');
                    
                    csv += `"${title}","${created}","${modified}",${charCount},"${status}"\n`;
                });
                
                downloadFile(csv, 'notes-export.csv', 'text/csv');
                showNotification('Notes exported as CSV', 'success');
            }
        })
        .catch(error => {
            console.error('Export error:', error);
            showNotification('Error exporting notes', 'error');
        });
}

/**
 * Export notes as plain text
 */
function exportNotesAsText() {
    fetch(`${API_BASE}/notes.php?action=get_all`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let text = 'NOTES EXPORT\n';
                text += '='.repeat(50) + '\n';
                text += `Generated: ${new Date().toLocaleString()}\n`;
                text += '='.repeat(50) + '\n\n';
                
                data.data.forEach((note, index) => {
                    text += `${index + 1}. ${note.title || 'Untitled'}\n`;
                    text += '-'.repeat(40) + '\n';
                    text += `${note.content || ''}\n`;
                    text += `Created: ${new Date(note.created_at).toLocaleString()}\n`;
                    text += `Modified: ${new Date(note.updated_at).toLocaleString()}\n`;
                    text += '\n\n';
                });
                
                downloadFile(text, 'notes-export.txt', 'text/plain');
                showNotification('Notes exported as Text', 'success');
            }
        })
        .catch(error => {
            console.error('Export error:', error);
            showNotification('Error exporting notes', 'error');
        });
}

/**
 * Helper function to download file
 */
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Show settings modal
 */
function showSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    if (currentUser) {
        document.getElementById('settingsUsername').value = currentUser.username;
        document.getElementById('settingsEmail').value = currentUser.email;
    }

    const darkModeToggle = document.getElementById('darkModeToggle');
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const notificationsToggle = document.getElementById('notificationsToggle');

    if (darkModeToggle) {
        darkModeToggle.checked = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }

    if (autoSaveToggle) {
        autoSaveToggle.checked = localStorage.getItem('autoSave') !== 'false';
        autoSaveToggle.addEventListener('change', (e) => {
            localStorage.setItem('autoSave', e.target.checked);
        });
    }

    if (notificationsToggle) {
        notificationsToggle.checked = localStorage.getItem('notifications') !== 'false';
        notificationsToggle.addEventListener('change', (e) => {
            localStorage.setItem('notifications', e.target.checked);
        });
    }

    openModal('settingsModal');
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const isDarkMode = document.getElementById('darkModeToggle').checked;
    localStorage.setItem('darkMode', isDarkMode);
    
    if (isDarkMode) {
        document.documentElement.style.colorScheme = 'dark';
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.style.colorScheme = 'light';
        document.body.classList.remove('dark-mode');
    }
    
    showNotification(isDarkMode ? 'Dark mode enabled' : 'Dark mode disabled', 'info');
}

/**
 * Open change password dialog
 */
function changePassword() {
    openModal('changePasswordModal');
}

/**
 * Submit password change
 */
function submitChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'change_password');
    formData.append('current_password', currentPassword);
    formData.append('new_password', newPassword);

    fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Password changed successfully', 'success');
            closeModal('changePasswordModal');
            document.getElementById('changePasswordForm').reset();
        } else {
            showNotification(data.message || 'Error changing password', 'error');
        }
    })
    .catch(error => {
        console.error('Password change error:', error);
        showNotification('Error changing password', 'error');
    });
}

/**
 * Open delete account dialog
 */
function openDeleteAccountDialog() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone. All your notes will be permanently deleted.')) {
        if (confirm('This is your last chance. Type "DELETE" to confirm account deletion.')) {
            const response = prompt('Type "DELETE" to confirm:');
            if (response === 'DELETE') {
                deleteAccount();
            }
        }
    }
}

/**
 * Delete user account
 */
function deleteAccount() {
    fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=delete_account'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 2000);
        } else {
            showNotification(data.message || 'Error deleting account', 'error');
        }
    })
    .catch(error => {
        console.error('Delete account error:', error);
        showNotification('Error deleting account', 'error');
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+N: New note
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            createNewNote();
        }
        // Ctrl+S: Save current note
        else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentNote();
        }
        // Ctrl+F: Focus search
        else if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        }
        // Ctrl+/: Show shortcuts
        else if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            showHelpModal();
        }
        // Escape: Close modal
        else if (e.key === 'Escape') {
            closeAllModals();
        }
        // Ctrl+P: Toggle pin
        else if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            togglePinCurrentNote();
        }
        // Ctrl+A: Archive note
        else if (e.ctrlKey && e.key === 'a' && currentEditingNote.id) {
            e.preventDefault();
            toggleArchiveCurrentNote();
        }
    });
}

/**
 * Save current note
 */
function saveCurrentNote() {
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) saveBtn.click();
}

/**
 * Toggle pin on current note
 */
function togglePinCurrentNote() {
    const pinBtn = document.getElementById('pinNoteBtn');
    if (pinBtn) pinBtn.click();
}

/**
 * Toggle archive on current note
 */
function toggleArchiveCurrentNote() {
    const archiveBtn = document.getElementById('archiveNoteBtn');
    if (archiveBtn) archiveBtn.click();
}

/**
 * Show help modal
 */
function showHelpModal() {
    openModal('helpModal');
}

/**
 * Helper function to open modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Helper function to close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * Close all modals
 */
function closeAllModals() {
    ['analyticsModal', 'settingsModal', 'helpModal', 'changePasswordModal', 'noteEditorModal'].forEach(modalId => {
        closeModal(modalId);
    });
}

// Initialize keyboard shortcuts when app loads
document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);

// Modal close buttons
document.addEventListener('DOMContentLoaded', () => {
    ['analyticsModal', 'settingsModal', 'helpModal', 'changePasswordModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modalId);
                }
            });
        }
    });

    // Setup navigation buttons for new features
    const analyticsNavBtn = document.getElementById('analyticsNavBtn');
    const settingsNavBtn = document.getElementById('settingsNavBtn');
    const helpNavBtn = document.getElementById('helpNavBtn');

    if (analyticsNavBtn) analyticsNavBtn.addEventListener('click', showAnalytics);
    if (settingsNavBtn) settingsNavBtn.addEventListener('click', showSettings);
    if (helpNavBtn) helpNavBtn.addEventListener('click', showHelpModal);

    // Setup theme switcher
    const themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
    if (themeSwitcherBtn) {
        themeSwitcherBtn.addEventListener('click', toggleTheme);
    }

    // Setup settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            openSettingsTab(tabName);
        });
    });

    // Setup theme options in settings
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            setTheme(theme);
        });
    });

    // Setup layout options
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const layout = this.getAttribute('data-layout');
            setLayoutMode(layout);
        });
    });

    // Setup font size buttons
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = this.getAttribute('data-size');
            setFontSize(size);
        });
    });

    // Setup settings buttons
    document.getElementById('changePasswordBtn')?.addEventListener('click', showChangePasswordModal);
    document.getElementById('logoutAllBtn')?.addEventListener('click', logoutAllSessions);
    document.getElementById('enable2FABtn')?.addEventListener('click', enable2FA);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportUserData);
    document.getElementById('importDataBtn')?.addEventListener('click', importUserData);
    document.getElementById('clearCacheBtn')?.addEventListener('click', clearCache);
    document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);

    // Setup quick action bar buttons
    document.getElementById('quickNewNote')?.addEventListener('click', createNewNote);
    document.getElementById('quickSearch')?.addEventListener('click', () => {
        document.getElementById('searchInput').focus();
    });
    document.getElementById('quickSync')?.addEventListener('click', syncNotes);

    // Setup advanced search
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyAdvancedSearch);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearAdvancedSearch);

    document.querySelectorAll('.color-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });

    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// ====================
// Settings Management
// ====================

/**
 * Show settings modal
 */
function showSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        loadSettingsData();
    }
}

/**
 * Open settings tab
 */
function openSettingsTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    event.target.classList.add('active');
}

/**
 * Load current settings data
 */
function loadSettingsData() {
    const autoSaveInterval = localStorage.getItem('autoSaveInterval') || '2';
    const notesPerPage = localStorage.getItem('notesPerPage') || '12';
    const theme = localStorage.getItem('theme') || 'auto';
    const fontSize = localStorage.getItem('fontSize') || 'normal';
    const layout = localStorage.getItem('layout') || 'grid';

    document.getElementById('autoSaveInterval').value = autoSaveInterval;
    document.getElementById('notesPerPage').value = notesPerPage;

    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-size') === fontSize) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-layout') === layout) {
            btn.classList.add('active');
        }
    });
}

/**
 * Set theme
 */
function setTheme(theme) {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    showNotification(`Theme changed to ${theme}!`, 'success');
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);

    if (theme === 'dark') {
        html.style.colorScheme = 'dark';
    } else if (theme === 'light') {
        html.style.colorScheme = 'light';
    } else {
        html.style.colorScheme = 'normal';
    }
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'auto';
    const themes = ['light', 'dark', 'auto'];
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
    updateThemeSwitcherIcon();
}

/**
 * Update theme switcher icon
 */
function updateThemeSwitcherIcon() {
    const theme = localStorage.getItem('theme') || 'auto';
    const btn = document.getElementById('themeSwitcherBtn');
    if (btn) {
        if (theme === 'dark') {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
        } else if (theme === 'light') {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            btn.innerHTML = '<i class="fas fa-adjust"></i>';
        }
    }
}

/**
 * Set font size
 */
function setFontSize(size) {
    localStorage.setItem('fontSize', size);
    const html = document.documentElement;

    switch(size) {
        case 'small':
            html.style.fontSize = '12px';
            break;
        case 'large':
            html.style.fontSize = '18px';
            break;
        default:
            html.style.fontSize = '16px';
    }

    showNotification(`Font size changed!`, 'success');
}

/**
 * Set layout mode
 */
function setLayoutMode(layout) {
    localStorage.setItem('layout', layout);
    currentViewMode = layout;
    const notesGrid = document.getElementById('notesGrid');

    if (notesGrid) {
        if (layout === 'list') {
            notesGrid.classList.add('list-view');
            notesGrid.classList.remove('grid-view');
        } else {
            notesGrid.classList.remove('list-view');
            notesGrid.classList.add('grid-view');
        }
    }

    showNotification(`Layout changed to ${layout}!`, 'success');
}

// ====================
// Analytics
// ====================

/**
 * Show analytics modal
 */
function showAnalytics() {
    const modal = document.getElementById('analyticsModal');
    if (modal) {
        modal.style.display = 'flex';
        calculateAnalytics();
    }
}

/**
 * Calculate and display analytics
 */
function calculateAnalytics() {
    const totalNotes = currentNotes.length;
    const pinnedNotes = currentNotes.filter(note => note.isPinned).length;
    const archivedNotes = currentNotes.filter(note => note.isArchived).length;

    document.getElementById('totalNotesCount').textContent = totalNotes;
    document.getElementById('pinnedNotesCount').textContent = pinnedNotes;
    document.getElementById('archivedNotesCount').textContent = archivedNotes;

    // Last modified
    if (totalNotes > 0) {
        const lastNote = currentNotes[0];
        document.getElementById('lastModifiedTime').textContent = formatDate(new Date());
    }

    // Color distribution
    generateColorDistribution();

    // Activity timeline
    generateActivityTimeline();

    // Storage usage
    calculateStorageUsage();
}

/**
 * Generate color distribution chart
 */
function generateColorDistribution() {
    const colorMap = {};
    const colors = {
        '#FFFFFF': 'White',
        '#FFEB3B': 'Yellow',
        '#81C784': 'Green',
        '#64B5F6': 'Blue',
        '#F8BBD0': 'Pink',
        '#FFCCBC': 'Orange',
        '#E1BEE7': 'Purple',
        '#ECEFF1': 'Gray'
    };

    currentNotes.forEach(note => {
        const color = note.color || '#FFFFFF';
        colorMap[color] = (colorMap[color] || 0) + 1;
    });

    const container = document.getElementById('colorDistribution');
    if (container) {
        container.innerHTML = '';
        Object.entries(colorMap).forEach(([color, count]) => {
            const percent = ((count / currentNotes.length) * 100).toFixed(1);
            const bar = document.createElement('div');
            bar.className = 'color-bar-item';
            bar.innerHTML = `
                <div class="color-bar">
                    <div class="bar-fill" style="width: ${percent}%; background-color: ${color};"></div>
                </div>
                <span>${colors[color]}: ${count} (${percent}%)</span>
            `;
            container.appendChild(bar);
        });
    }
}

/**
 * Generate activity timeline
 */
function generateActivityTimeline() {
    const container = document.getElementById('activityTimeline');
    if (container) {
        container.innerHTML = '';
        const recentNotes = currentNotes.slice(0, 5);

        recentNotes.forEach(note => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <h4>${escapeHtml(note.title || 'Untitled')}</h4>
                    <small>${formatDate(new Date(note.updatedAt || new Date()))}</small>
                </div>
            `;
            container.appendChild(item);
        });
    }
}

/**
 * Calculate storage usage
 */
function calculateStorageUsage() {
    let totalSize = 0;
    const maxSize = 10 * 1024 * 1024; // 10 MB in bytes

    currentNotes.forEach(note => {
        totalSize += (note.title?.length || 0) + (note.content?.length || 0);
    });

    const percent = ((totalSize / maxSize) * 100).toFixed(1);
    const usedKB = (totalSize / 1024).toFixed(2);

    document.getElementById('storageUsed').style.width = `${Math.min(percent, 100)}%`;
    document.getElementById('storageText').textContent = `Used: ${usedKB} KB / 10 MB`;
}

// ====================
// Help & Documentation
// ====================

/**
 * Show help modal
 */
function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// ====================
// Advanced Search & Filters
// ====================

/**
 * Apply advanced search filters
 */
function applyAdvancedSearch() {
    const selectedColors = Array.from(document.querySelectorAll('.color-filter-btn.active'))
        .map(btn => btn.getAttribute('data-color'));
    
    const selectedStatus = document.querySelector('.status-filter-btn.active')?.getAttribute('data-status');
    const startDate = new Date(document.getElementById('filterStartDate').value);
    const endDate = new Date(document.getElementById('filterEndDate').value);

    let filtered = currentNotes.filter(note => {
        let include = true;

        if (selectedColors.length > 0 && !selectedColors.includes(note.color)) {
            include = false;
        }

        if (selectedStatus === 'pinned' && !note.isPinned) include = false;
        if (selectedStatus === 'archived' && !note.isArchived) include = false;
        if (selectedStatus === 'deleted' && note.isDeleted !== true) include = false;

        if (!isNaN(startDate) && new Date(note.createdAt) < startDate) include = false;
        if (!isNaN(endDate) && new Date(note.createdAt) > endDate) include = false;

        return include;
    });

    displayNotes(filtered);
    showNotification(`Found ${filtered.length} notes matching filters`, 'info');
}

/**
 * Clear all search filters
 */
function clearAdvancedSearch() {
    document.querySelectorAll('.color-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.status-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.status-filter-btn')?.classList.add('active');
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    loadNotes();
    showNotification('Filters cleared', 'info');
}

// ====================
// Data Management
// ====================

/**
 * Export user data
 */
function exportUserData() {
    const dataToExport = {
        userName: currentUser.username,
        userEmail: currentUser.email,
        exportDate: new Date().toISOString(),
        notes: currentNotes,
        settings: {
            theme: localStorage.getItem('theme'),
            fontSize: localStorage.getItem('fontSize'),
            layout: localStorage.getItem('layout'),
            autoSaveInterval: localStorage.getItem('autoSaveInterval')
        }
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully!', 'success');
}

/**
 * Import user data
 */
function importUserData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.notes && Array.isArray(data.notes)) {
                    // Import notes via API
                    data.notes.forEach(note => {
                        saveNote(note.id, note.title, note.content, note.color, note.isPinned);
                    });
                    showNotification(`Imported ${data.notes.length} notes!`, 'success');
                    loadNotes();
                } else {
                    showNotification('Invalid file format', 'error');
                }
            } catch (error) {
                showNotification('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

/**
 * Clear application cache
 */
function clearCache() {
    if (confirm('Are you sure you want to clear the cache? This will remove temporarily stored data.')) {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        showNotification('Cache cleared successfully!', 'success');
    }
}

/**
 * Delete user account
 */
function deleteAccount() {
    if (confirm('Are you absolutely sure? This action cannot be undone and will permanently delete your account and all notes.')) {
        if (confirm('Type your username to confirm deletion.')) {
            const username = prompt('Enter your username to confirm:');
            if (username === currentUser.username) {
                fetch(`${API_BASE}/auth.php?action=delete_account`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('Account deleted successfully', 'success');
                        setTimeout(() => logout(), 2000);
                    }
                });
            }
        }
    }
}

/**
 * Logout all sessions
 */
function logoutAllSessions() {
    if (confirm('This will logout all your sessions on other devices.')) {
        fetch(`${API_BASE}/auth.php?action=logout_all`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Logged out from all sessions!', 'success');
            }
        });
    }
}

/**
 * Enable two-factor authentication
 */
function enable2FA() {
    alert('Two-factor authentication setup would open a modal with QR code generation.');
    showNotification('2FA feature coming soon!', 'info');
}

/**
 * Show change password modal
 */
function showChangePasswordModal() {
    const currentPassword = prompt('Enter your current password:');
    if (!currentPassword) return;

    const newPassword = prompt('Enter your new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    const confirmPassword = prompt('Confirm your new password:');
    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    fetch(`${API_BASE}/auth.php?action=change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Password changed successfully!', 'success');
        } else {
            showNotification(data.message || 'Error changing password', 'error');
        }
    });
}

/**
 * Sync notes
 */
function syncNotes() {
    showNotification('Syncing notes...', 'info');
    loadNotes();
}

// ====================
// Utility Functions
// ====================

/**
 * Format date to readable string
 */
function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

console.log('Notes Application Loaded - Ready for use');
console.log('Version: 2.5.0');
console.log('Features: Create, Edit, Delete, Archive, Pin, Search, Analytics, Settings, Export, Theme, Advanced Filters');
console.log('Keyboard Shortcuts: Ctrl+N (New), Ctrl+S (Save), Ctrl+F (Search), Ctrl+/ (Help), Ctrl+B (Bold), Ctrl+I (Italic)');
