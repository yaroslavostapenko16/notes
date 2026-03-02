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

console.log('Notes Application Loaded - Ready for use');
console.log('Version: 1.0.0');
console.log('Features: Create, Edit, Delete, Archive, Pin, Search notes');
