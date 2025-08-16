# Replit AI Prompt - Story 2.1: Filter by Date Range

## Backend Implementation

Enhance the GET /api/entries endpoint to support date range filtering:

```javascript
app.get('/api/entries', async (req, res) => {
  const {
    dateFrom,
    dateTo,
    preset, // 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'custom'
    includeDeleted = false
  } = req.query;

  // Handle preset date ranges
  const dateRange = getDateRangeFromPreset(preset) || { dateFrom, dateTo };

  // Build SQL query with date filters
  let query = `
    SELECT e.*, p.name as project_name, p.hourly_rate
    FROM entries e
    LEFT JOIN projects p ON e.project_id = p.id
    WHERE 1=1
  `;

  const params = [];

  if (dateRange.dateFrom) {
    query += ` AND e.date >= ?`;
    params.push(dateRange.dateFrom);
  }

  if (dateRange.dateTo) {
    query += ` AND e.date <= ?`;
    params.push(dateRange.dateTo);
  }

  if (!includeDeleted) {
    query += ` AND e.deleted_at IS NULL`;
  }

  query += ` ORDER BY e.date DESC, e.start_time DESC`;

  // Execute query and return results with metadata
  const entries = db.prepare(query).all(...params);

  // Calculate summary statistics
  const summary = calculateSummary(entries);

  res.json({
    entries,
    summary: {
      totalHours: summary.totalHours,
      totalAmount: summary.totalAmount,
      entryCount: entries.length,
      dateRange: {
        from: dateRange.dateFrom,
        to: dateRange.dateTo,
        preset
      }
    }
  });
});

// Helper function for date presets
function getDateRangeFromPreset(preset) {
  const today = new Date();
  const ranges = {
    today: {
      dateFrom: formatDate(today),
      dateTo: formatDate(today)
    },
    yesterday: {
      dateFrom: formatDate(addDays(today, -1)),
      dateTo: formatDate(addDays(today, -1))
    },
    thisWeek: {
      dateFrom: formatDate(startOfWeek(today)),
      dateTo: formatDate(endOfWeek(today))
    },
    lastWeek: {
      dateFrom: formatDate(startOfWeek(addDays(today, -7))),
      dateTo: formatDate(endOfWeek(addDays(today, -7)))
    },
    thisMonth: {
      dateFrom: formatDate(startOfMonth(today)),
      dateTo: formatDate(endOfMonth(today))
    },
    lastMonth: {
      dateFrom: formatDate(startOfMonth(addMonths(today, -1))),
      dateTo: formatDate(endOfMonth(addMonths(today, -1)))
    },
    last30Days: {
      dateFrom: formatDate(addDays(today, -30)),
      dateTo: formatDate(today)
    },
    last90Days: {
      dateFrom: formatDate(addDays(today, -90)),
      dateTo: formatDate(today)
    }
  };

  return ranges[preset];
}
```

## Frontend Implementation

Create a comprehensive date filter component:

1. **DateRangeFilter Component:**
```javascript
import React, { useState, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/outline';

const DateRangeFilter = ({ onFilterChange, initialValues = {} }) => {
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialValues.dateTo || '');
  const [preset, setPreset] = useState(initialValues.preset || 'custom');
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last90Days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);

    if (newPreset !== 'custom') {
      // Clear custom dates when preset selected
      setDateFrom('');
      setDateTo('');
      onFilterChange({ preset: newPreset });
    }
  };

  const handleCustomRangeSubmit = () => {
    if (dateFrom && dateTo) {
      if (new Date(dateFrom) > new Date(dateTo)) {
        alert('Start date must be before end date');
        return;
      }
      onFilterChange({ dateFrom, dateTo, preset: 'custom' });
      setIsOpen(false);
    }
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setPreset('custom');
    onFilterChange({});
  };

  const getDisplayText = () => {
    if (preset !== 'custom') {
      return presets.find(p => p.value === preset)?.label;
    }
    if (dateFrom && dateTo) {
      return `${formatDisplayDate(dateFrom)} - ${formatDisplayDate(dateTo)}`;
    }
    return 'Select Date Range';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50"
      >
        <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
        <span>{getDisplayText()}</span>
        {(preset !== 'custom' || (dateFrom && dateTo)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFilter();
            }}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Presets</h3>
              <div className="grid grid-cols-3 gap-2">
                {presets.map(p => (
                  <button
                    key={p.value}
                    onClick={() => handlePresetChange(p.value)}
                    className={`px-3 py-1 text-sm rounded ${
                      preset === p.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {preset === 'custom' && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Range</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <button
                    onClick={handleCustomRangeSubmit}
                    disabled={!dateFrom || !dateTo}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

2. **Integration with Entries List:**
```javascript
const EntriesList = () => {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({});
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [filters]);

  const fetchEntries = async () => {
    setLoading(true);
    const queryParams = new URLSearchParams(filters);

    try {
      const response = await fetch(`/api/entries?${queryParams}`);
      const data = await response.json();
      setEntries(data.entries);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (dateFilter) => {
    setFilters(prev => ({ ...prev, ...dateFilter }));
  };

  const exportFilteredData = () => {
    const queryParams = new URLSearchParams(filters);
    window.open(`/api/entries/export?${queryParams}`);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <DateRangeFilter 
          onFilterChange={handleDateFilterChange}
          initialValues={filters}
        />
        <button
          onClick={exportFilteredData}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Export Filtered Results
        </button>
      </div>

      {summary.dateRange && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm">
            Showing {summary.entryCount} entries from {formatDisplayDate(summary.dateRange.from)} to {formatDisplayDate(summary.dateRange.to)}
          </p>
          <p className="text-sm font-medium">
            Total: {summary.totalHours} hours | ${summary.totalAmount}
          </p>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <EntriesTable entries={entries} />
      )}
    </div>
  );
};
```

3. **Persistent Filter State:**
```javascript
// Use localStorage to persist filter preferences
const usePersistentFilters = (key) => {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    localStorage.setItem(key, JSON.stringify(newFilters));
  };

  return [filters, updateFilters];
};
```

Include keyboard shortcuts for common date ranges, visual calendar picker for custom ranges, and clear visual feedback for active filters.