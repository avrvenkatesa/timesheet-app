# Test Cases - Story 1.1: Edit Time Entries

## Test Suite: Edit Time Entries Functionality

### TC-1.1.1: Display Edit Button
**Objective:** Verify edit button appears on each entry row  
**Preconditions:** User is logged in and viewing time entries list  
**Test Steps:**
1. Navigate to time entries page
2. Verify at least one time entry exists
3. Locate the entry row

**Expected Results:**
- Edit button is visible on each entry row
- Edit button has appropriate icon or text label
- Edit button is clickable

---

### TC-1.1.2: Open Edit Modal with Prefilled Data
**Objective:** Verify edit modal opens with current entry data  
**Preconditions:** Time entry exists in the list  
**Test Steps:**
1. Click Edit button on a time entry
2. Wait for modal to open
3. Verify all fields are prefilled

**Expected Results:**
- Modal opens within 1 second
- All fields show current values:
  - Date matches entry date
  - Project/Phase/Task are selected
  - Hours, amount, notes are populated
  - Billable checkbox reflects current state

---

### TC-1.1.3: Successfully Edit Entry
**Objective:** Verify successful entry update  
**Preconditions:** Non-invoiced entry exists  
**Test Steps:**
1. Click Edit on a non-invoiced entry
2. Change hours from 4 to 6
3. Update notes to "Updated task description"
4. Click Save

**Expected Results:**
- Loading indicator appears during save
- Success toast notification shows
- Modal closes automatically
- Entry list refreshes
- Updated values appear in the list
- updated_at timestamp is updated in database

---

### TC-1.1.4: Validate Required Fields
**Objective:** Verify required field validation  
**Test Steps:**
1. Open edit modal
2. Clear the date field
3. Clear the hours field
4. Clear the project selection
5. Try to save

**Expected Results:**
- Save button remains disabled or
- Error messages appear under empty required fields
- Form does not submit
- Modal remains open

---

### TC-1.1.5: Prevent Editing Invoiced Entry
**Objective:** Verify invoiced entries cannot be edited  
**Preconditions:** Entry with invoice_id = 'INV-2024-001' exists  
**Test Steps:**
1. Attempt to edit an invoiced entry
2. Try to modify any field
3. Click Save

**Expected Results:**
- Edit button is disabled/hidden for invoiced entries OR
- Modal shows read-only message
- Error message: "This entry is part of Invoice #INV-2024-001 and cannot be modified"
- No changes are saved

---

### TC-1.1.6: Validate Time Overlap
**Objective:** Verify system prevents overlapping time entries  
**Preconditions:** Entry exists for 9:00-12:00 on 2024-01-15  
**Test Steps:**
1. Edit another entry for same date
2. Set time to 11:00-13:00 (overlaps with existing)
3. Click Save

**Expected Results:**
- Validation error appears
- Message indicates time overlap conflict
- Save is prevented
- User must adjust times to proceed

---

### TC-1.1.7: Auto-calculate Hours from Time
**Objective:** Verify hours auto-calculation  
**Test Steps:**
1. Open edit modal
2. Set start time to 09:00
3. Set end time to 17:30
4. Tab out of end time field

**Expected Results:**
- Hours field automatically updates to 8.5
- Amount recalculates based on new hours
- Manual override of hours is still possible

---

### TC-1.1.8: Auto-calculate Amount
**Objective:** Verify amount calculation from hours × rate  
**Preconditions:** Project has hourly rate of $100  
**Test Steps:**
1. Edit entry for project with known rate
2. Change hours to 5.5
3. Verify billable is checked

**Expected Results:**
- Amount automatically updates to $550
- Currency remains consistent with project
- Non-billable entries show amount as 0

---

### TC-1.1.9: Validate Future Date Prevention
**Objective:** Verify entries cannot be dated in future  
**Test Steps:**
1. Open edit modal
2. Select tomorrow's date
3. Try to save

**Expected Results:**
- Validation error appears
- Message: "Cannot create entries for future dates"
- Save is prevented

---

### TC-1.1.10: Handle Network Errors
**Objective:** Verify graceful handling of network errors  
**Test Steps:**
1. Open edit modal
2. Disconnect network/simulate 500 error
3. Make changes and click Save
4. Reconnect network

**Expected Results:**
- Error message appears in modal
- Modal remains open with data intact
- User can retry save
- No data loss occurs

---

### TC-1.1.11: Unsaved Changes Warning
**Objective:** Verify warning for unsaved changes  
**Test Steps:**
1. Open edit modal
2. Modify any field
3. Click X or press Escape
4. Confirm or cancel the warning

**Expected Results:**
- Warning dialog appears: "You have unsaved changes. Are you sure?"
- Confirm closes modal without saving
- Cancel returns to edit modal
- No warning if no changes made

---

### TC-1.1.12: Keyboard Navigation
**Objective:** Verify keyboard accessibility  
**Test Steps:**
1. Open edit modal
2. Press Tab repeatedly
3. Press Shift+Tab to go backward
4. Press Escape to close

**Expected Results:**
- Tab moves through all fields in logical order
- Shift+Tab moves backward
- Enter in form submits (if valid)
- Escape closes modal (with unsaved warning if applicable)

---

### TC-1.1.13: Audit Trail Creation
**Objective:** Verify changes are logged in audit trail  
**Preconditions:** Database has entry_changelog table  
**Test Steps:**
1. Note original values of an entry
2. Edit entry: change hours from 4 to 6, notes from "Task A" to "Task B"
3. Save changes
4. Query entry_changelog table

**Expected Results:**
- Two records created in entry_changelog:
  - Record 1: field_name='hours', old_value='4', new_value='6'
  - Record 2: field_name='notes', old_value='Task A', new_value='Task B'
- changed_at timestamp is current time
- entry_id matches edited entry

---

### TC-1.1.14: Currency Validation
**Objective:** Verify currency code validation  
**Test Steps:**
1. Open edit modal
2. Try to enter invalid currency code "XXX"
3. Try to enter valid code "USD"
4. Save

**Expected Results:**
- Invalid currency shows error
- Valid 3-letter codes are accepted
- Dropdown/autocomplete suggests valid currencies

---

### TC-1.1.15: Maximum Hours Validation
**Objective:** Verify hours cannot exceed 24  
**Test Steps:**
1. Open edit modal
2. Enter 25 in hours field
3. Try to save

**Expected Results:**
- Validation error appears
- Message: "Hours cannot exceed 24"
- Save is prevented
- Field highlights in red

---

## Test Data Requirements

```sql
-- Non-invoiced entry for editing
INSERT INTO entries (id, date, project_id, hours, amount, billable, invoice_id) 
VALUES ('entry-1', '2024-01-15', 'proj-1', 4, 400, 1, NULL);

-- Invoiced entry (should not be editable)
INSERT INTO entries (id, date, project_id, hours, amount, billable, invoice_id) 
VALUES ('entry-2', '2024-01-14', 'proj-1', 8, 800, 1, 'INV-2024-001');

-- Entry for overlap testing
INSERT INTO entries (id, date, start_time, end_time, project_id) 
VALUES ('entry-3', '2024-01-15', '09:00', '12:00', 'proj-1');
```

## Performance Criteria
- Modal opens within 1 second
- Save operation completes within 2 seconds
- Form remains responsive during API calls
- No memory leaks on repeated open/close