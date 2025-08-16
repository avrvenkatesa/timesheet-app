# Test Cases - Story 1.3: Implement Soft Deletes

## Test Suite: Soft Delete Implementation

### TC-1.3.1: Soft Delete Entry
**Objective:** Verify entries are soft deleted instead of permanently removed  
**Preconditions:** Active entry exists with id='entry-1'  
**Test Steps:**
1. Click delete button on entry
2. Confirm deletion in dialog
3. Check database record

**Expected Results:**
- Entry disappears from default view
- In database: deleted_at is set to current timestamp
- deleted_by contains user ID
- Record still exists in entries table
- Audit log shows deletion action

---

### TC-1.3.2: Add Deletion Reason
**Objective:** Verify optional deletion reason can be provided  
**Test Steps:**
1. Click delete on an entry
2. In confirmation dialog, enter reason: "Duplicate entry"
3. Confirm deletion
4. Check database

**Expected Results:**
- Deletion reason field appears in dialog
- Reason is optional (can delete without it)
- deletion_reason column contains "Duplicate entry"
- Reason appears in audit log

---

### TC-1.3.3: Hide Deleted Entries by Default
**Objective:** Verify deleted entries are hidden from normal view  
**Preconditions:** Mix of active and deleted entries exist  
**Test Steps:**
1. Navigate to entries list
2. Count visible entries
3. Query database for comparison

**Expected Results:**
- Only entries with deleted_at = NULL are shown
- Deleted entries count shows in UI (e.g., "5 deleted entries hidden")
- No deleted entries appear in default list
- Filters work only on visible entries

---

### TC-1.3.4: Show Deleted Entries Toggle
**Objective:** Verify toggle to show deleted entries works  
**Test Steps:**
1. Check "Show deleted entries" checkbox
2. Observe list changes
3. Uncheck toggle
4. Observe list again

**Expected Results:**
- Deleted entries appear when toggled on
- Deleted entries have visual distinction (grayed out)
- Deleted badge shows on deleted entries
- Count updates to include deleted
- Toggle state persists during session

---

### TC-1.3.5: Restore Deleted Entry
**Objective:** Verify deleted entries can be restored  
**Preconditions:** Soft-deleted entry exists  
**Test Steps:**
1. Enable "Show deleted entries"
2. Find deleted entry
3. Click Restore button
4. Confirm restoration

**Expected Results:**
- Restore button appears only on deleted entries
- Confirmation message appears
- Entry is restored immediately
- deleted_at, deleted_by, deletion_reason set to NULL
- Entry appears in active list
- Audit log shows restoration

---

### TC-1.3.6: Prevent Deletion of Invoiced Entry
**Objective:** Verify invoiced entries cannot be soft deleted  
**Preconditions:** Entry with invoice_id exists  
**Test Steps:**
1. Attempt to delete invoiced entry
2. Check response

**Expected Results:**
- Delete button is disabled/hidden OR
- Error message: "Cannot delete invoiced entries"
- No deletion occurs
- Entry remains active

---

### TC-1.3.7: Admin View All Deleted Entries
**Objective:** Verify admin can view all deleted entries  
**Preconditions:** User has admin role  
**Test Steps:**
1. Navigate to admin panel
2. Go to "Deleted Entries" section
3. Review list

**Expected Results:**
- Complete list of all soft-deleted entries
- Shows: deletion date, deleted by, reason
- Shows age of deletion (e.g., "Deleted 45 days ago")
- Can sort by deletion date
- Can filter by user who deleted

---

### TC-1.3.8: Permanent Delete After 90 Days
**Objective:** Verify automatic cleanup of old deleted entries  
**Preconditions:** Entry deleted 91 days ago exists  
**Test Steps:**
1. Run cleanup job manually or wait for scheduled run
2. Check database
3. Check cleanup log

**Expected Results:**
- Entries deleted >90 days ago are permanently removed
- Entries deleted <90 days ago remain
- Cleanup log shows number of entries removed
- Audit trail preserved even after permanent deletion

---

### TC-1.3.9: Manual Permanent Delete (Admin)
**Objective:** Verify admin can permanently delete entries  
**Preconditions:** Admin user, soft-deleted entry exists  
**Test Steps:**
1. Go to admin panel
2. Find soft-deleted entry
3. Click "Permanently Delete"
4. Confirm in extra confirmation dialog
5. Check database

