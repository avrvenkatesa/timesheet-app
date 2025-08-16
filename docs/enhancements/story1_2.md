# Replit AI Prompt - Story 1.2: Prevent Editing Invoiced Entries

## Backend Implementation

Modify the Express.js API to enforce invoice protection:

1. **Update GET /api/entries endpoint to include invoice information:**
```javascript
// The query should JOIN with invoices table to get invoice number
// Return structure should include:
{
  id: 'entry-id',
  date: '2024-01-15',
  hours: 8,
  invoice_id: 'inv-123',
  invoice_number: 'INV-2024-0001',  // from joined invoices table
  // ... other fields
}
```

2. **Modify PUT /api/entries/:id endpoint:**
   - First check if entry has invoice_id
   - If invoice_id is not null:
     - Allow ONLY notes field to be updated
     - Return 403 for any other field modifications
     - Include invoice number in error message
   - Add this check before any other validation
   - Log attempt to modify invoiced entry in audit log

3. **Modify DELETE /api/entries/:id endpoint:**
   - Check if entry has invoice_id
   - If invoiced, return 403 with message: "Cannot delete entry that is part of Invoice #[number]"
   - Log deletion attempt in audit log

## Frontend Implementation

Create an `InvoicedBadge` component and modify the entries table:

1. **InvoicedBadge Component (`InvoicedBadge.js`):**
```javascript
const InvoicedBadge = ({ invoiceNumber }) => {
  // Create a badge with:
  // - Lock icon
  // - Text "Invoiced"
  // - Invoice number on hover/tooltip
  // - Distinctive color (amber/yellow background)
  // Use Tailwind classes for styling
}
```

2. **Modify EntriesTable Component:**
   - Check if entry.invoice_id exists
   - If invoiced:
     - Show InvoicedBadge instead of or next to status
     - Hide or disable Edit button
     - Hide or disable Delete button
     - Show disabled/grayed out appearance for these actions
   - Add tooltip on disabled buttons: "This entry is part of Invoice #[number] and cannot be modified"

3. **Modify EditEntryModal Component:**
   - Accept `isInvoiced` and `invoiceNumber` props
   - If entry is invoiced:
     - Show warning banner at top: "This entry is part of Invoice #[number]. Only notes can be edited."
     - Disable all fields except notes
     - Gray out disabled fields
     - Change Save button text to "Update Notes"
   - Only send notes field in PUT request for invoiced entries

4. **Visual Indicators:**
   - Use consistent color scheme for invoiced status (e.g., amber-100 background)
   - Lock icon (from Heroicons or similar)
   - Cursor changes to not-allowed on disabled elements
   - Clear visual distinction between editable and locked entries

5. **User Notifications:**
   - If user attempts to edit invoiced entry via keyboard shortcut or direct URL:
     - Show toast notification with error message
     - Redirect to view-only mode
   - Clicking on invoiced entry could open read-only view instead of edit modal

## State Management

Update the entry list state management:

1. **Entry Status Flags:**
```javascript
const entryStatus = {
  isEditable: !entry.invoice_id,
  isDeletable: !entry.invoice_id,
  isInvoiced: !!entry.invoice_id,
  invoiceNumber: entry.invoice_number
};
```

2. **Action Handlers:**
```javascript
const handleEdit = (entry) => {
  if (entry.invoice_id) {
    showToast('This entry is invoiced and cannot be fully edited', 'warning');
    // Open limited edit modal (notes only)
  } else {
    // Open full edit modal
  }
};

const handleDelete = (entry) => {
  if (entry.invoice_id) {
    showToast(`Cannot delete entry in Invoice ${entry.invoice_number}`, 'error');
    return;
  }
  // Proceed with deletion
};
```

## Styling with Tailwind CSS

```javascript
// For invoiced entries row
className={`${entry.invoice_id ? 'bg-amber-50 border-l-4 border-amber-400' : ''}`}

// For disabled edit button
className={`${entry.invoice_id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}`}

// For badge
className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
```

Include proper ARIA labels for accessibility and ensure keyboard navigation respects the disabled states.