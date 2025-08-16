# Test Cases - Story 1.2: Prevent Editing Invoiced Entries

## Test Suite: Prevent Editing Invoiced Entries

### TC-1.2.1: Display Invoiced Badge
**Objective:** Verify invoiced entries show appropriate badge  
**Preconditions:** Entry with invoice_id='INV-001' and invoice_number='INV-2024-0001' exists  
**Test Steps:**
1. Navigate to time entries list
2. Locate invoiced entry
3. Examine the entry row display

**Expected Results:**
- "Invoiced" badge is displayed prominently
- Badge includes lock icon
- Badge has distinctive color (amber/yellow)
- Invoice number shown in tooltip on hover
- Entry row has different background color

---

### TC-1.2.2: Hide Edit Button for Invoiced Entries
**Objective:** Verify edit button is hidden/disabled for invoiced entries  
**Preconditions:** Both invoiced and non-invoiced entries exist  
**Test Steps:**
1. View time entries list
2. Compare invoiced vs non-invoiced entry rows
3. Attempt to find edit button on invoiced entry

**Expected Results:**
- Non-invoiced entries show active Edit button
- Invoiced entries either:
  - Have no Edit button visible OR
  - Have disabled Edit button with opacity
- Hovering over disabled button shows tooltip: "This entry is part of Invoice #INV-2024-0001 and cannot be modified"

---

### TC-1.2.3: Hide Delete Button for Invoiced Entries
**Objective:** Verify delete button is hidden/disabled for invoiced entries  
**Test Steps:**
1. View time entries list
2. Locate invoiced entry
3. Look for delete button

**Expected Results:**
- Delete button is hidden or visibly disabled
- If visible but disabled, cursor shows not-allowed
- Cannot trigger delete action via keyboard
- No delete confirmation dialog appears

---

### TC-1.2.4: Backend Prevents Full Edit of Invoiced Entry
**Objective:** Verify API rejects edit attempts on invoiced entries  
**Test Steps:**
1. Get invoiced entry ID
2. Send PUT request to /api/entries/{id} with changed hours
3. Check response

**Expected Results:**
- API returns 403 Forbidden status
- Error message: "This entry is part of Invoice #INV-2024-0001 and cannot be modified"
- Database values remain unchanged
- Audit log records the attempted modification

---

### TC-1.2.5: Allow Notes-Only Edit for Invoiced Entries
**Objective:** Verify only notes field can be edited on invoiced entries  
**Test Steps:**
1. Click on invoiced entry (if edit is partially allowed)
2. Modal opens with warning banner
3. Try to edit various fields
4. Edit notes field
5. Save

**Expected Results:**
- Warning banner shows: "This entry is part of Invoice #INV-2024-0001. Only notes can be edited."
- All fields except notes are disabled/read-only
- Notes field remains editable
- Save only updates notes field
- Success message confirms notes updated

---

### TC-1.2.6: Backend Prevents Deletion of Invoiced Entry
**Objective:** Verify API prevents deletion of invoiced entries  
**Test Steps:**
1. Get invoiced entry ID
2. Send DELETE request to /api/entries/{id}
3. Check response and database

**Expected Results:**
- API returns 403 Forbidden
- Error message: "Cannot delete entry that is part of Invoice #INV-2024-0001"
- Entry remains in database
- Audit log records deletion attempt

---

### TC-1.2.7: Visual Distinction for Invoiced Entries
**Objective:** Verify invoiced entries are visually distinct  
**Test Steps:**
1. View list with both invoiced and non-invoiced entries
2. Compare visual appearance
3. Check color contrast for accessibility

**Expected Results:**
- Invoiced entries have different background color (e.g., amber-50)
- Left border or other visual indicator
- Sufficient color contrast (WCAG AA compliant)
- Visual distinction is clear without relying solely on color

---

### TC-1.2.8: Keyboard Navigation Respects Invoice Status
**Objective:** Verify keyboard users cannot edit invoiced entries  
**Test Steps:**
1. Navigate to invoiced entry using Tab key
2. Press Enter or Space on edit button area
3. Try keyboard shortcuts for edit (if any exist)

**Expected Results:**
- Disabled buttons are skipped in tab order OR
- Pressing Enter/Space on disabled button does nothing
- Screen reader announces "disabled" status
- No modal opens for invoiced entries

