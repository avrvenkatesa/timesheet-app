# Replit AI Prompt - Story 1.4: Audit Trail for Entry Changes

## Database Schema

Create the audit trail tables and triggers:

```sql
-- Add timestamp columns to entries table
ALTER TABLE entries ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE entries ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE entries ADD COLUMN created_by TEXT;
ALTER TABLE entries ADD COLUMN updated_by TEXT;

-- Create comprehensive audit log table
CREATE TABLE entry_changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, RESTORE
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- Create indexes for performance
CREATE INDEX idx_changelog_entry_id ON entry_changelog(entry_id);
CREATE INDEX idx_changelog_user_id ON entry_changelog(user_id);
CREATE INDEX idx_changelog_changed_at ON entry_changelog(changed_at);
CREATE INDEX idx_changelog_action ON entry_changelog(action);

-- Create a summary view for audit reports
CREATE VIEW entry_audit_summary AS
SELECT 
  entry_id,
  COUNT(*) as change_count,
  MIN(changed_at) as first_change,
  MAX(changed_at) as last_change,
  COUNT(DISTINCT user_id) as unique_editors
FROM entry_changelog
GROUP BY entry_id;
```

## Backend Implementation

Create comprehensive audit logging in Express.js:

1. **Audit Middleware:**
```javascript
// middleware/audit.js
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(data) {
      if (res.statusCode < 400) {
        // Log successful action
        logAuditEntry({
          action,
          userId: req.user?.id,
          userEmail: req.user?.email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: req.session?.id,
          requestBody: req.body,
          responseData: data,
          duration: Date.now() - startTime
        });
      }
      originalSend.call(this, data);
    };
    next();
  };
};
```

2. **Audit Logger Service:**
```javascript
// services/auditLogger.js
class AuditLogger {
  logCreate(entryId, entryData, userId, metadata) {
    // Log entry creation with all initial values
    // Each field gets a changelog entry with old_value = null
  }

  logUpdate(entryId, changes, userId, metadata) {
    // Compare old and new values
    // Create changelog entry for each changed field
    // Include field name, old value, new value
  }

  logDelete(entryId, userId, metadata) {
    // Log soft delete action
    // Include deletion reason if provided
  }

  logRestore(entryId, userId, metadata) {
    // Log restoration action
  }

  logAccess(entryId, userId, action) {
    // Log view/export actions for compliance
  }

  async getHistory(entryId, options = {}) {
    // Retrieve complete change history
    // Support pagination and filtering
  }

  async generateAuditReport(startDate, endDate, userId = null) {
    // Generate compliance report
    // Group by user, action type, date
  }
}
```

3. **Enhanced API Endpoints with Audit:**
```javascript
// Update all CRUD endpoints to use audit logging
app.post('/api/entries', auditMiddleware('CREATE'), async (req, res) => {
  // Create entry
  // Set created_at, created_by
  // Log all initial values in changelog
});

app.put('/api/entries/:id', auditMiddleware('UPDATE'), async (req, res) => {
  // Get current values
  // Update entry
  // Set updated_at, updated_by
  // Log only changed fields in changelog
});

app.delete('/api/entries/:id', auditMiddleware('DELETE'), async (req, res) => {
  // Soft delete
  // Log deletion with reason
});
```

4. **Audit History Endpoint:**
```javascript
app.get('/api/entries/:id/history', async (req, res) => {
  // Return paginated change history
  // Include user details, timestamps
  // Format changes for display
});

app.get('/api/audit/report', requireAdmin, async (req, res) => {
  // Generate audit report
  // Filter by date range, user, action type
  // Return CSV or JSON format
});
```

## Frontend Implementation

Create UI components for viewing audit trail:

1. **Entry History Modal:**
```javascript
const EntryHistoryModal = ({ entryId, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: 'all' });

  // Fetch and display change history
  // Timeline view with all changes
  // Filter by action type
  // Show who, what, when for each change

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-4xl">
        <h2>Entry History</h2>
        <HistoryFilter filter={filter} onChange={setFilter} />
        <Timeline>
          {history.map(change => (
            <TimelineItem key={change.id}>
              <ChangeDetail change={change} />
            </TimelineItem>
          ))}
        </Timeline>
      </div>
    </Modal>
  );
};
```

2. **Change Detail Component:**
```javascript
const ChangeDetail = ({ change }) => {
  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50">
      <ActionIcon action={change.action} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{change.user_email}</span>
          <time className="text-sm text-gray-500">
            {formatDateTime(change.changed_at)}
          </time>
        </div>
        <ChangeDescription change={change} />
        {change.field_name && (
          <ValueChange 
            field={change.field_name}
            oldValue={change.old_value}
            newValue={change.new_value}
          />
        )}
      </div>
    </div>
  );
};
```

3. **Audit Report Generator:**
```javascript
const AuditReportGenerator = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [userId, setUserId] = useState('all');
  const [format, setFormat] = useState('csv');

  const generateReport = async () => {
    // Call API to generate report
    // Download as CSV or display in table
    // Include summary statistics
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3>Generate Audit Report</h3>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <UserSelector value={userId} onChange={setUserId} />
      <FormatSelector value={format} onChange={setFormat} />
      <button onClick={generateReport}>Generate Report</button>
    </div>
  );
};
```

4. **Entry Metadata Display:**
```javascript
const EntryMetadata = ({ entry }) => {
  return (
    <div className="text-sm text-gray-600 space-y-1">
      <div>Created: {formatDateTime(entry.created_at)} by {entry.created_by}</div>
      {entry.updated_at !== entry.created_at && (
        <div>Last updated: {formatDateTime(entry.updated_at)} by {entry.updated_by}</div>
      )}
      <button 
        onClick={() => openHistory(entry.id)}
        className="text-blue-600 hover:underline"
      >
        View full history ({entry.change_count} changes)
      </button>
    </div>
  );
};
```

5. **Audit Dashboard (Admin):**
```javascript
const AuditDashboard = () => {
  // Show audit statistics
  // Recent changes across all entries
  // Most active users
  // Change frequency chart
  // Suspicious activity alerts

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard title="Total Changes Today" value={stats.todayChanges} />
      <StatCard title="Active Users" value={stats.activeUsers} />
      <StatCard title="Entries Modified" value={stats.modifiedEntries} />
      <ChangeFrequencyChart data={chartData} />
      <RecentChangesList changes={recentChanges} />
      <SuspiciousActivityAlert activities={suspiciousActivities} />
    </div>
  );
};
```

## Compliance and Export Features

```javascript
// Export audit trail for compliance
app.get('/api/audit/export', requireAdmin, async (req, res) => {
  const { startDate, endDate, format } = req.query;

  // Generate comprehensive audit trail
  // Include all metadata
  // Format as CSV, JSON, or PDF
  // Include digital signature for integrity
});

// Audit retention policy
const enforceRetentionPolicy = async () => {
  // Keep audit logs for 7 years (configurable)
  // Archive old logs to cold storage
  // Maintain summary statistics
};
```

## Security Considerations

```javascript
// Prevent audit log tampering
// Use write-once approach
// No UPDATE or DELETE allowed on changelog
// Admin can only view, not modify
// Include integrity checks

// Hash sensitive values in audit log
const hashSensitiveData = (value, fieldName) => {
  const sensitiveFields = ['password', 'ssn', 'creditCard'];
  if (sensitiveFields.includes(fieldName)) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
  return value;
};
```

Include proper indexing, pagination for large audit trails, and real-time notifications for critical changes.