# Test Cases - Story 2.1: Filter by Date Range

## Test Suite: Date Range Filtering

### TC-2.1.1: Display Date Range Picker
**Objective:** Verify date range picker UI is accessible  
**Preconditions:** Entries exist across multiple dates  
**Test Steps:**
1. Navigate to entries list
2. Locate date filter component
3. Click on date filter button

**Expected Results:**
- Date filter button is visible with calendar icon
- Clicking opens dropdown/modal
- Shows preset options and custom range
- Current filter displayed on button
- UI is responsive and accessible

---

### TC-2.1.2: Filter by Today Preset
**Objective:** Verify "Today" preset works correctly  
**Test Steps:**
1. Click date filter
2. Select "Today" preset
3. Observe filtered results

**Expected Results:**
- Only today's entries shown
- Summary shows today's date
- Entry count matches today's entries
- Filter persists until changed
- Button shows "Today" label

---

### TC-2.1.3: Filter by This Week Preset
**Objective:** Verify "This Week" preset shows current week  
**Test Steps:**
1. Click date filter
2. Select "This Week" preset
3. Verify date range

**Expected Results:**
- Shows Monday to Sunday of current week
- All entries within week displayed
- Week boundaries correct (locale-aware)
- Summary shows week date range
- Handles week spanning months correctly

---

### TC-2.1.4: Filter by Last Month Preset
**Objective:** Verify "Last Month" preset  
**Preconditions:** Current date is March 15, 2024  
**Test Steps:**
1. Select "Last Month" preset
2. Verify results

**Expected Results:**
- Shows all February 2024 entries
- Date range: Feb 1 - Feb 29, 2024
- Handles month boundaries correctly
- Accounts for leap years
- No March entries included

---

### TC-2.1.5: Custom Date Range Selection
**Objective:** Verify custom date range works  
**Test Steps:**
1. Click date filter
2. Select "Custom Range"
3. Set From: 2024-01-01
4. Set To: 2024-01-31
5. Click Apply

**Expected Results:**
- Date pickers appear for custom range
- Can select any valid dates
- Shows entries within selected range
- Button displays selected date range
- Dates are inclusive (includes both start and end dates)

---

### TC-2.1.6: Date Range Validation
**Objective:** Verify date range validation  
**Test Steps:**
1. Select custom range
2. Set To date before From date
3. Try to apply filter

**Expected Results:**
- Error message: "Start date must be before end date"
- Filter not applied
- Must correct dates to proceed
- Apply button disabled if invalid

---

### TC-2.1.7: Future Date Prevention
**Objective:** Verify cannot filter future dates  
**Test Steps:**
1. Select custom range
2. Try to select tomorrow's date
3. Observe date picker behavior

**Expected Results:**
- Future dates are disabled/grayed out
- Cannot select dates after today
- Max date is today
- Clear visual indication of disabled dates

---

### TC-2.1.8: Clear Date Filter
**Objective:** Verify filter can be cleared  
**Test Steps:**
1. Apply any date filter
2. Click clear/X button
3. Observe results

**Expected Results:**
- Clear button visible when filter active
- Clicking clear removes all date filters
- All entries shown again
- Summary updated to show all entries
- Filter UI resets to default state

---

### TC-2.1.9: Filter Persistence During Session
**Objective:** Verify filters persist during session  
**Test Steps:**
1. Apply "This Week" filter
2. Navigate to another page
3. Return to entries list

**Expected Results:**
- Filter remains applied
- Same date range active
- Results still filtered
- UI shows active filter
- Persists until manually changed/cleared

---

### TC-2.1.10: Auto-Update on Filter Change
**Objective:** Verify entries update automatically  
**Test Steps:**
1. Apply date filter
2. Observe loading behavior
3. Check results

**Expected Results:**
- Loading indicator while fetching
- Entries update without page refresh
- Smooth transition between states
- No duplicate API calls
- Error handling if request fails

---

