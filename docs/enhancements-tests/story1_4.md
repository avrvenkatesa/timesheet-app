
# Test Cases - Story 1.4: Audit Trail for Entry Changes

## Test Suite: Audit Trail Implementation

### TC-1.4.1: Create Entry Audit Log
**Objective:** Verify audit log captures entry creation  
**Preconditions:** User is authenticated  
**Test Steps:**
1. Create new time entry with all fields
2. Save entry
3. Query entry_changelog table
4. Check created_at and created_by fields

**Expected Results:**
- entry_changelog has record with action='CREATE'
- Each field has a changelog entry with old_value=NULL
- new_value contains initial values
- created_at timestamp is set
- created_by contains user ID
- IP address and user agent captured

---

### TC-1.4.2: Update Entry Audit Log
**Objective:** Verify audit log captures field changes  
**Preconditions:** Entry exists with hours=4  
**Test Steps:**
1. Edit entry, change hours to 6
2. Change notes from "Task A" to "Task B"
3. Save changes
4. Query entry_changelog for this entry

**Expected Results:**
- Two new changelog records created
- Record 1: field_name='hours', old_value='4', new_value='6'
- Record 2: field_name='notes', old_value='Task A', new_value='Task B'
- updated_at timestamp updated
- updated_by contains user who made change
- Unchanged fields not logged

---

### TC-1.4.3: Delete Entry Audit Log
**Objective:** Verify soft delete is logged  
**Test Steps:**
1. Delete an entry with reason "Duplicate"
2. Check entry_changelog table
3. Verify audit record created

**Expected Results:**
- Changelog record with action='DELETE'
- deletion_reason captured in new_value
- User ID and timestamp recorded
- IP address logged
- Entry's deleted_at logged

---

### TC-1.4.4: Restore Entry Audit Log
**Objective:** Verify restoration is logged  
**Preconditions:** Soft-deleted entry exists  
**Test Steps:**
1. Restore deleted entry
2. Check entry_changelog
3. Verify restoration logged

**Expected Results:**
- Changelog record with action='RESTORE'
- User who restored is logged
- Timestamp of restoration recorded
- Previous deletion reason preserved in history

---

### TC-1.4.5: View Entry History
**Objective:** Verify users can view change history  
**Test Steps:**
1. Click "View History" on an entry with multiple changes
2. Review timeline display
3. Check each change shown

**Expected Results:**
- Modal/panel shows complete history
- Changes shown in chronological order
- Each change shows: who, when, what
- Field changes show old → new values
- User-friendly formatting (not raw data)

---

### TC-1.4.6: Filter Audit History
**Objective:** Verify audit history can be filtered  
**Test Steps:**
1. Open entry history with 10+ changes
2. Filter by action type "UPDATE"
3. Filter by date range
4. Filter by user

**Expected Results:**
- Filter options available
- Results update based on filters
- Can combine multiple filters
- Clear filters option available
- Count shows filtered results

---

### TC-1.4.7: Audit Report Generation
**Objective:** Verify audit reports can be generated  
**Preconditions:** Admin user logged in  
**Test Steps:**
1. Navigate to Audit Reports
2. Select date range (last 30 days)
3. Generate report
4. Export as CSV

**Expected Results:**
- Report includes all changes in date range
- Grouped by user and action type
- Summary statistics included
- CSV downloads successfully
- Data properly formatted

---

### TC-1.4.8: Track Multiple Field Changes
**Objective:** Verify batch updates are properly logged  
**Test Steps:**
1. Edit entry
2. Change 5 different fields
3. Save once
4. Check audit log

**Expected Results:**
- One record per changed field (5 total)
- All have same timestamp
- All have same user ID
- Each shows correct old/new values
- Transaction ID links related changes

---

### TC-1.4.9: Timestamps Accuracy
**Objective:** Verify timestamp accuracy and timezone handling  
**Test Steps:**
1. Note exact time
2. Create entry
3. Check created_at in database
4. Display in UI

**Expected Results:**
- created_at matches actual time (±1 second)
- Stored in UTC/ISO format
- Displayed in user's local timezone
- Timezone conversions accurate

---

### TC-1.4.10: User Attribution
**Objective:** Verify changes are properly attributed  
**Test Steps:**
1. User A creates entry
2. User B edits entry
3. User C deletes entry
4. Admin restores entry
5. Check audit trail

**Expected Results:**
- created_by = User A
- updated_by = User B (most recent)
- Deletion shows User C
- Restoration shows Admin
- Each changelog entry has correct user_id

---

### TC-1.4.11: Sensitive Data Handling
**Objective:** Verify sensitive data is properly handled in audit  
**Test Steps:**
1. Change a field containing sensitive data
2. Check audit log storage
3. View audit history in UI

**Expected Results:**
- Sensitive fields are hashed or redacted
- UI shows "***" or "[REDACTED]" for sensitive data
- Audit log indicates field was changed but not the value
- Compliance with data protection requirements

