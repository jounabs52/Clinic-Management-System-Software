'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { FileText, Plus, Trash2, X, Search, User, ClipboardList, Pill, Scissors, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast, { Toaster } from 'react-hot-toast';

import { 
  patientsAPI, 
  doctorsAPI, 
  treatmentPlansAPI, 
  planMedicationsAPI,
  planProceduresAPI
} from '@/lib/supabase';

// --- UTILITIES & IMMUTABLE UPDATE LOGIC ---
const createUniqueItem = (baseItem) => ({ 
  ...baseItem, 
  id: `${Date.now()}-${Math.random()}`,
});

const updateArrayItemById = (prevArray, id, field, value) => {
  return prevArray.map(item => {
    if (item.id === id) { 
      return { ...item, [field]: value };
    }
    return item;
  });
};

// --- INITIAL STATE STRUCTURE ---
const initialTreatmentItemBase = {
  item_type: 'Procedure',
  name: '',
  scheduled_date: new Date().toISOString().split('T')[0],
  notes: '',
  sessions: 1,
  therapist_or_surgeon: '',
  frequency: '',
  result_status: 'Planned',
  cost: 0.00,
};

const initialMedicationBase = {
  drug_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: 'Oral',
};

const initialFormData = {
  patient_id: '',
  doctor_id: '',
  visit_id: null,
  title: '',
  diagnosis: '',
  consultation_date: new Date().toISOString().split('T')[0],
  treatment_type: 'Medical',
  objective: '',
  treatments: [createUniqueItem(initialTreatmentItemBase)], 
  medications: [createUniqueItem(initialMedicationBase)],
  progress_notes: '',
  response_to_treatment: '',
  complications: '',
  follow_up_date: '',
  next_steps: '',
  estimated_cost: 0,
  amount_paid: 0,
  insurance_details: '',
  status: 'Active',
};