**Expected Results:**
- Extra confirmation required ("This cannot be undone")
- Entry completely removed from database
- Audit log shows permanent deletion
- Success message displayed
- Entry disappears from all views

---

### TC-1.3.10: Bulk Restore Deleted Entries
**Objective:** Verify multiple entries can be restored at once  
**Test Steps:**
1. Show deleted entries
2. Select multiple deleted entries
3. Click "Bulk Restore"
4. Confirm action

**Expected Results:**
- Checkbox selection available for deleted entries
- Bulk restore option appears when entries selected
- All selected entries restored
- Success message shows count restored
- Entries appear in active list

---

### TC-1.3.11: Filter Deleted vs Active Entries
**Objective:** Verify filtering options for entry status  
**Test Steps:**
1. Use filter dropdown
2. Select "Active Only"
3. Select "Deleted Only"
4. Select "All Entries"

**Expected Results:**
- Three filter options available
- Active Only: shows only non-deleted (default)
- Deleted Only: shows only soft-deleted
- All: shows both with visual distinction
- Count updates for each filter

---

### TC-1.3.12: Deletion Timestamp Accuracy
**Objective:** Verify deletion timestamp is accurate  
**Test Steps:**
1. Note current time
2. Delete an entry
3. Check deleted_at value
4. Compare with actual time

**Expected Results:**
- deleted_at matches deletion time (±1 second)
- Timezone is handled correctly
- ISO format timestamp stored
- Displayed in user's local timezone

---

### TC-1.3.13: Restore Permission Check
**Objective:** Verify only authorized users can restore  
**Test Steps:**
1. As regular user, try to restore own deleted entry
2. Try to restore another user's deleted entry
3. As admin, restore any entry

**Expected Results:**
- Users can restore their own entries
- Cannot restore others' entries (unless admin)
- Admin can restore any entry
- Appropriate error messages shown

---

### TC-1.3.14: Export Includes Deletion Status
**Objective:** Verify exports handle deleted entries correctly  
**Test Steps:**
1. Export with "Active Only"
2. Export with "Include Deleted"
3. Check exported files

**Expected Results:**
- Export option to include/exclude deleted
- Deleted entries marked in export
- Deletion metadata included (date, by, reason)
- Separate sheets/sections for deleted entries

---

### TC-1.3.15: Search Within Deleted Entries
**Objective:** Verify search works on deleted entries  
**Test Steps:**
1. Show deleted entries
2. Use search function
3. Search for specific deleted entry

**Expected Results:**
- Search includes deleted entries when shown
- Search excludes deleted when hidden
- Can search by deletion reason
- Results indicate deletion status

---

### TC-1.3.16: Cascade Soft Delete
**Objective:** Verify related records handle soft delete properly  
**Test Steps:**
1. Delete entry with related records
2. Check related tables
3. Restore entry
4. Check related records again

**Expected Results:**
- Related records not affected by soft delete
- References remain intact
- Restoration reconnects relationships
- No orphaned records created

---

### TC-1.3.17: Performance with Many Deleted Entries
**Objective:** Verify system performs well with many soft-deleted entries  
**Test Steps:**
1. Create 10,000 entries, soft-delete 5,000
2. Load default view (active only)
3. Toggle to show all
4. Run searches and filters

**Expected Results:**
- Default view loads in <2 seconds
- Toggle to show deleted <3 seconds
- Filters remain responsive
- No significant performance degradation

---

## Test Data Requirements

```sql
-- Active entry
INSERT INTO entries (id, date, hours, deleted_at) 
VALUES ('active-1', '2024-01-15', 8, NULL);

-- Recently deleted entry (should not be auto-cleaned)
INSERT INTO entries (id, date, hours, deleted_at, deleted_by, deletion_reason) 
VALUES ('deleted-1', '2024-01-10', 6, datetime('now', '-10 days'), 'user-1', 'Duplicate entry');

-- Old deleted entry (should be auto-cleaned)
INSERT INTO entries (id, date, hours, deleted_at, deleted_by) 
VALUES ('deleted-old', '2023-01-10', 4, datetime('now', '-91 days'), 'user-1');

-- Invoiced entry (cannot be deleted)
INSERT INTO entries (id, date, hours, invoice_id) 
VALUES ('invoiced-1', '2024-01-05', 8, 'INV-001');
```

## Performance Requirements
- Soft delete operation: <500ms
- Restore operation: <500ms
- Toggle showing deleted: <1 second
- Bulk operations: <2 seconds for 100 entries
- No memory leaks with toggle on/off