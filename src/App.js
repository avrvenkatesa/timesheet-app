import React from "react";
import {
  CssBaseline, Container, Box, Snackbar, Alert, createTheme, ThemeProvider,
  Stack, Button, Paper, Toolbar, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Checkbox, IconButton, Chip,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, Drawer, List, ListItem, ListItemText, Divider
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const theme = createTheme();

/**
 * @typedef {Object} TimeEntry
 * @property {string} id
 * @property {string} date
 * @property {string} client
 * @property {string} project
 * @property {string} task
 * @property {string=} notes
 * @property {string=} startTime
 * @property {string=} endTime
 * @property {number} hours
 * @property {number} rate
 * @property {boolean} isInvoiced
 */

function currency(n) { return (n ?? 0).toFixed(2); }

// ---------------- Edit Dialog (lenient policy) ----------------
function EditEntryDialog({ open, entry, onClose, onSave }) {
  const [values, setValues] = React.useState(entry);
  React.useEffect(() => setValues(entry), [entry]);
  if (!values) return null;

  const handle = (field) => (e) => {
    const v = field === "hours" || field === "rate" ? Number(e.target.value) : e.target.value;
    setValues((prev) => ({ ...prev, [field]: v }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Time Entry</DialogTitle>
      <DialogContent dividers>
        {entry?.isInvoiced && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This entry is already marked as invoiced. Edits are allowed (lenient policy).
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="Date" type="date" value={values.date} onChange={handle("date")} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Client" value={values.client} onChange={handle("client")} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Project" value={values.project} onChange={handle("project")} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Task" value={values.task} onChange={handle("task")} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Notes" value={values.notes || ""} onChange={handle("notes")} fullWidth />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Start" type="time" value={values.startTime || ""} onChange={handle("startTime")} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="End" type="time" value={values.endTime || ""} onChange={handle("endTime")} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Hours" type="number" inputProps={{ step: "0.25" }} value={values.hours} onChange={handle("hours")} fullWidth />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Rate" type="number" value={values.rate} onChange={handle("rate")} fullWidth />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(values)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------- Pending Invoice Drawer ----------------
function PendingInvoiceDrawer({ open, onClose, ids, entries, onRemove, onClear, onCreateInvoice }) {
  const selected = entries.filter((e) => ids.includes(e.id));
  const totalHours = selected.reduce((s, e) => s + (e.hours || 0), 0);
  const totalAmount = selected.reduce((s, e) => s + (e.hours * e.rate), 0);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 380 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptLongIcon />
        <Typography variant="h6">Pending Invoice</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <List dense>
        {selected.map(e => (
          <ListItem key={e.id} secondaryAction={<IconButton edge="end" onClick={() => onRemove(e.id)}><DeleteIcon /></IconButton>}>
            <ListItemText primary={`${e.date} — ${e.client} / ${e.project}`} secondary={`${e.task}${e.notes ? ' — ' + e.notes : ''} · ${e.hours}h @ ${currency(e.rate)}`} />
          </ListItem>
        ))}
        {selected.length === 0 && (
          <ListItem><ListItemText primary="No items yet." secondary="Use 'Include in Invoice' in the table to add items." /></ListItem>
        )}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2">Items: {selected.length}</Typography>
          <Typography variant="body2">Total Hours: {totalHours.toFixed(2)}</Typography>
          <Typography variant="body2">Total Amount: {currency(totalAmount)}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onClear}>Clear</Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" disabled={selected.length === 0} onClick={() => onCreateInvoice(ids)}>Create Invoice</Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

// ---------------- Entries Table ----------------
function EntriesTable({ rows, selectedIds, onSelectionChange, onQuickInclude, onEdit, onBatchCreateInvoice }) {
  const allIds = rows.map(r => r.id);
  const allSelected = selectedIds.length > 0 && selectedIds.length === rows.length;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < rows.length;

  const toggleAll = (checked) => onSelectionChange(checked ? allIds : []);
  const toggleOne = (id) => (e) => {
    const checked = e.target.checked;
    onSelectionChange(checked ? Array.from(new Set([...selectedIds, id])) : selectedIds.filter(x => x !== id));
  };

  return (
    <Paper variant="outlined">
      <Toolbar sx={{ gap: 2 }}>
        {selectedIds.length > 0 ? (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="subtitle1">Selected: {selectedIds.length}</Typography>
            <Tooltip title="Create Invoice from selected">
              <Button size="small" variant="contained" startIcon={<ReceiptLongIcon />} onClick={() => onBatchCreateInvoice(selectedIds)}>Create Invoice</Button>
            </Tooltip>
            <Tooltip title="Clear selection">
              <IconButton onClick={() => onSelectionChange([])}><ClearAllIcon /></IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Typography variant="h6">Time Entries</Typography>
        )}
      </Toolbar>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox indeterminate={indeterminate} checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
              </TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Client / Project</TableCell>
              <TableCell>Task</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedIds.includes(r.id)} onChange={toggleOne(r.id)} />
                </TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Box>{r.client}</Box>
                    <Typography variant="caption" color="text.secondary">{r.project}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Box>{r.task}</Box>
                    {r.notes && <Typography variant="caption" color="text.secondary">{r.notes}</Typography>}
                  </Stack>
                </TableCell>
                <TableCell align="right">{r.hours.toFixed(2)}</TableCell>
                <TableCell align="right">{currency(r.rate)}</TableCell>
                <TableCell align="right">{currency(r.hours * r.rate)}</TableCell>
                <TableCell>
                  {r.isInvoiced ? <Chip size="small" color="success" label="Invoiced" /> : <Chip size="small" label="Open" />}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton onClick={() => onEdit(r.id)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Include in Invoice">
                    <span>
                      <IconButton onClick={() => onQuickInclude(r.id)}><AddShoppingCartIcon /></IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ---------------- App (glue) ----------------
export default function App() {
  const [rows, setRows] = React.useState(/** @type {TimeEntry[]} */([]));
  const [loading, setLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [editId, setEditId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [basketIds, setBasketIds] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/time-entries`);
        const data = await r.json();
        setRows(data);
      } catch (e) {
        setToast({ msg: "Failed to load entries", sev: "error" });
      } finally { setLoading(false); }
    })();
  }, []);

  const entryById = React.useMemo(() => Object.fromEntries(rows.map(r => [r.id, r])), [rows]);

  const addToBasket = (ids) => setBasketIds((prev) => Array.from(new Set([...prev, ...ids])));
  const removeFromBasket = (id) => setBasketIds((prev) => prev.filter(x => x !== id));
  const clearBasket = () => setBasketIds([]);

  const handleQuickInclude = (id) => { addToBasket([id]); setDrawerOpen(true); setToast({ msg: "Added to Pending Invoice", sev: "success" }); };
  const handleEdit = (id) => setEditId(id);

  const handleSave = async (values) => {
    try {
      const r = await fetch(`${API_BASE}/api/time-entries/${values.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!r.ok) throw new Error("Save failed");
      const updated = await r.json();
      setRows((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setToast({ msg: "Entry saved", sev: "success" });
      setEditId(null);
    } catch {
      setToast({ msg: "Save failed", sev: "error" });
    }
  };

  const handleBatchCreateInvoice = (ids) => { addToBasket(ids); setDrawerOpen(true); setToast({ msg: `Added ${ids.length} to Pending Invoice`, sev: "success" }); };

  const handleCreateInvoice = async (ids) => {
    try {
      const r = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: ids }),
      });
      if (!r.ok) throw new Error("Invoice create failed");
      const res = await r.json();
      setToast({ msg: `Invoice ${res.invoiceId} created`, sev: "success" });
      // Refresh list to reflect invoiced status
      const rl = await fetch(`${API_BASE}/api/time-entries`);
      const data = await rl.json();
      setRows(data);
      clearBasket();
      setSelectedIds([]);
      setDrawerOpen(false);
    } catch {
      setToast({ msg: "Invoice creation failed", sev: "error" });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box component="h1" sx={{ fontSize: 22, m: 0 }}>Timesheet</Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setDrawerOpen(true)}>Open Pending Invoice ({basketIds.length})</Button>
          </Stack>
        </Stack>

        <EntriesTable
          rows={rows}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onQuickInclude={handleQuickInclude}
          onEdit={handleEdit}
          onBatchCreateInvoice={handleBatchCreateInvoice}
        />

        <EditEntryDialog
          open={!!editId}
          entry={editId ? entryById[editId] : null}
          onClose={() => setEditId(null)}
          onSave={handleSave}
        />

        <PendingInvoiceDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ids={basketIds}
          entries={rows}
          onRemove={removeFromBasket}
          onClear={clearBasket}
          onCreateInvoice={handleCreateInvoice}
        />

        <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          {toast && <Alert severity={toast.sev} onClose={() => setToast(null)}>{toast.msg}</Alert>}
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}