---

### TC-1.2.9: Batch Operations Exclude Invoiced Entries
**Objective:** Verify bulk operations skip invoiced entries  
**Test Steps:**
1. Select multiple entries including invoiced ones
2. Try bulk delete
3. Try bulk edit

**Expected Results:**
- Invoiced entries cannot be selected OR
- Warning appears: "X entries skipped (already invoiced)"
- Only non-invoiced entries are affected
- Clear feedback on what was/wasn't processed

---

### TC-1.2.10: Invoice Number Display in Entry Details
**Objective:** Verify invoice reference is shown clearly  
**Test Steps:**
1. View detailed view of invoiced entry
2. Check for invoice information
3. Click on invoice number (if linkable)

**Expected Results:**
- Invoice number is prominently displayed
- Shows as "Invoice: #INV-2024-0001"
- Possibly linkable to invoice details
- Cannot be modified or removed

---

### TC-1.2.11: Filter by Invoice Status
**Objective:** Verify ability to filter by invoice status  
**Test Steps:**
1. Use filter dropdown/toggle
2. Select "Invoiced" entries only
3. Select "Not Invoiced" entries only
4. Clear filter

**Expected Results:**
- Can filter to show only invoiced entries
- Can filter to show only non-invoiced entries
- Invoice badge appears consistently in filtered views
- Count of filtered entries is accurate

---

### TC-1.2.12: Direct URL Edit Prevention
**Objective:** Verify direct URL access is blocked for invoiced entries  
**Test Steps:**
1. Get URL for editing specific invoiced entry
2. Navigate directly to /entries/edit/{invoiced-entry-id}
3. Observe behavior

**Expected Results:**
- Redirect to view-only mode OR
- Error message displayed
- Toast notification: "This entry is invoiced and cannot be edited"
- No edit form is shown

---

### TC-1.2.13: Mobile View Invoice Indicators
**Objective:** Verify invoice status is clear on mobile devices  
**Test Steps:**
1. View entries list on mobile device/responsive view
2. Check invoiced entry appearance
3. Try to interact with invoiced entries

**Expected Results:**
- Invoice badge is visible on mobile
- Touch interactions respect disabled state
- Clear visual indicators even on small screens
- Swipe actions (if any) are disabled for invoiced entries

---

### TC-1.2.14: Export Includes Invoice Status
**Objective:** Verify exports show invoice information  
**Test Steps:**
1. Export entries to CSV/PDF
2. Check invoiced entries in export
3. Verify invoice information is included

**Expected Results:**
- Export includes invoice_id column
- Export includes invoice_number column
- Invoiced status is clear in export
- Can filter export by invoice status

---

### TC-1.2.15: Performance with Many Invoiced Entries
**Objective:** Verify UI performs well with many invoiced entries  
**Test Steps:**
1. Load page with 100+ entries, 50% invoiced
2. Measure page load time
3. Test scrolling performance
4. Test filter performance

**Expected Results:**
- Page loads within 2 seconds
- Smooth scrolling without lag
- Filters apply within 1 second
- No memory leaks with badge components

---

## Test Data Requirements

```sql
-- Invoiced entry
INSERT INTO entries (id, date, project_id, hours, invoice_id, billable) 
VALUES ('entry-inv-1', '2024-01-10', 'proj-1', 8, 'inv-001', 1);

INSERT INTO invoices (id, invoice_number, project_id, created_at)
VALUES ('inv-001', 'INV-2024-0001', 'proj-1', '2024-01-15');

-- Non-invoiced entry
INSERT INTO entries (id, date, project_id, hours, invoice_id, billable) 
VALUES ('entry-reg-1', '2024-01-11', 'proj-1', 6, NULL, 1);

-- Partially invoiced project
INSERT INTO entries (id, date, project_id, hours, invoice_id) 
VALUES 
  ('entry-mix-1', '2024-01-12', 'proj-2', 4, 'inv-002'),
  ('entry-mix-2', '2024-01-13', 'proj-2', 5, NULL);
```

## Accessibility Requirements
- ARIA labels for invoice status
- Screen reader announces "invoiced" status
- Keyboard navigation properly handles disabled states
- Color is not sole indicator of status
- Sufficient color contrast (4.5:1 minimum)