// app/patients/form-designer/page.js
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react' // CORRECTED: Added all necessary hooks
import { CheckSquare, XCircle, LayoutPanelTop, PencilLine, Settings, Heart, RotateCw } from 'lucide-react'
import { toast } from 'react-hot-toast'; // Ensure <Toaster/> is in app/layout.js

// --- Mock Field Data Structure & Definitions ---
const fieldDefinitions = [
    { key: 'name', label: 'Full Name', mandatory: true, category: 'Basic' },
    { key: 'phone', label: 'Phone Number', mandatory: true, category: 'Basic' },
    { key: 'email', label: 'Email Address', mandatory: false, category: 'Basic' },
    { key: 'gender', label: 'Gender', mandatory: false, category: 'Basic' },
    { key: 'date_of_birth', label: 'Date of Birth', mandatory: false, category: 'Basic' },
    { key: 'age', label: 'Age', mandatory: false, category: 'Basic' },
    { key: 'cnic', label: 'CNIC / Civil ID', mandatory: false, category: 'Basic' },
    
    { key: 'address', label: 'Address', mandatory: false, category: 'Contact' },
    { key: 'secondary_phone', label: 'Secondary Phone', mandatory: false, category: 'Contact' },
    { key: 'height', label: 'Height', mandatory: false, category: 'Vitals' },
    { key: 'weight', label: 'Weight', mandatory: false, category: 'Vitals' },
    { key: 'bmi', label: 'BMI', mandatory: false, category: 'Vitals' },
    { key: 'blood_group', label: 'Blood Group', mandatory: false, category: 'Vitals' },
    
    { key: 'marital_status', label: 'Marital Status', mandatory: false, category: 'Extended' },
    { key: 'religion', label: 'Religion', mandatory: false, category: 'Extended' },
    { key: 'profession', label: 'Profession', mandatory: false, category: 'Extended' },
    { key: 'nationality', label: 'Nationality', mandatory: false, category: 'Extended' },
    { key: 'family_relationship', label: 'Family Relation', mandatory: false, category: 'Extended' },
    
    { key: 'associated_service', label: 'Service', mandatory: false, category: 'Admin' },
    { key: 'referral', label: 'Referral Source', mandatory: false, category: 'Admin' },
    { key: 'coverage', label: 'Insurance Coverage', mandatory: false, category: 'Admin' },
    { key: 'membership_fee', label: 'Membership Fee', mandatory: false, category: 'Admin' },
    { key: 'medical_alert', label: 'Medical Alert', mandatory: false, category: 'Admin' },
    { key: 'tags', label: 'Tags', mandatory: false, category: 'Admin' },
    { key: 'assign_doctor', label: 'Assign Doctor', mandatory: false, category: 'Admin' },
    { key: 'manual_mr_no', label: 'Manual MR No.', mandatory: false, category: 'Admin' },
    { key: 'picture', label: 'Profile Picture', mandatory: false, category: 'Admin' },
];

// --- Data Persistence Utilities ---
// NOTE: These functions manage the configuration storage for auto-update and sharing
const STORAGE_KEY = 'patientFormConfig';

const saveFormConfiguration = async (config) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    // Simulate network latency for a real-world API call
    return new Promise(resolve => setTimeout(resolve, 50)); 
};

const loadFormConfiguration = () => {
    if (typeof window !== 'undefined') {
        const storedConfig = localStorage.getItem(STORAGE_KEY);
        if (storedConfig) {
            return JSON.parse(storedConfig);
        }
    }
    // Default state: all mandatory fields are true, all others are false
    return fieldDefinitions.reduce((acc, field) => {
        acc[field.key] = field.mandatory;
        return acc;
    }, {});
};


// --- Component: Dashboard Cards ---
const DashboardCards = ({ fields }) => {
    const allKeys = Object.keys(fields);
    const totalFields = allKeys.length;
    // Ensure all fields in the config are true/false before counting
    const enabledFields = allKeys.filter(key => fields[key]).length; 
    const disabledFields = totalFields - enabledFields;

    const Card = ({ icon: Icon, title, value, colorClass, subtitle }) => (
        <div className="bg-white rounded-xl shadow-lg p-6 flex items-start space-x-4 transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl">
            <div className={`flex-shrink-0 p-3 ${colorClass}-100 rounded-xl`}>
                <Icon className={`w-7 h-7 ${colorClass}-600`} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <Card icon={Heart} title="Total Fields" value={totalFields} colorClass="purple" subtitle="All available fields" />
            <Card icon={CheckSquare} title="Enabled Fields" value={enabledFields} colorClass="green" subtitle={`${Math.round((enabledFields / totalFields) * 100) || 0}% active`} />
            <Card icon={XCircle} title="Disabled Fields" value={disabledFields} colorClass="red" subtitle={`${Math.round((disabledFields / totalFields) * 100) || 0}% hidden`} />
        </div>
    );
};

