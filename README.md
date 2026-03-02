# 📝 Notes Application - Google Keep Clone

A full-featured note-taking web application built with HTML, CSS, JavaScript, PHP, and MySQL. This is a professional-grade notes application deployed on Hostinger with XAMPP server.

## 🎯 Features

### Core Features
- ✨ **Create & Edit Notes** - Full WYSIWYG editing experience
- 🎨 **Color-Coded Notes** - 8 different color options to organize your notes
- 📌 **Pin Important Notes** - Keep important notes at the top
- 📦 **Archive Notes** - Archive old notes without deleting them
- 🗑️ **Trash & Restore** - Soft delete with restore option
- 🔍 **Full-Text Search** - Search through your notes instantly
- 👤 **User Accounts** - Secure authentication with password hashing
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🌙 **Dark Mode Support** - Automatic dark mode preference
- 💾 **Auto-Save** - Changes saved automatically every 2 seconds
- ⌨️ **Keyboard Shortcuts** - Ctrl+N (new), Ctrl+S (save), Ctrl+/ (search)

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+
- **Server**: Apache with Hostinger
- **Architecture**: RESTful API design

## 🚀 Installation & Setup

### Database Setup in Hostinger

1. Access cPanel → phpMyAdmin
2. Create database: `u757840095_note`
3. Create user: `u757840095_note2` with password `MB?EM6aTa7&M`
4. Grant all privileges
5. Import `database.sql` file

### Upload Files

1. Connect via FTP
2. Navigate to `public_html`
3. Upload all files:
   - index.html
   - style.css
   - script.js
   - config.php
   - database.sql
   - api/ folder with auth.php, notes.php, labels.php

### Set Permissions

- uploads/ folder: 755 or 777
- api/ folder: 755 or 777

### Access Application

```
https://yourdomain.com/
```

## 📊 Database Schema

Tables:
- `users` - User accounts
- `notes` - Main notes (with soft delete)
- `note_history` - Change tracking
- `labels` - Custom tags
- `note_labels` - Note-label relationships
- `collaborators` - Share control

## 🔒 Security Features

✅ Password hashing (SHA256)
✅ SQL injection prevention (prepared statements)
✅ Session management
✅ Input sanitization
✅ XSS protection
✅ Permission-based access control

## 📱 API Endpoints

### Authentication
- POST `/api/auth.php?action=register`
- POST `/api/auth.php?action=login`
- POST `/api/auth.php?action=logout`
- GET `/api/auth.php?action=check_session`

### Notes (CRUD)
- GET `/api/notes.php?action=list`
- GET `/api/notes.php?action=get&id=1`
- POST `/api/notes.php?action=create`
- PUT `/api/notes.php?action=update`
- DELETE `/api/notes.php?action=delete`
- PUT `/api/notes.php?action=toggle_pin`
- PUT `/api/notes.php?action=toggle_archive`
- GET `/api/notes.php?action=search&q=term`

### Labels
- GET `/api/labels.php?action=list`
- POST `/api/labels.php?action=create`
- PUT `/api/labels.php?action=update`
- DELETE `/api/labels.php?action=delete`

## 📈 Code Statistics

- **HTML**: ~350 lines
- **CSS**: ~1200+ lines (responsive, dark mode, animations)
- **JavaScript**: ~1000+ lines (CRUD, search, shortcuts)
- **PHP**: ~900+ lines (secure backend APIs)
- **SQL**: ~150 lines (schema with indexes)

**Total: 3600+ lines of production code**

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New note |
| Ctrl+S | Save note |
| Ctrl+/ | Focus search |
| Escape | Close editor |

## 🎨 Available Colors

- White (#FFFFFF)
- Yellow (#FFE082)
- Green (#C5E1A5)
- Blue (#B3E5FC)
- Pink (#F8BBD0)
- Orange (#FFCCBC)
- Purple (#E1BEE7)
- Gray (#ECEFF1)

## 📁 File Structure

```
public_html/
├── index.html
├── style.css
├── script.js
├── config.php
├── database.sql
├── api/
│   ├── auth.php
│   ├── notes.php
│   └── labels.php
└── uploads/
```

## 🐛 Troubleshooting

**Database connection error**: Check config.php credentials and MySQL is running

**Notes not loading**: Verify API files in api/ folder, check permissions

**404 errors**: Ensure files in correct directories, check .htaccess

**Session issues**: Clear cookies, check PHP session path permissions

## 🔄 Maintenance

### Backup Database
```bash
mysqldump -u u757840095_note2 -p u757840095_note > backup.sql
```

### Clean Deleted Notes
```sql
DELETE FROM notes WHERE is_deleted = TRUE 
AND DATE(updated_at) < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Optimize Tables
```sql
OPTIMIZE TABLE notes;
OPTIMIZE TABLE users;
```

## 👨‍💻 Developer Info

- **Version**: 1.0.0
- **PHP**: 7.4+
- **MySQL**: 5.7+
- **Browsers**: Chrome, Firefox, Safari, Edge (latest)

## 🎓 Implemented Features

✅ User authentication  
✅ CRUD operations  
✅ Search & filter  
✅ Color coding  
✅ Pin/archive  
✅ Soft delete  
✅ Note history  
✅ Labels system  
✅ Sharing control  
✅ Responsive design  
✅ Dark mode  
✅ Auto-save  
✅ Keyboard shortcuts  
✅ Local storage backup  
✅ Input validation  

## 📞 Support

For help, check:
1. Troubleshooting section
2. API documentation
3. Browser console
4. Hostinger support

---

**Happy Note-Taking! 📝✨**