---

### TC-1.4.12: Audit Log Pagination
**Objective:** Verify pagination works for large histories  
**Preconditions:** Entry with 100+ changes  
**Test Steps:**
1. View entry history
2. Check pagination controls
3. Navigate through pages
4. Change page size

**Expected Results:**
- Shows 20 items per page by default
- Pagination controls work correctly
- Can change items per page (10, 20, 50)
- Shows total count and current range
- Performance remains good

---

### TC-1.4.13: Export Entry History
**Objective:** Verify individual entry history can be exported  
**Test Steps:**
1. Open entry with history
2. Click "Export History"
3. Choose CSV format
4. Download and open file

**Expected Results:**
- CSV includes all changes
- Properly formatted with headers
- Dates in readable format
- User names included (not just IDs)
- Can open in Excel/spreadsheet

---

### TC-1.4.14: Audit Log Retention
**Objective:** Verify audit logs are retained properly  
**Test Steps:**
1. Check audit logs from 6 months ago
2. Check audit logs from 1 year ago
3. Verify retention policy

**Expected Results:**
- All audit logs retained (no deletion)
- Old logs accessible
- Performance acceptable for old data
- Archival process if configured

---

### TC-1.4.15: Concurrent Update Handling
**Objective:** Verify concurrent updates are logged correctly  
**Test Steps:**
1. Two users open same entry
2. User A changes hours
3. User B changes notes
4. Both save within 1 second
5. Check audit log

**Expected Results:**
- Both changes logged
- Different timestamps (millisecond precision)
- No lost updates
- Both users attributed correctly
- Conflict resolution if needed

---

### TC-1.4.16: Audit Log Security
**Objective:** Verify audit logs cannot be tampered with  
**Test Steps:**
1. Try to directly update entry_changelog table
2. Try to delete audit records
3. Try to modify timestamps

**Expected Results:**
- Direct modifications prevented
- Only INSERT allowed (no UPDATE/DELETE)
- Admin cannot modify audit logs
- Integrity checks in place

---

### TC-1.4.17: Performance Impact
**Objective:** Verify audit logging doesn't impact performance  
**Test Steps:**
1. Measure time to create entry with audit
2. Measure time to update entry
3. Bulk update 100 entries
4. Check response times

**Expected Results:**
- Single operations <100ms overhead
- Bulk operations <500ms overhead
- Audit writes are asynchronous
- No blocking of main operations
- Database indexes optimize queries

---

### TC-1.4.18: Search Within Audit Logs
**Objective:** Verify audit logs are searchable  
**Test Steps:**
1. Navigate to audit search
2. Search for specific user's changes
3. Search for changes on specific date
4. Search by field name

**Expected Results:**
- Search returns relevant results
- Can search by multiple criteria
- Results highlight search terms
- Export search results option
- Search performance <2 seconds

---

### TC-1.4.19: Audit Dashboard Statistics
**Objective:** Verify audit dashboard shows accurate stats  
**Test Steps:**
1. Navigate to audit dashboard
2. Check "Changes Today" count
3. Check "Active Users" count
4. Verify against database

**Expected Results:**
- Statistics are accurate
- Real-time or near real-time updates
- Charts display correctly
- Can drill down into details
- Time period filters work

---

### TC-1.4.20: Compliance Report Generation
**Objective:** Verify compliance reports meet requirements  
**Test Steps:**
1. Generate quarterly compliance report
2. Include all users and changes
3. Export in required format
4. Verify completeness

**Expected Results:**
- Report includes all required fields
- Digital signature/checksum included
- Meets regulatory format requirements
- No data missing or corrupted
- Can be validated externally

---

## Test Data Requirements

```sql
-- Entry with full history
INSERT INTO entries (id, created_at, created_by, updated_at, updated_by) 
VALUES ('entry-hist-1', '2024-01-01 10:00:00', 'user-1', '2024-01-15 14:30:00', 'user-2');

-- Audit log entries
INSERT INTO entry_changelog (entry_id, user_id, action, field_name, old_value, new_value, changed_at)
VALUES 
  ('entry-hist-1', 'user-1', 'CREATE', 'hours', NULL, '4', '2024-01-01 10:00:00'),
  ('entry-hist-1', 'user-2', 'UPDATE', 'hours', '4', '6', '2024-01-10 11:00:00'),
  ('entry-hist-1', 'user-2', 'UPDATE', 'notes', 'Initial', 'Updated', '2024-01-10 11:00:00'),
  ('entry-hist-1', 'user-3', 'DELETE', NULL, NULL, 'Duplicate entry', '2024-01-12 09:00:00'),
  ('entry-hist-1', 'admin-1', 'RESTORE', NULL, NULL, NULL, '2024-01-15 14:30:00');
```

## Performance Requirements
- Audit log write: <50ms
- History retrieval: <1 second for 100 records
- Report generation: <5 seconds for 10,000 records
- No performance degradation over time
- Efficient storage (compressed if needed)