// --- Main Component: Form Designer ---
export default function FormDesigner() {
  const [formFields, setFormFields] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Load initial config from storage on mount (FIXED useEffect dependency)
  useEffect(() => {
    // Ensures config is loaded once
    setFormFields(loadFormConfiguration());
  }, []); 

  // Handler for checkbox change with AUTO-SAVE
  const handleFieldToggle = useCallback(async (key) => {
    const fieldDef = fieldDefinitions.find(f => f.key === key);
    const isCurrentlyEnabled = formFields[key];
    
    // Prevent toggling mandatory fields OFF
    if (fieldDef?.mandatory && isCurrentlyEnabled) {
      toast.error(`${fieldDef.label} is mandatory and cannot be disabled.`, { position: 'top-right' });
      return;
    }

    setIsSaving(true);
    
    // 1. Calculate new state and optimistically update UI
    const newState = { ...formFields, [key]: !isCurrentlyEnabled };
    setFormFields(newState);
    
    // 2. Auto-save to persistence layer (API/localStorage)
    try {
        await saveFormConfiguration(newState);
        
        // 3. Show toast on success (avoids page jump by using fixed positioning)
        const action = isCurrentlyEnabled ? 'removed from' : 'added to';
        const toastType = isCurrentlyEnabled ? toast.error : toast.success;
        toastType(`${fieldDef.label} ${action} the form!`, { position: 'top-right' });
        
    } catch (error) {
        // Handle save error: rollback state and show error toast
        setFormFields(formFields); // Revert to previous state
        toast.error(`Error saving ${fieldDef.label}. Please try again.`, { position: 'top-right' });
    } finally {
        setIsSaving(false);
    }
  }, [formFields]); // Depend on formFields to get the latest state


  // Calculate fields for Dashboard Cards
  const memoizedFields = useMemo(() => {
    // This ensures that the card component always uses the latest, complete configuration
    return fieldDefinitions.reduce((acc, field) => {
        // Use state value if present, otherwise fall back to mandatory default
        acc[field.key] = formFields[field.key] ?? field.mandatory; 
        return acc;
    }, {});
  }, [formFields]);


  // Component: Improved Header (Removed Save button)
  const HeaderSection = () => (
    <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight flex items-center">
          <LayoutPanelTop className="inline-block w-8 h-8 mr-3 text-purple-600" />
          Form Designer
        </h1>
        <p className="mt-1 text-md text-gray-600">
          Configure patient registration form fields and their visibility in real-time.
        </p>
      </div>
      <div className="text-sm text-gray-600 flex items-center p-2 rounded-lg bg-gray-100">
          {isSaving ? (
            <>
              <RotateCw className="w-4 h-4 mr-1 text-purple-500 animate-spin" />
              Auto-saving...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-1 text-green-500" />
              Live Configuration
            </>
          )}
      </div>
    </div>
  );
  

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6"> 
      <HeaderSection />
      <DashboardCards fields={memoizedFields} />

      {/* Main Field Selection Area - Single Pane with new look */}
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-purple-100">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            Patient Registration Form Fields
            <PencilLine className="w-5 h-5 ml-2 text-purple-600" />
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            <span className="text-purple-600 font-bold">{Object.values(memoizedFields).filter(Boolean).length}</span> / {Object.keys(memoizedFields).length} Fields Active
          </p>
        </div>
        
        {/* Single Grid Display for Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-5 p-4 bg-purple-50 rounded-lg border-2 border-purple-200 border-opacity-60 overflow-hidden">
            {fieldDefinitions.map(field => {
                const isEnabled = formFields[field.key] ?? field.mandatory; // Use current state or mandatory default
                
                return (
                    <div 
                        key={field.key} 
                        // Style field based on its enabled state
                        className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            isEnabled 
                                ? 'bg-white shadow-md ring-2 ring-purple-400' 
                                : 'bg-transparent hover:bg-purple-100 hover:shadow-sm'
                        }`}
                        onClick={() => handleFieldToggle(field.key)}
                    >
                        <input
                            type="checkbox"
                            id={field.key}
                            checked={isEnabled}
                            // Disable the visual checkbox for mandatory/active fields to prevent click confusion
                            disabled={field.mandatory && isEnabled} 
                            // The onChange handler is attached to the parent div via onClick for a larger hit area
                            onChange={() => {}} 
                            className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        <label 
                            htmlFor={field.key} 
                            className={`ml-3 text-sm font-medium select-none leading-tight ${
                                (field.mandatory && isEnabled) ? 'text-gray-500' : 'text-gray-800'
                            }`}
                        >
                            {field.label}
                            {field.mandatory && <span className="text-red-500 ml-1 text-xs font-bold">⋆</span>}
                            <span className="block text-xs text-gray-500 font-light mt-0.5">{field.category}</span>
                        </label>
                    </div>
                );
            })}
        </div>
        
        <div className="mt-8 text-center">
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-full">
            <CheckSquare className="w-4 h-4 mr-2" /> All changes are automatically saved.
          </span>
        </div>
      </div>
    </div>
  );
}