// --- FOCUS STABILITY FIX COMPONENTS ---
const LocalStateInput = memo(({ field, initialValue, handleSync, placeholder, rows = 1, required = false, type = 'text', min = undefined }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(type === 'number' ? String(initialValue || 0) : (initialValue || ''));
  }, [initialValue, type]);

  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (String(localValue) !== String(initialValue)) {
      const syncValue = type === 'number' ? parseFloat(localValue) || 0 : localValue;
      handleSync(field, syncValue);
    }
  }, [field, localValue, handleSync, initialValue, type]);

  const InputTag = rows > 1 ? 'textarea' : 'input';

  return (
    <InputTag
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${rows > 1 ? 'resize-none' : ''}`}
      rows={rows > 1 ? rows : undefined}
      required={required}
      min={min}
    />
  );
});

const LocalStateArrayItemInput = memo(({ id, field, initialValue, handleSync, placeholder, rows = 1, type = 'text', min = undefined }) => {
  const [localValue, setLocalValue] = useState(initialValue);
  
  useEffect(() => {
    setLocalValue(type === 'number' ? String(initialValue || 0) : (initialValue || ''));
  }, [initialValue, type]);

  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (String(localValue) !== String(initialValue)) {
      const syncValue = type === 'number' ? parseFloat(localValue) || 0 : localValue;
      handleSync(id, field, syncValue);
    }
  }, [id, field, localValue, handleSync, initialValue, type]);

  const InputTag = rows > 1 ? 'textarea' : 'input';

  return (
    <InputTag
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
      rows={rows > 1 ? rows : undefined}
      min={min}
    />
  );
});

// --- SUB COMPONENTS ---
const PatientSelectionBlock = memo(({ 
  doctor_id, handleInputChange, selectedPatient, setSelectedPatient, 
  selectedDoctor, setSelectedDoctor, doctors, patients, patientSearchTerm, 
  setPatientSearchTerm, showPatientDropdown, setShowPatientDropdown, 
  dropdownRef, handleSelectPatient, filteredPatients, loading 
}) => {
  const handleDoctorChange = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const doc = doctors.find(d => d.doctor_id === e.target.value);
    setSelectedDoctor(doc);
    handleInputChange('doctor_id', e.target.value);
  }, [doctors, setSelectedDoctor, handleInputChange]);

  const handleToggleDropdown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPatientDropdown(!showPatientDropdown);
  }, [showPatientDropdown, setShowPatientDropdown]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-sm p-4 border border-purple-200">
      <div className="flex flex-col md:flex-row gap-4 relative items-end">
        <div className="relative flex-1 w-full" ref={dropdownRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Patient<span className='text-red-500'>*</span>
          </label>
          <button
            type="button"
            onClick={handleToggleDropdown}
            className="w-full flex items-center justify-center gap-2 px-4 py-[9px] h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
          >
            <User size={18} />
            {selectedPatient ? selectedPatient.name : 'Click to Search Patient'}
          </button>
          {showPatientDropdown && (
            <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-200 relative">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or MR number..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Loading patients...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No patients found</div>
                ) : (
                  filteredPatients.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-800">{patient.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                        <span className="text-purple-600 font-medium">{patient.mr_number}</span>
                        <span>{patient.phone}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Attending Doctor<span className='text-red-500'>*</span>
          </label>
          <select
            value={doctor_id}
            onChange={handleDoctorChange}
            className="w-full px-4 py-2 h-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map(doc => (
              <option key={doc.doctor_id} value={doc.doctor_id}>
                {doc.name} ({doc.specialization})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPatient && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Patient Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Name', value: selectedPatient.name, style: 'font-medium' },
              { label: 'MR Number', value: selectedPatient.mr_number, style: 'text-purple-700 font-medium' },
              { label: 'Phone', value: selectedPatient.phone },
              { label: 'Age/Gender', value: `${selectedPatient.age || 'N/A'}/${selectedPatient.gender || 'N/A'}` },
            ].map(item => (
              <div key={item.label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{item.label}</label>
                <div className={`px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-800 border border-gray-200 ${item.style}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const BasicInfoBlock = memo(({ consultation_date, title, diagnosis, objective, handleInputChange }) => {
  const handleDateChange = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleInputChange('consultation_date', e.target.value);
  }, [handleInputChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
        <ClipboardList size={20} /> Case Information
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Consultation Date:<span className='text-red-500'>*</span>
          </label>
          <input
            type="date"
            value={consultation_date}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Treatment Plan Title:<span className='text-red-500'>*</span>
          </label>
          <LocalStateInput
            field="title"
            initialValue={title}
            handleSync={handleInputChange}
            placeholder="e.g., Dental Implant Restoration, Acute LBP Management"
            required={true}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Primary Diagnosis:<span className='text-red-500'>*</span>
          </label>
          <LocalStateInput
            field="diagnosis"
            initialValue={diagnosis}
            handleSync={handleInputChange}
            placeholder="Describe the primary diagnosis based on consultation."
            rows={2}
            required={true}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">Treatment Objective:</label>
          <LocalStateInput
            field="objective"
            initialValue={objective}
            handleSync={handleInputChange}
            placeholder="The main goal of this plan (e.g., 'Full resolution of infection', 'Pain management and functional recovery')."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
});

const ProceduresAndTestsBlock = memo(({ treatments, handleTreatmentItemChange, handleRemoveTreatmentItem, handleAddTreatmentItem }) => {
  const handleItemTypeChange = useCallback((id, value, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleTreatmentItemChange(id, 'item_type', value);
  }, [handleTreatmentItemChange]);

  const handleDateChange = useCallback((id, value, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleTreatmentItemChange(id, 'scheduled_date', value);
  }, [handleTreatmentItemChange]);

  const handleResultStatusChange = useCallback((id, value, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleTreatmentItemChange(id, 'result_status', value);
  }, [handleTreatmentItemChange]);

  const handleRemove = useCallback((id, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleRemoveTreatmentItem(id);
  }, [handleRemoveTreatmentItem]);

  const handleAddItem = useCallback((type, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddTreatmentItem(type);
  }, [handleAddTreatmentItem]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Scissors size={20} /> Procedures, Therapies & Lab Tests
      </h3>

      {treatments.map((item) => (
        <div key={item.id} className="p-3 mb-4 border border-gray-100 rounded-lg bg-gray-50 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Item Type</label>
              <select
                value={item.item_type}
                onChange={(e) => handleItemTypeChange(item.id, e.target.value, e)}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="Procedure">Procedure</option>
                <option value="Therapy">Therapy</option>
                <option value="LabTest">Lab Test</option>
              </select>
            </div>
            
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">{item.item_type} Name</label>
              <LocalStateArrayItemInput
                id={item.id}
                field='name'
                initialValue={item.name}
                handleSync={handleTreatmentItemChange}
                placeholder={`${item.item_type} Name`}
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={item.scheduled_date}
                onChange={(e) => handleDateChange(item.id, e.target.value, e)}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost (Rs.)</label>
              <LocalStateArrayItemInput
                id={item.id}
                field='cost'
                initialValue={item.cost}
                handleSync={handleTreatmentItemChange}
                type="number"
                min="0"
              />
            </div>

            <div className="md:col-span-11 grid grid-cols-3 gap-3 pt-2">
              {(item.item_type === 'Procedure' || item.item_type === 'Therapy') && (
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Surgeon/Therapist</label>
                  <LocalStateArrayItemInput
                    id={item.id}
                    field='therapist_or_surgeon'
                    initialValue={item.therapist_or_surgeon}
                    handleSync={handleTreatmentItemChange}
                  />
                </div>
              )}
              {item.item_type === 'Therapy' && (
                <>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sessions</label>
                    <LocalStateArrayItemInput
                      id={item.id}
                      field='sessions'
                      initialValue={item.sessions}
                      handleSync={handleTreatmentItemChange}
                      type="number"
                      min="1"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                    <LocalStateArrayItemInput
                      id={item.id}
                      field='frequency'
                      initialValue={item.frequency}
                      handleSync={handleTreatmentItemChange}
                    />
                  </div>
                </>
              )}
              {item.item_type === 'LabTest' && (
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Result Status</label>
                  <select
                    value={item.result_status}
                    onChange={(e) => handleResultStatusChange(item.id, e.target.value, e)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option>Planned</option>
                    <option>Pending</option>
                    <option>Completed</option>
                    <option>Abnormal</option>
                  </select>
                </div>
              )}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <LocalStateArrayItemInput
                  id={item.id}
                  field='notes'
                  initialValue={item.notes}
                  handleSync={handleTreatmentItemChange}
                  placeholder="Specific details and instructions..."
                  rows={1}
                />
              </div>
            </div>

            {treatments.length > 1 && (
              <button
                type="button"
                onClick={(e) => handleRemove(item.id, e)}
                className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={(e) => handleAddItem('Procedure', e)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus size={18} /> Add Procedure
        </button>
        <button
          type="button"
          onClick={(e) => handleAddItem('Therapy', e)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus size={18} /> Add Therapy
        </button>
        <button
          type="button"
          onClick={(e) => handleAddItem('LabTest', e)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus size={18} /> Add Lab Test
        </button>
      </div>
    </div>
  );
});

const MedicationsBlock = memo(({ medications, handleMedicationChange, handleRemoveMedication, handleAddMedication }) => {
  const handleRouteChange = useCallback((id, value, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleMedicationChange(id, 'route', value);
  }, [handleMedicationChange]);

  const handleRemove = useCallback((id, e) => {
    e.preventDefault();
    e.stopPropagation();
    handleRemoveMedication(id);
  }, [handleRemoveMedication]);

  const handleAdd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddMedication();
  }, [handleAddMedication]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Pill size={20} /> Medications
      </h3>

      <div className="overflow-x-auto mb-4 border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Drug Name', 'Dosage', 'Frequency', 'Duration', 'Route', 'Action'].map(header => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {medications.map((med) => (
              <tr key={med.id} className="hover:bg-gray-50">
                <td className="p-2">
                  <LocalStateArrayItemInput 
                    id={med.id} 
                    field='drug_name'
                    initialValue={med.drug_name} 
                    handleSync={handleMedicationChange} 
                    placeholder="e.g., Ibuprofen" 
                  />
                </td>
                <td className="p-2">
                  <LocalStateArrayItemInput 
                    id={med.id} 
                    field='dosage'
                    initialValue={med.dosage} 
                    handleSync={handleMedicationChange} 
                    placeholder="e.g., 200mg" 
                  />
                </td>
                <td className="p-2">
                  <LocalStateArrayItemInput 
                    id={med.id} 
                    field='frequency'
                    initialValue={med.frequency} 
                    handleSync={handleMedicationChange} 
                    placeholder="e.g., TID" 
                  />
                </td>
                <td className="p-2">
                  <LocalStateArrayItemInput 
                    id={med.id} 
                    field='duration'
                    initialValue={med.duration} 
                    handleSync={handleMedicationChange} 
                    placeholder="e.g., 5 days" 
                  />
                </td>
                <td className="p-2">
                  <select 
                    value={med.route} 
                    onChange={(e) => handleRouteChange(med.id, e.target.value, e)} 
                    className="w-full px-2 py-1 border rounded-lg text-sm bg-white"
                  >
                    <option>Oral</option><option>IV</option><option>Topical</option>
                  </select>
                </td>
                <td className="p-2 text-center">
                  <button 
                    type="button"
                    onClick={(e) => handleRemove(med.id, e)} 
                    className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                    disabled={medications.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm font-medium"
      >
        <Plus size={18} />
        Add Medication
      </button>
    </div>
  );
});

const FollowUpAndFinanceBlock = memo(({ 
  progress_notes, response_to_treatment, follow_up_date, next_steps, 
  amount_paid, insurance_details, handleInputChange, calculateTotalCost 
}) => {
  const handleFollowUpDateChange = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleInputChange('follow_up_date', e.target.value);
  }, [handleInputChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Progress & Financials</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-700 border-b pb-2">Progress & Follow-Up</h3>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Progress Notes:</label>
            <LocalStateInput
              field="progress_notes"
              initialValue={progress_notes}
              handleSync={handleInputChange}
              placeholder="Current status, patient feedback, and clinical observations."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Response to Treatment:</label>
              <LocalStateInput 
                field="response_to_treatment"
                initialValue={response_to_treatment} 
                handleSync={handleInputChange} 
                placeholder="e.g., Good, Partial, Poor" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Follow-Up Date:</label>
              <input 
                type="date" 
                value={follow_up_date || ''} 
                onChange={handleFollowUpDateChange} 
                className="w-full px-3 py-2 border rounded-lg text-sm" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Next Steps/Instructions:</label>
            <LocalStateInput
              field="next_steps"
              initialValue={next_steps}
              handleSync={handleInputChange}
              placeholder="Detailed instructions for the patient or next internal actions."
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-700 border-b pb-2">Financial Overview</h3>
          <div className="w-full space-y-2 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex justify-between text-sm text-gray-700 border-b pb-2">
              <span className="font-semibold">Estimated Total Cost (Based on Items):</span>
              <span className="text-lg font-bold text-purple-600">Rs. {calculateTotalCost().toFixed(2)}</span>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid to Date (Rs.)</label>
              <LocalStateInput
                field="amount_paid"
                initialValue={amount_paid}
                handleSync={handleInputChange}
                type="number"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Insurance/Coverage Details</label>
              <LocalStateInput 
                field="insurance_details"
                initialValue={insurance_details} 
                handleSync={handleInputChange} 
                placeholder="Policy number, pre-authorization details, etc."
                rows={2} 
              />
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-base font-bold text-red-700">
                <span>Balance Due:</span>
                <span>Rs. {(calculateTotalCost() - amount_paid).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Main Component ---
export default function TreatmentPlanSystem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pdfGenerator, setPdfGenerator] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Click Outside Handler for Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPatientDropdown(false);
      }
    };

    if (showPatientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPatientDropdown]);

  // Data Loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [planData, patientData, doctorData] = await Promise.all([
          treatmentPlansAPI.getAll(),
          patientsAPI.getAll(),
          doctorsAPI.getAll(),
        ]);

        const patientMap = new Map(patientData.map(p => [p.id, p]));
        const doctorMap = new Map(doctorData.map(d => [d.doctor_id, d]));

        const mergedPlans = planData.map(plan => {
          const patient = patientMap.get(plan.patient_id);
          const doctor = doctorMap.get(plan.doctor_id);
          return {
            ...plan,
            patientName: patient?.name || 'N/A',
            doctorName: doctor?.name || 'N/A',
            totalCost: plan.estimated_cost ?? 0,
            amountPaid: plan.amount_paid ?? 0,
            medications: plan.medications || [],
            next_steps: plan.next_steps || '',
          };
        });

        setTreatmentPlans(mergedPlans);
        setPatients(patientData);
        setDoctors(doctorData);
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load data: ' + error.message, { position: 'top-right' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load PDF Utility
  useEffect(() => {
    const loadPdfUtility = async () => {
      try {
        const module = await import('./pdf-generator');
        setPdfGenerator(() => module.generatePDF);
      } catch (e) {
        console.error("Failed to load PDF utility:", e);
      }
    };
    loadPdfUtility();
  }, []);

  // Handlers
  const handleCreateNew = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormData({
      ...initialFormData,
      treatments: [createUniqueItem(initialTreatmentItemBase)],
      medications: [createUniqueItem(initialMedicationBase)],
    });
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setIsModalOpen(true);
  }, []);

  const handleGeneratePDF = useCallback(async (plan) => {
    if (pdfGenerator) {
      try {
        toast.loading('Generating PDF...', { id: 'pdf-gen' });
        
        const [planDetails, medications, procedures] = await Promise.all([
          treatmentPlansAPI.getById(plan.plan_id),
          planMedicationsAPI.getByPlanId(plan.plan_id),
          planProceduresAPI.getByPlanId(plan.plan_id)
        ]);

        const patient = patients.find(p => p.id === planDetails.patient_id);
        const doctor = doctors.find(d => d.doctor_id === planDetails.doctor_id);

        const completePlanData = {
          ...planDetails,
          patientName: patient?.name || 'N/A',
          patientMRNumber: patient?.mr_number || 'N/A',
          doctorName: doctor?.name || 'N/A',
          medications: medications || [],
          treatmentItems: procedures || [],
          totalCost: planDetails.estimated_cost || 0,
          amountPaid: planDetails.amount_paid || 0,
        };

        pdfGenerator(completePlanData);
        toast.success('PDF generated successfully', { id: 'pdf-gen', position: 'top-right' });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Error generating PDF: ' + error.message, { id: 'pdf-gen', position: 'top-right' });
      }
    } else {
      toast.error("PDF functionality is still loading. Please try again.", { position: 'top-right' });
    }
  }, [pdfGenerator, patients, doctors]);

  const handleCloseModal = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsModalOpen(false);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setPatientSearchTerm('');
    setFormData({
      ...initialFormData,
      treatments: [createUniqueItem(initialTreatmentItemBase)],
      medications: [createUniqueItem(initialMedicationBase)],
    });
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTreatmentItemChange = useCallback((id, field, value) => {
    const parsedValue = (field === 'cost' || field === 'sessions') ? parseFloat(value) || 0 : value;
    setFormData(prev => ({
      ...prev,
      treatments: updateArrayItemById(prev.treatments, id, field, parsedValue),
    }));
  }, []);

  const handleAddTreatmentItem = useCallback((type = 'Procedure') => {
    setFormData(prev => ({
      ...prev,
      treatments: [...prev.treatments, createUniqueItem({ ...initialTreatmentItemBase, item_type: type })]
    }));
  }, []);

  const handleRemoveTreatmentItem = useCallback((id) => {
    setFormData(prev => ({
      ...prev,
      treatments: prev.treatments.length > 1
        ? prev.treatments.filter(item => item.id !== id)
        : prev.treatments
    }));
  }, []);

  const handleMedicationChange = useCallback((id, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: updateArrayItemById(prev.medications, id, field, value),
    }));
  }, []);

  const handleAddMedication = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, createUniqueItem(initialMedicationBase)]
    }));
  }, []);

  const handleRemoveMedication = useCallback((id) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.length > 1
        ? prev.medications.filter(med => med.id !== id)
        : prev.medications
    }));
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient =>
      patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      (patient.phone && patient.phone.includes(patientSearchTerm)) ||
      (patient.mr_number && patient.mr_number.toLowerCase().includes(patientSearchTerm.toLowerCase()))
    );
  }, [patients, patientSearchTerm]);

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id,
    }));
    setShowPatientDropdown(false);
    setPatientSearchTerm('');
  }, []);

  const calculateTotalCost = useCallback(() =>
    formData.treatments.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0),
    [formData.treatments]);

  const saveTreatmentPlan = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validation
    if (!formData.patient_id || !formData.doctor_id || !formData.title || formData.diagnosis.length < 5) {
      toast.error('Please select a patient and doctor, and fill out the title and diagnosis.', { position: 'top-right' });
      return;
    }

    const saveToast = toast.loading('Saving treatment plan...', { position: 'top-right' });

    try {
      console.log('=== STARTING TREATMENT PLAN SAVE ===');

      // Step 1: Insert the main treatment plan (without visit_id)
      const planHeaderData = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        // REMOVED: visit_id (this is causing the error)
        title: formData.title,
        diagnosis: formData.diagnosis,
        consultation_date: formData.consultation_date,
        treatment_type: formData.treatment_type,
        objective: formData.objective,
        progress_notes: formData.progress_notes,
        response_to_treatment: formData.response_to_treatment,
        complications: formData.complications,
        follow_up_date: formData.follow_up_date || null,
        next_steps: formData.next_steps,
        estimated_cost: calculateTotalCost(),
        amount_paid: formData.amount_paid || 0,
        insurance_details: formData.insurance_details,
        status: formData.status,
      };

      console.log('Plan Header Data:', planHeaderData);

      const planHeader = await treatmentPlansAPI.create(planHeaderData);
      console.log('✅ Plan header created:', planHeader);
      
      const newPlanId = planHeader.plan_id;

      // Step 2: Insert procedures
      const proceduresToInsert = formData.treatments.map(item => ({
        plan_id: newPlanId,
        item_type: item.item_type,
        name: item.name,
        scheduled_date: item.scheduled_date,
        notes: item.notes || '',
        sessions: item.sessions || null,
        therapist_or_surgeon: item.therapist_or_surgeon || null,
        frequency: item.frequency || null,
        result_status: item.result_status || 'Planned',
        cost: parseFloat(item.cost) || 0.00,
        status: 'Planned',
      }));

      if (proceduresToInsert.length > 0) {
        await planProceduresAPI.createMultiple(proceduresToInsert);
        console.log('✅ Procedures inserted');
      }

      // Step 3: Insert medications
      const medicationsToInsert = formData.medications
        .filter(med => med.drug_name && med.drug_name.trim() !== '')
        .map(med => ({
          plan_id: newPlanId,
          drug_name: med.drug_name,
          dosage: med.dosage || null,
          frequency: med.frequency || null,
          duration: med.duration || null,
          route: med.route || 'Oral',
          prescription_date: formData.consultation_date,
          status: 'Active',
        }));

      if (medicationsToInsert.length > 0) {
        await planMedicationsAPI.createMultiple(medicationsToInsert);
        console.log('✅ Medications inserted');
      }

      // Step 4: Update local state
      const newPlan = {
        id: newPlanId,
        plan_id: newPlanId,
        patientName: selectedPatient?.name || 'N/A',
        doctorName: selectedDoctor?.name || 'N/A',
        title: planHeader.title,
        status: planHeader.status,
        created_at: new Date().toLocaleDateString(),
        totalCost: planHeader.estimated_cost ?? 0,
        amountPaid: planHeader.amount_paid ?? 0,
        medications: formData.medications,
        next_steps: formData.next_steps,
      };

      setTreatmentPlans(prev => [newPlan, ...prev]);

      toast.success('✅ Treatment plan saved successfully!', { id: saveToast, position: 'top-right' });
      handleCloseModal();

    } catch (error) {
      console.error('=== ERROR SAVING TREATMENT PLAN ===', error);
      toast.error(`❌ Error saving treatment plan: ${error.message}`, { id: saveToast, position: 'top-right' });
    }
  };

  // Props preparation
  const patientSelectionProps = useMemo(() => ({
    doctor_id: formData.doctor_id,
    handleInputChange, selectedPatient, setSelectedPatient, selectedDoctor, setSelectedDoctor,
    doctors, patients, patientSearchTerm, setPatientSearchTerm, showPatientDropdown,
    setShowPatientDropdown, dropdownRef, handleSelectPatient, filteredPatients, loading
  }), [formData.doctor_id, handleInputChange, selectedPatient, selectedDoctor, doctors, patients,
    patientSearchTerm, showPatientDropdown, handleSelectPatient, filteredPatients, loading]);

  const basicInfoProps = useMemo(() => ({
    consultation_date: formData.consultation_date,
    title: formData.title,
    diagnosis: formData.diagnosis,
    objective: formData.objective,
    handleInputChange
  }), [formData.consultation_date, formData.title, formData.diagnosis, formData.objective, handleInputChange]);

  const proceduresAndTestsProps = useMemo(() => ({
    treatments: formData.treatments,
    handleTreatmentItemChange,
    handleRemoveTreatmentItem,
    handleAddTreatmentItem
  }), [formData.treatments, handleTreatmentItemChange, handleRemoveTreatmentItem, handleAddTreatmentItem]);

  const medicationsProps = useMemo(() => ({
    medications: formData.medications,
    handleMedicationChange,
    handleRemoveMedication,
    handleAddMedication
  }), [formData.medications, handleMedicationChange, handleRemoveMedication, handleAddMedication]);

  const followUpAndFinanceProps = useMemo(() => ({
    progress_notes: formData.progress_notes,
    response_to_treatment: formData.response_to_treatment,
    follow_up_date: formData.follow_up_date,
    next_steps: formData.next_steps,
    amount_paid: formData.amount_paid,
    insurance_details: formData.insurance_details,
    handleInputChange,
    calculateTotalCost
  }), [formData.progress_notes, formData.response_to_treatment, formData.follow_up_date,
    formData.next_steps, formData.amount_paid, formData.insurance_details, handleInputChange, calculateTotalCost]);

  const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-20">
                <h2 className="text-2xl font-bold text-gray-800">Create New Treatment Plan</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <X size={24} />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto pr-2">
                {children}
              </div>
              <div className="flex sticky bottom-0 bg-white p-4 border-t shadow-inner gap-3 z-20 mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-1/2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveTreatmentPlan}
                  className="w-1/2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  Save Treatment Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreatePage = () => (
    <div className="space-y-6">
      <PatientSelectionBlock {...patientSelectionProps} />
      <BasicInfoBlock {...basicInfoProps} />
      <ProceduresAndTestsBlock {...proceduresAndTestsProps} />
      <MedicationsBlock {...medicationsProps} />
      <FollowUpAndFinanceBlock {...followUpAndFinanceProps} />
    </div>
  );

  const ViewPage = () => {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Treatment Plan List</h2>
            <button
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg transition-all text-sm font-medium"
            >
              <Plus size={18} />
              Create Treatment Plan
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Plan ID', 'Patient', 'Doctor', 'Title', 'Total Cost', 'Paid', 'Status', 'Created On', 'Actions'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {treatmentPlans.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-500 text-sm">
                      No treatment plans found
                    </td>
                  </tr>
                ) : (
                  treatmentPlans.map(plan => (
                    <tr key={plan.plan_id || plan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">{(plan.plan_id || plan.id).substring(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{plan.patientName}</td>
                      <td className="px-4 py-3 text-sm text-purple-600">{plan.doctorName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{plan.title}</td>
                      <td className="px-4 py-3 text-sm text-purple-600 font-semibold">
                        Rs. {(plan.totalCost ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">
                        Rs. {(plan.amountPaid ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${plan.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{plan.created_at}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleGeneratePDF(plan)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium transition-colors"
                          title="Generate PDF Prescription"
                        >
                          <Download size={16} />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <Toaster />
      <main className="flex-1">
        <ViewPage />
      </main>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <CreatePage />
      </Modal>
    </div>
  );
}