
import React, { useState, useEffect } from 'react';

const EditEntryModal = ({ entry, isOpen, onClose, onSave, projects }) => {
  const [formData, setFormData] = useState({
    date: '',
    projectId: '',
    phaseId: '',
    taskId: '',
    taskName: '',
    startTime: '',
    endTime: '',
    hours: '',
    billable: false,
    amount: '',
    currency: 'USD',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Prefill form when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || '',
        projectId: entry.projectId || '',
        phaseId: entry.phaseId || '',
        taskId: entry.taskId || '',
        taskName: entry.taskName || '',
        startTime: entry.startTime || '',
        endTime: entry.endTime || '',
        hours: entry.hours || '',
        billable: entry.billable || false,
        amount: entry.amount || '',
        currency: entry.currency || 'USD',
        notes: entry.notes || ''
      });
      setHasChanges(false);
      setErrors({});
    }
  }, [entry]);

  const getProject = (id) => projects.find(p => p.id === id);
  const getPhase = (p, phaseId) => (p?.phases || []).find(ph => ph.id === phaseId);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-calculate hours from time
    if (field === 'startTime' || field === 'endTime') {
      const start = field === 'startTime' ? value : formData.startTime;
      const end = field === 'endTime' ? value : formData.endTime;
      
      if (start && end && start < end) {
        const hours = calculateHours(start, end);
        setFormData(prev => ({ ...prev, hours }));
        
        // Auto-calculate amount if billable
        const project = getProject(formData.projectId);
        if (formData.billable && project?.rate) {
          setFormData(prev => ({ 
            ...prev, 
            amount: (hours * project.rate).toFixed(2) 
          }));
        }
      }
    }

    // Auto-calculate amount from hours or billable change
    if (field === 'hours' || field === 'billable') {
      const hours = field === 'hours' ? value : formData.hours;
      const billable = field === 'billable' ? value : formData.billable;
      const project = getProject(formData.projectId);
      
      if (billable && hours && project?.rate) {
        setFormData(prev => ({ 
          ...prev, 
          amount: (hours * project.rate).toFixed(2) 
        }));
      } else if (!billable) {
        setFormData(prev => ({ ...prev, amount: '0' }));
      }
    }

    // Reset phase/task when project changes
    if (field === 'projectId') {
      setFormData(prev => ({ 
        ...prev, 
        phaseId: '', 
        taskId: '', 
        taskName: '' 
      }));
    }

    // Reset task when phase changes
    if (field === 'phaseId') {
      setFormData(prev => ({ 
        ...prev, 
        taskId: '', 
        taskName: '' 
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (new Date(formData.date) > new Date()) newErrors.date = 'Cannot set future date';
    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.hours || formData.hours <= 0) newErrors.hours = 'Hours must be greater than 0';
    if (formData.hours > 24) newErrors.hours = 'Hours cannot exceed 24';
    if (!formData.taskName?.trim() && !formData.taskId) newErrors.taskName = 'Task is required';
    
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const project = getProject(formData.projectId);
      const phase = formData.phaseId ? getPhase(project, formData.phaseId) : null;
      
      const payload = {
        ...formData,
        projectName: project?.name || '',
        phaseName: phase?.name || '',
        currency: project?.currency || 'USD'
      };

      const response = await fetch(`/api/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        alert('Entry updated successfully');
        onSave(result.entry);
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update entry');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
        setHasChanges(false);
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedProject = getProject(formData.projectId);
  const selectedPhase = formData.phaseId ? getPhase(selectedProject, formData.phaseId) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-700">Edit Time Entry</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.projectId ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.projectId && <p className="text-red-500 text-xs mt-1">{errors.projectId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phase</label>
              <select
                value={formData.phaseId}
                onChange={(e) => handleInputChange('phaseId', e.target.value)}
                disabled={!selectedProject?.phases?.length}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              >
                <option value="">No Phase</option>
                {selectedProject?.phases?.map(ph => (
                  <option key={ph.id} value={ph.id}>{ph.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Existing Task</label>
              <select
                value={formData.taskId}
                onChange={(e) => {
                  const taskId = e.target.value;
                  const tasks = selectedPhase?.tasks || selectedProject?.tasks || [];
                  const task = tasks.find(t => t.id === taskId);
                  handleInputChange('taskId', taskId);
                  if (task) {
                    handleInputChange('taskName', task.name);
                    handleInputChange('billable', task.billable);
                  }
                }}
                disabled={!selectedProject}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              >
                <option value="">Select existing task</option>
                {(() => {
                  const tasks = selectedPhase?.tasks || selectedProject?.tasks || [];
                  return tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.billable ? "(B)" : "(NB)"}
                    </option>
                  ));
                })()}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Task Name *</label>
              <input
                type="text"
                value={formData.taskName}
                onChange={(e) => handleInputChange('taskName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.taskName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Or type new task name"
              />
              {errors.taskName && <p className="text-red-500 text-xs mt-1">{errors.taskName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.endTime ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={formData.hours}
                onChange={(e) => handleInputChange('hours', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.hours ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.hours && <p className="text-red-500 text-xs mt-1">{errors.hours}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Auto-calculated"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.billable}
                  onChange={(e) => handleInputChange('billable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Billable</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Additional details..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate hours from start/end time
const calculateHours = (startTime, endTime) => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return ((end - start) / (1000 * 60 * 60)).toFixed(2);
};

export default EditEntryModal;
