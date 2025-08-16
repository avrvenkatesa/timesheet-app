# Replit AI Prompt - Story 1.3: Implement Soft Deletes

## Database Migration

Create a migration script to add soft delete support:

```sql
-- Add deleted_at column to entries table
ALTER TABLE entries ADD COLUMN deleted_at TEXT DEFAULT NULL;

-- Add deleted_by column to track who deleted
ALTER TABLE entries ADD COLUMN deleted_by TEXT DEFAULT NULL;

-- Create index for performance when filtering
CREATE INDEX idx_entries_deleted_at ON entries(deleted_at);

-- Add deletion reason column
ALTER TABLE entries ADD COLUMN deletion_reason TEXT DEFAULT NULL;

-- Create a view for active entries (non-deleted)
CREATE VIEW active_entries AS
SELECT * FROM entries WHERE deleted_at IS NULL;

-- Create a view for deleted entries
CREATE VIEW deleted_entries AS
SELECT * FROM entries WHERE deleted_at IS NOT NULL;
```

## Backend Implementation

Modify the Express.js API to implement soft deletes:

1. **Update DELETE /api/entries/:id endpoint:**
```javascript
// Instead of DELETE FROM entries, do:
app.delete('/api/entries/:id', (req, res) => {
  const entryId = req.params.id;
  const userId = req.user?.id || 'system'; // from auth
  const reason = req.body.reason; // optional deletion reason

  // Check if entry exists and isn't already deleted
  // Check if entry is not invoiced
  // Set deleted_at to current ISO timestamp
  // Set deleted_by to current user
  // Set deletion_reason if provided
  // Log in audit trail
  // Return success with deleted entry data
});
```

2. **Modify GET /api/entries endpoint:**
```javascript
// Add query parameter for including deleted entries
app.get('/api/entries', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const onlyDeleted = req.query.onlyDeleted === 'true';

  // Default: WHERE deleted_at IS NULL
  // If includeDeleted: no WHERE clause for deleted_at
  // If onlyDeleted: WHERE deleted_at IS NOT NULL
  // Return entries with deletion metadata if deleted
});
```

3. **Create RESTORE endpoint:**
```javascript
app.post('/api/entries/:id/restore', (req, res) => {
  // Check if entry exists and is deleted
  // Set deleted_at = NULL
  // Set deleted_by = NULL
  // Set deletion_reason = NULL
  // Log restoration in audit trail
  // Return restored entry
});
```

4. **Create PERMANENT DELETE endpoint (admin only):**
```javascript
app.delete('/api/entries/:id/permanent', requireAdmin, (req, res) => {
  // Check admin permissions
  // Check if entry is deleted (soft delete first)
  // Check if deleted > 90 days ago OR force flag
  // Actually DELETE FROM entries
  // Log permanent deletion
  // Return confirmation
});
```

5. **Create cleanup job for old deleted entries:**
```javascript
// Scheduled job to run daily
function cleanupOldDeletedEntries() {
  // Find entries where deleted_at < 90 days ago
  // Permanently delete them
  // Log cleanup actions
}
```

## Frontend Implementation

Create UI components for soft delete functionality:

1. **Modify Delete Confirmation Dialog:**
```javascript
const DeleteConfirmDialog = ({ entry, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  return (
    // Dialog with:
    // - Warning message
    // - Optional reason textarea
    // - Confirm and Cancel buttons
    // - If entry has dependencies, show warning
  );
};
```

2. **Add Deleted Entries Toggle:**
```javascript
const EntriesFilter = ({ filters, onFilterChange }) => {
  return (
    <div className="flex items-center space-x-4">
      {/* Other filters */}
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={filters.includeDeleted}
          onChange={(e) => onFilterChange({ includeDeleted: e.target.checked })}
        />
        <span className="ml-2">Show deleted entries</span>
      </label>
    </div>
  );
};
```

3. **Create Deleted Entry Indicator:**
```javascript
const DeletedBadge = ({ deletedAt, deletedBy, reason }) => {
  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
      <TrashIcon className="w-3 h-3 mr-1" />
      Deleted {formatDate(deletedAt)}
      {/* Tooltip with full details: who deleted, when, reason */}
    </div>
  );
};
```

4. **Add Restore Button for Deleted Entries:**
```javascript
const RestoreButton = ({ entry, onRestore }) => {
  const handleRestore = async () => {
    try {
      const response = await fetch(`/api/entries/${entry.id}/restore`, {
        method: 'POST'
      });
      if (response.ok) {
        toast.success('Entry restored successfully');
        onRestore(entry.id);
      }
    } catch (error) {
      toast.error('Failed to restore entry');
    }
  };

  return (
    <button
      onClick={handleRestore}
      className="text-blue-600 hover:text-blue-800"
    >
      <RefreshIcon className="w-4 h-4" />
      Restore
    </button>
  );
};
```

5. **Admin Panel for Permanent Deletion:**
```javascript
const AdminDeletedEntries = () => {
  // List all soft-deleted entries
  // Show deletion date, who deleted, reason
  // Show age of deletion (days)
  // Restore button
  // Permanent delete button (with extra confirmation)
  // Bulk operations
  // Export deleted entries
};
```

6. **Modify Entry Row Display:**
```javascript
const EntryRow = ({ entry }) => {
  const isDeleted = !!entry.deleted_at;

  return (
    <tr className={`${isDeleted ? 'opacity-60 bg-gray-50' : ''}`}>
      {/* Entry data */}
      {isDeleted && (
        <td>
          <DeletedBadge {...entry} />
          <RestoreButton entry={entry} />
        </td>
      )}
      {!isDeleted && (
        <td>
          <DeleteButton entry={entry} />
        </td>
      )}
    </tr>
  );
};
```

## State Management

Update the entries state to handle soft deletes:

```javascript
const useEntries = () => {
  const [entries, setEntries] = useState([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const softDelete = async (entryId, reason) => {
    // Call API to soft delete
    // Update local state
  };

  const restore = async (entryId) => {
    // Call API to restore
    // Update local state
  };

  const permanentDelete = async (entryId) => {
    // Admin only
    // Extra confirmation required
    // Call API to permanently delete
  };

  return {
    entries,
    includeDeleted,
    setIncludeDeleted,
    softDelete,
    restore,
    permanentDelete
  };
};
```

## Scheduled Cleanup Job

Create a backend job for automatic cleanup:

```javascript
// server/jobs/cleanup.js
const schedule = require('node-schedule');

// Run daily at 2 AM
schedule.scheduleJob('0 2 * * *', async () => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Find and permanently delete old soft-deleted entries
  const query = `
    DELETE FROM entries 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < ?
  `;

  // Execute and log results
});
```

Include proper error handling, transaction support, and audit logging for all operations.