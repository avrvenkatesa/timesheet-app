# Replit AI Prompt - Story 1.1: Edit Time Entries

## Backend Implementation

Create a PUT endpoint `/api/entries/:id` in Express.js with better-sqlite3 that allows editing time entries. The endpoint should:

1. **Accept these fields in the request body:**
   - date (YYYY-MM-DD format)
   - projectId
   - phaseId
   - taskId
   - taskName
   - billable (boolean)
   - hours (decimal)
   - amount (decimal)
   - currency (3-letter code)
   - notes (text)
   - startTime (HH:MM format)
   - endTime (HH:MM format)

2. **Validation Requirements:**
   - Check if entry exists, return 404 if not
   - Verify entry is not invoiced (invoice_id must be null), return 403 with message "This entry is part of Invoice #[number] and cannot be modified" if invoiced
   - Validate date is not in the future
   - Validate hours is positive and <= 24
   - Check for time overlaps with other entries for the same user on the same date
   - Ensure endTime > startTime if both provided
   - Validate currency is a valid 3-letter code

3. **Database Operations:**
   - Update the entry with provided fields
   - Set updated_at to current timestamp
   - Log the change in entry_changelog table with: entry_id, field_name, old_value, new_value, changed_at
   - Use a transaction to ensure both updates succeed or both fail

4. **Response:**
   - Return the updated entry with 200 status
   - Include success message
   - Return appropriate error messages for validation failures

## Frontend Implementation

Create a React modal component `EditEntryModal.js` using Tailwind CSS that:

1. **Modal Structure:**
   - Overlay with semi-transparent background
   - Modal dialog with header "Edit Time Entry", body with form, and footer with buttons
   - Close button (X) in header
   - Cancel and Save buttons in footer

2. **Form Fields:**
   - Date picker for entry date
   - Project dropdown (load projects from API)
   - Phase dropdown (filtered by selected project)
   - Task dropdown (filtered by selected phase)
   - Task name text input
   - Start time and end time inputs (with time picker)
   - Hours input (auto-calculate from start/end if both provided)
   - Billable checkbox
   - Amount input (auto-calculate from hours × project rate)
   - Currency selector
   - Notes textarea

3. **State Management:**
   - Use useState for form data
   - Use useState for loading state
   - Use useState for error messages
   - Prefill form with current entry data passed as prop

4. **Validation:**
   - Client-side validation before submission
   - Disable Save button while loading
   - Show inline error messages for invalid fields
   - Prevent submission if validation fails

5. **API Integration:**
   - Call PUT `/api/entries/:id` on form submission
   - Show loading spinner during save
   - Handle success: show toast notification, close modal, trigger parent refresh
   - Handle errors: display error message in modal

6. **User Experience:**
   - Auto-focus first field when modal opens
   - Enable keyboard navigation (Tab between fields)
   - Close on Escape key
   - Confirm unsaved changes if user tries to close with modifications

Example structure:
```javascript
const EditEntryModal = ({ entry, isOpen, onClose, onSave }) => {
  // Implementation here
}
```

Include proper error handling, loading states, and success feedback using toast notifications.