### TC-2.1.11: Summary Statistics Update
**Objective:** Verify summary updates with filter  
**Test Steps:**
1. Note total hours/amount without filter
2. Apply "Yesterday" filter
3. Check summary statistics

**Expected Results:**
- Total hours reflects filtered entries only
- Total amount calculated for filtered entries
- Entry count shows filtered count
- Date range displayed in summary
- Calculations are accurate

---

### TC-2.1.12: Export Filtered Results
**Objective:** Verify filtered export works  
**Test Steps:**
1. Apply date filter (This Month)
2. Click Export button
3. Open exported file

**Expected Results:**
- Export contains only filtered entries
- Date range included in export metadata
- Filename includes date range
- Summary totals match filtered view
- Export format (CSV/PDF) preserved

---

### TC-2.1.13: Multiple Filter Combination
**Objective:** Verify date filter works with other filters  
**Preconditions:** Other filters available (project, status)  
**Test Steps:**
1. Apply project filter
2. Apply date range filter
3. Verify results

**Expected Results:**
- Both filters applied simultaneously
- Results match both criteria
- Filter indicators show both active
- Can clear filters independently
- Summary reflects combined filters

---

### TC-2.1.14: Keyboard Shortcuts
**Objective:** Verify keyboard shortcuts for common ranges  
**Test Steps:**
1. Press Alt+T (Today)
2. Press Alt+W (This Week)
3. Press Alt+M (This Month)

**Expected Results:**
- Shortcuts trigger respective filters
- Visual feedback on activation
- Shortcuts documented/tooltips
- Can be disabled if needed
- Accessible via screen readers

---

### TC-2.1.15: Mobile Responsiveness
**Objective:** Verify date filter works on mobile  
**Test Steps:**
1. Access on mobile device
2. Use date filter
3. Select presets and custom range

**Expected Results:**
- Touch-friendly interface
- Date pickers work on mobile
- Dropdown doesn't overflow screen
- Native date inputs on mobile
- Clear button easily tappable

---

### TC-2.1.16: Performance with Large Date Ranges
**Objective:** Verify performance with year-long ranges  
**Test Steps:**
1. Select custom range
2. Set 1-year range (365 days)
3. Apply filter
4. Measure response time

**Expected Results:**
- Response within 2 seconds
- Pagination if >1000 entries
- No browser freezing
- Smooth scrolling maintained
- Memory usage acceptable

---

### TC-2.1.17: Empty State Handling
**Objective:** Verify behavior when no entries in range  
**Test Steps:**
1. Select date range with no entries
2. Observe display

**Expected Results:**
- Clear message: "No entries found for selected date range"
- Suggestion to adjust filter
- Option to clear filter
- Summary shows 0 entries, 0 hours
- Export button disabled/hidden

---

### TC-2.1.18: Timezone Handling
**Objective:** Verify correct timezone handling  
**Test Steps:**
1. Create entry at 11 PM on Jan 31
2. Filter by January
3. Change system timezone
4. Re-check filter

**Expected Results:**
- Entry consistently included in January
- Timezone changes don't affect date filtering
- Dates stored/compared in consistent format
- Display respects user timezone
- No edge case issues at day boundaries

---

## Test Data Requirements

```sql
-- Entries across different time periods
INSERT INTO entries (id, date, hours, project_id) VALUES
  ('today-1', date('now'), 4, 'proj-1'),
  ('thisweek-1', date('now', '-3 days'), 8, 'proj-1'),
  ('lastweek-1', date('now', '-10 days'), 5, 'proj-1'),
  ('thismonth-1', date('now', 'start of month'), 7, 'proj-1'),
  ('lastmonth-1', date('now', 'start of month', '-1 month'), 6, 'proj-1'),
  ('old-1', date('now', '-100 days'), 8, 'proj-1');
```

## Performance Requirements
- Filter application: <500ms
- Preset selection: <200ms
- Custom range validation: instant
- Export generation: <3 seconds
- No memory leaks with repeated filtering