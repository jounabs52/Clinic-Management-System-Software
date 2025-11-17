'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Search, Plus, FileSpreadsheet, FileText, Eye, Columns, 
  X, Edit, Trash2, ChevronLeft, ChevronRight, RotateCw, 
  Stethoscope, AlertTriangle, Printer, Clock, BookOpen, User 
} from 'lucide-react'
import { toast } from 'react-hot-toast'; 
import { supabase } from '@/lib/supabase'

// --- Configuration & Master Field Definitions ---
const STORAGE_KEY = 'doctorFormConfig'; 
const DOCTOR_TABLE = 'doctors';

// Helper for schedule structure
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- Doctor Field Definitions (MASTER LIST) ---
const MASTER_DOCTOR_FIELDS = [
    // --- 1. Personal Information ---
    { id: 'name', label: 'Full Name', mandatory: true, type: 'text', category: 'Personal' },
    { id: 'gender', label: 'Gender', mandatory: true, type: 'select', options: ['Male', 'Female', 'Other'], category: 'Personal' },
    { id: 'date_of_birth', label: 'Date of Birth', mandatory: true, type: 'date', category: 'Personal' },
    { id: 'phone', label: 'Phone Number', mandatory: true, type: 'tel', category: 'Personal' },
    { id: 'email', label: 'Email Address', mandatory: true, type: 'email', category: 'Personal' },
    { id: 'national_id', label: 'National ID/CNIC', mandatory: false, type: 'text', category: 'Personal' },
    
    // --- 2. Educational Information ---
    { id: 'highest_degree', label: 'Highest Degree', mandatory: true, type: 'text', category: 'Educational' },
    { id: 'specialty', label: 'Specialty/Area of Expertise', mandatory: true, type: 'text', category: 'Educational' },
    { id: 'license_id', label: 'License ID / PMDC No', mandatory: true, type: 'text', category: 'Educational' },
    { id: 'institution', label: 'Primary Institution', mandatory: false, type: 'text', category: 'Educational' },
    { id: 'graduation_year', label: 'Graduation Year', mandatory: false, type: 'number', category: 'Educational' },
    { id: 'certifications', label: 'Other Certifications (Comma Separated)', mandatory: false, type: 'textarea', category: 'Educational' },
    
    // --- 3. Clinic Information ---
    { id: 'role', label: 'Clinic Role', mandatory: true, type: 'text', category: 'Clinic' },
    { id: 'department', label: 'Department/Unit', mandatory: true, type: 'text', category: 'Clinic' },
    { id: 'consultation_fee', label: 'Consultation Fee (PKR)', mandatory: true, type: 'number', category: 'Clinic' },
    { id: 'weekly_off', label: 'Weekly Off Day', mandatory: false, type: 'select', options: ['None', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], category: 'Clinic' },
    { id: 'schedule_notes', label: 'Schedule Notes', mandatory: false, type: 'textarea', category: 'Clinic' }, 
    { id: 'room_number', label: 'Room Number', mandatory: false, type: 'text', category: 'Clinic' },
];

// Define the steps for the multi-step form
const FORM_STEPS = [
    { step: 1, title: 'Personal Information', icon: User, category: 'Personal' },
    { step: 2, title: 'Educational Background', icon: BookOpen, category: 'Educational' },
    { step: 3, title: 'Clinic & Schedule', icon: Clock, category: 'Clinic' },
];

/**
 * Global helper function to safely convert form data to a string or null
 */
const getStringValue = (value) => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return null;
    }
    return String(value);
};

/**
 * CRITICAL DATA MAPPING FUNCTION
 */
const mapFormDataToDB = (formData) => {
    const dbPayload = {
        // --- Personal Data ---
        name: getStringValue(formData.name),
        email: getStringValue(formData.email),
        phone: getStringValue(formData.phone),
        gender: getStringValue(formData.gender),
        date_of_birth: getStringValue(formData.date_of_birth),
        national_id: getStringValue(formData.national_id),
        
        // --- Educational Data ---
        highest_degree: getStringValue(formData.highest_degree),
        institution: getStringValue(formData.institution),
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        certifications: getStringValue(formData.certifications),
        
        // --- Clinic Data ---
        role: getStringValue(formData.role),
        department: getStringValue(formData.department),
        weekly_off: getStringValue(formData.weekly_off),
        
        // MAPPING REQUIRED (Frontend ID -> SQL Column Name)
        license_number: getStringValue(formData.license_id),
        specialization: getStringValue(formData.specialty),
        
        consultation_fee: parseFloat(formData.consultation_fee || 0),
        schedule_notes: getStringValue(formData.schedule_notes), 
        room_number: getStringValue(formData.room_number) || 'Unassigned', 
        status: getStringValue(formData.status) || 'Active',
    };
    
    // Clean up null values
    Object.keys(dbPayload).forEach(key => {
        if (dbPayload[key] === null && key !== 'room_number' && key !== 'status') {
            delete dbPayload[key];
        }
    });
    
    return dbPayload;
};

/**
 * FIXED: Helper function to manage inserts/updates into 'doctor_schedules' table
 */
const processSchedule = async (doctorId, scheduleData) => {
    try {
        console.log('Processing schedule for doctor:', doctorId);
        console.log('Schedule data:', scheduleData);
        
        // CRITICAL FIX: Map Frontend Day Name to SQL INTEGER (1=Monday, 7=Sunday)
        const DAY_TO_INT = {
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6,
            'Sunday': 7
        };
        
        // Prepare the payload for bulk insert
        const schedulePayload = WEEK_DAYS
            .map(day => {
                const daySchedule = scheduleData[day];
                
                // Only include days with both start and end times defined
                if (daySchedule && daySchedule.start && daySchedule.end) {
                    return {
                        doctor_id: doctorId,
                        day_of_week: DAY_TO_INT[day],
                        start_time: daySchedule.start,
                        end_time: daySchedule.end,
                        slot_type: 'In-Office'
                    };
                }
                return null;
            })
            .filter(item => item !== null);
        
        console.log('Schedule payload to insert:', schedulePayload);
        
        // 1. Clear existing schedule
        const { error: deleteError } = await supabase
            .from('doctor_schedules')
            .delete()
            .eq('doctor_id', doctorId);
            
        if (deleteError) {
            console.error('Supabase Schedule Delete Error:', deleteError);
            throw new Error(`Failed to clear existing schedule: ${deleteError.message}`);
        }

        // 2. Insert the new schedule (if any slots were defined)
        if (schedulePayload.length > 0) {
            const { data: insertData, error: insertError } = await supabase
                .from('doctor_schedules')
                .insert(schedulePayload)
                .select();
                
            if (insertError) {
                console.error('Supabase Schedule Insert Error:', insertError);
                throw new Error(`Failed to insert schedule: ${insertError.message}`);
            }
            
            console.log('Schedule inserted successfully:', insertData);
        } else {
            console.log('No schedule data to insert');
        }
        
        return true;
    } catch (error) {
        console.error('Error in processSchedule:', error);
        throw error;
    }
};

const doctorsAPI = {
    getAll: async () => {
        try {
            // FIXED: Map SQL Integer back to Frontend Day Name
            const INT_TO_DAY = {
                1: 'Monday',
                2: 'Tuesday',
                3: 'Wednesday',
                4: 'Thursday',
                5: 'Friday',
                6: 'Saturday',
                7: 'Sunday'
            };
            
            // 1. Fetch Doctor Data
            const { data: doctorsData, error: doctorsError } = await supabase
                .from(DOCTOR_TABLE)
                .select('*');

            if (doctorsError) {
                console.error('Supabase Fetch Error:', doctorsError);
                throw doctorsError;
            }
            
            // 2. Fetch Schedule Data
            const { data: schedulesData, error: schedulesError } = await supabase
                .from('doctor_schedules')
                .select('*');
                
            if (schedulesError) {
                console.error('Supabase Schedule Fetch Error:', schedulesError);
                throw schedulesError;
            }
            
            console.log('Fetched schedules:', schedulesData);
            
            // 3. Group schedules by doctor_id
            const schedulesByDoctor = schedulesData.reduce((acc, schedule) => {
                const dayName = INT_TO_DAY[schedule.day_of_week];
                
                if (dayName) {
                    if (!acc[schedule.doctor_id]) {
                        acc[schedule.doctor_id] = WEEK_DAYS.reduce((dAcc, day) => {
                            dAcc[day] = { start: '', end: '' };
                            return dAcc;
                        }, {});
                    }
                    acc[schedule.doctor_id][dayName] = { 
                        start: schedule.start_time, 
                        end: schedule.end_time 
                    };
                }
                return acc;
            }, {});

            // 4. Map and merge results
            return doctorsData.map(d => ({ 
                ...d, 
                id: d.doctor_id,
                specialty: d.specialization,
                license_id: d.license_number,
                consultation_fee: d.consultation_fee || 0,
                schedule: schedulesByDoctor[d.doctor_id] || WEEK_DAYS.reduce((acc, day) => {
                    acc[day] = { start: '', end: '' };
                    return acc;
                }, {}),
            }));
        } catch (error) {
            console.error('Error in getAll:', error);
            throw error;
        }
    },
    
    create: async (formData) => {
        try {
            console.log('Creating doctor with form data:', formData);
            
            // 1. Separate schedule data
            const scheduleData = formData.schedule; 
            
            // 2. Map form data to DB payload
            const dbPayload = mapFormDataToDB(formData);
            console.log('DB Payload:', dbPayload);
            
            // 3. Insert Doctor record
            const { data, error } = await supabase
                .from(DOCTOR_TABLE)
                .insert([dbPayload])
                .select();

            if (error) {
                console.error('Supabase Insert Error:', error);
                throw error;
            }
            
            console.log('Doctor created:', data);
            const newDoctorId = data[0].doctor_id;
            
            // 4. Insert schedule
            await processSchedule(newDoctorId, scheduleData); 

            // 5. Return data
            return { 
                ...data[0], 
                id: data[0].doctor_id,
                specialty: data[0].specialization,
                license_id: data[0].license_number,
                schedule: scheduleData, 
            };
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    },
    
    update: async (id, formData) => {
        try {
            console.log('Updating doctor:', id, formData);
            
            // 1. Separate schedule data
            const scheduleData = formData.schedule; 
            
            // 2. Map form data to DB payload
            const dbPayload = mapFormDataToDB(formData);
            console.log('Update DB Payload:', dbPayload);
            
            // 3. Update Doctor record
            const { data, error } = await supabase
                .from(DOCTOR_TABLE)
                .update(dbPayload)
                .eq('doctor_id', id)
                .select(); 

            if (error) {
                console.error('Supabase Update Error:', error);
                throw error;
            }
            
            console.log('Doctor updated:', data);
            
            // 4. Update schedule
            await processSchedule(id, scheduleData); 

            // 5. Return data
            return { 
                ...data[0], 
                id: data[0].doctor_id,
                specialty: data[0].specialization,
                license_id: data[0].license_number,
                schedule: scheduleData, 
            };
        } catch (error) {
            console.error('Error in update:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const { error } = await supabase
                .from(DOCTOR_TABLE)
                .delete()
                .eq('doctor_id', id);

            if (error) {
                console.error('Supabase Delete Error:', error);
                throw error;
            }
            return true;
        } catch (error) {
            console.error('Error in delete:', error);
            throw error;
        }
    },
};

// --- Data Persistence Utilities ---
const loadLocalFormConfiguration = () => {
    if (typeof window !== 'undefined') {
        const storedConfig = localStorage.getItem(STORAGE_KEY);
        if (storedConfig) {
            return JSON.parse(storedConfig);
        }
    }
    return MASTER_DOCTOR_FIELDS.reduce((acc, field) => {
        acc[field.id] = field.mandatory;
        return acc;
    }, {});
};

// --- Sub-Components ---

const FormField = ({ field, value, onChange }) => {
    if (field.type === 'select') {
        return (
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                    {field.label}
                    {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                >
                    <option value="">Select {field.label}</option>
                    {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        );
    }

    if (field.type === 'textarea') {
        return (
            <div className="space-y-2 col-span-full">
                <label className="block text-sm font-semibold text-gray-700">
                    {field.label}
                    {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                    rows="3"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
                {field.label}
                {field.mandatory && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={field.type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                placeholder={`Enter ${field.label.toLowerCase()}`}
            />
        </div>
    );
};

const AddEditDoctorModal = ({ isOpen, onClose, doctorData, onSaveSuccess, activeFields, allFields }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(doctorData);
    const [saving, setSaving] = useState(false);
    
    const isEditMode = !!doctorData.id;

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setFormData(doctorData);
        }
    }, [isOpen, doctorData]);

    const handleChange = (id, value) => {
        if (id.startsWith('schedule.')) {
            const [_, day, type] = id.split('.');
            setFormData(prev => ({
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: {
                        ...(prev.schedule?.[day] || { start: '', end: '' }),
                        [type]: value
                    }
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const validateStep = (step) => {
        const stepDef = FORM_STEPS.find(s => s.step === step);
        const stepCategory = stepDef?.category;
        
        const fields = allFields.filter(f => f.category === stepCategory && f.mandatory && activeFields.includes(f.id));
        
        const missing = fields.filter(f => {
            const value = formData[f.id];
            return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
        });
        
        if (missing.length > 0) {
            toast.error(`❌ Mandatory field missing: ${missing[0].label}`, { position: 'top-right' });
            return false;
        }

        if (step === 3) {
            const schedule = formData.schedule || {};
            const availableDays = WEEK_DAYS.filter(day => {
                const daySchedule = schedule[day];
                return daySchedule && (daySchedule.start || daySchedule.end);
            });

            if (availableDays.length > 0) {
                 for (const day of availableDays) {
                    if (!schedule[day].start || !schedule[day].end) {
                        toast.error(`❌ Schedule incomplete for ${day}`, { position: 'top-right' });
                        return false;
                    }
                }
            }
        }
        
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };
    
    const handlePrevious = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSave = async () => {
        if (!validateStep(FORM_STEPS.length)) {
            return;
        }

        try {
            setSaving(true);
            console.log('Saving doctor with data:', formData);
            
            const savedDoctor = isEditMode 
                ? await doctorsAPI.update(formData.id, formData)
                : await doctorsAPI.create(formData);
            
            toast.success(`✅ Doctor ${isEditMode ? 'updated' : 'added'} successfully!`, { position: 'top-right' });
            onSaveSuccess(savedDoctor);
            onClose();
        } catch (error) {
            console.error('Error saving doctor:', error);
            
            let errorMessage = 'Error saving doctor. Check console for details.';
            
            if (error.message.includes('duplicate key')) {
                errorMessage = 'License ID or Email already exists.';
            } else if (error.message.includes('not-null constraint')) {
                errorMessage = 'Required field is missing.';
            } else if (error.message.includes('schedule')) {
                errorMessage = `Schedule error: ${error.message}`;
            }
            
            toast.error(`❌ ${errorMessage}`, { position: 'top-right', duration: 5000 });
        } finally {
            setSaving(false);
        }
    };

    const renderStepContent = (step) => {
        const stepDef = FORM_STEPS.find(s => s.step === step);
        const fields = allFields.filter(f => f.category === stepDef.category && activeFields.includes(f.id));

        if (step === 3) {
            const schedule = formData.schedule || {};

            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fields.filter(f => f.id !== 'schedule_notes').map(field => (
                            <FormField
                                key={field.id}
                                field={field}
                                value={formData[field.id]}
                                onChange={(val) => handleChange(field.id, val)}
                            />
                        ))}
                    </div>

                    <h4 className="text-xl font-bold text-gray-800 border-b pb-2 mt-4">Weekly Schedule</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                        {WEEK_DAYS.map(day => (
                            <div key={day} className="border-b pb-3 space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    {day}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        placeholder="Start"
                                        value={schedule[day]?.start || ''}
                                        onChange={(e) => handleChange(`schedule.${day}.start`, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <input
                                        type="time"
                                        placeholder="End"
                                        value={schedule[day]?.end || ''}
                                        onChange={(e) => handleChange(`schedule.${day}.end`, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <FormField
                        field={allFields.find(f => f.id === 'schedule_notes')}
                        value={formData['schedule_notes']}
                        onChange={(val) => handleChange('schedule_notes', val)}
                    />
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fields.map(field => (
                    <FormField
                        key={field.id}
                        field={field}
                        value={formData[field.id]}
                        onChange={(val) => handleChange(field.id, val)}
                    />
                ))}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {isEditMode ? 'Edit Doctor' : 'Add New Doctor'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {FORM_STEPS[currentStep - 1].title} ({currentStep}/{FORM_STEPS.length})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex justify-between items-center p-6 border-b">
                    {FORM_STEPS.map((stepDef) => (
                        <div key={stepDef.step} className="flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    stepDef.step === currentStep ? 'bg-purple-600 text-white shadow-lg' :
                                    stepDef.step < currentStep ? 'bg-green-500 text-white' : 
                                    'bg-gray-200 text-gray-500'
                                }`}>
                                <stepDef.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-xs mt-2 font-medium ${stepDef.step === currentStep ? 'text-purple-600' : 'text-gray-500'}`}>
                                {stepDef.title}
                            </span>
                        </div>
                    ))}
                </div>
                
                <div className="flex-1 overflow-y-auto p-8">
                    {renderStepContent(currentStep)}
                </div>

                <div className="flex gap-4 p-6 border-t bg-gray-50">
                    {currentStep > 1 && (
                        <button
                            onClick={handlePrevious}
                            className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700"
                        >
                            <ChevronLeft className="w-5 h-5" /> Previous
                        </button>
                    )}
                    
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="ml-auto px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    {currentStep < FORM_STEPS.length ? (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2"
                        >
                            Next Step <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-xl font-semibold disabled:opacity-50"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </span>
                            ) : (
                                isEditMode ? 'Update Doctor' : 'Save Doctor'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function DoctorListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [formConfig, setFormConfig] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showViewDoctor, setShowViewDoctor] = useState(false)
  
  const [doctorToDelete, setDoctorToDelete] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [newDoctor, setNewDoctor] = useState({})
  
  const [showColumnVisibility, setShowColumnVisibility] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [visibleColumns, setVisibleColumns] = useState({
    name: true, specialty: true, license_id: true, phone: true
  })

  const activeFieldIds = useMemo(() => {
    if (!formConfig) {
        return MASTER_DOCTOR_FIELDS.filter(f => f.mandatory || ['name', 'specialty', 'license_id', 'phone'].includes(f.id)).map(f => f.id) 
    }
    
    return MASTER_DOCTOR_FIELDS
      .filter(f => formConfig[f.id] === true)
      .map(f => f.id)
  }, [formConfig]);

  const loadData = async () => {
    try {
      setLoading(true)
      
      const configData = loadLocalFormConfiguration();
      setFormConfig(configData)
      
      const doctorsData = await doctorsAPI.getAll();
      setDoctors([...doctorsData]) 
      
      const initialDoctor = {}
      MASTER_DOCTOR_FIELDS.forEach(field => {
          initialDoctor[field.id] = '';
      });
      
      initialDoctor.schedule = WEEK_DAYS.reduce((acc, day) => {
          acc[day] = { start: '', end: '' };
          return acc;
      }, {});
      setNewDoctor(initialDoctor);

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('❌ Error loading data', { position: 'top-right' });
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []) 

  const filteredDoctors = useMemo(() => {
    const combinedSearch = searchTerm.toLowerCase()
    const tableSearchLower = tableSearch.toLowerCase()
    
    return doctors.filter(doctor => {
      const mainSearchMatch = 
        doctor.name?.toLowerCase().includes(combinedSearch) ||
        doctor.specialty?.toLowerCase().includes(combinedSearch) ||
        doctor.phone?.includes(combinedSearch) ||
        doctor.license_id?.toLowerCase().includes(combinedSearch)
      
      const tableSearchMatch = 
        doctor.name?.toLowerCase().includes(tableSearchLower) ||
        doctor.specialty?.toLowerCase().includes(tableSearchLower) ||
        doctor.phone?.includes(tableSearchLower) ||
        doctor.license_id?.toLowerCase().includes(tableSearchLower)
      
      return mainSearchMatch && tableSearchMatch
    })
  }, [doctors, searchTerm, tableSearch])

  const indexOfLastDoctor = currentPage * rowsPerPage
  const indexOfFirstDoctor = indexOfLastDoctor - rowsPerPage
  const currentDoctors = filteredDoctors.slice(indexOfFirstDoctor, indexOfLastDoctor)
  const totalPages = Math.ceil(filteredDoctors.length / rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, tableSearch, rowsPerPage])

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  const handleOpenAddDoctor = () => {
    const reset = { schedule: WEEK_DAYS.reduce((acc, day) => { acc[day] = { start: '', end: '' }; return acc; }, {}) }
    MASTER_DOCTOR_FIELDS.forEach(field => reset[field.id] = '')
    setNewDoctor(reset)
    setSelectedDoctor(null)
    setShowAddDoctor(true)
  }

  const openEditModal = (doctor) => {
    const doctorDataForForm = {};
    
    MASTER_DOCTOR_FIELDS.map(f => f.id).forEach(field => {
        doctorDataForForm[field] = doctor[field] === null || doctor[field] === undefined ? '' : String(doctor[field]);
    });
    doctorDataForForm.id = doctor.id;
    doctorDataForForm.schedule = doctor.schedule || WEEK_DAYS.reduce((acc, day) => {
          acc[day] = { start: '', end: '' };
          return acc;
      }, {});

    setNewDoctor(doctorDataForForm)
    setSelectedDoctor(doctor)
    setShowAddDoctor(true)
  }
  
  const openViewModal = (doctor) => {
    setSelectedDoctor(doctor)
    setShowViewDoctor(true)
  }

  const deleteDoctor = (doctor) => {
    setDoctorToDelete(doctor)
    setShowDeleteConfirm(true)
  }

  const handleSaveSuccess = (savedDoctor) => {
      const existingIndex = doctors.findIndex(d => d.id === savedDoctor.id);
      if (existingIndex !== -1) {
          setDoctors(prev => prev.map(d => d.id === savedDoctor.id ? savedDoctor : d));
      } else {
          setDoctors(prev => [savedDoctor, ...prev]);
      }
      setShowAddDoctor(false);
  }
  
  const handleConfirmDelete = async () => {
    if (!doctorToDelete) return;

    try {
        await doctorsAPI.delete(doctorToDelete.id);
        setDoctors(prev => prev.filter(d => d.id !== doctorToDelete.id)); 
        toast.success(`✅ Doctor deleted successfully!`, { position: 'top-right' }); 
        setShowDeleteConfirm(false);
        setDoctorToDelete(null);
    } catch (error) {
        console.error('Error deleting doctor:', error);
        toast.error('❌ Error deleting doctor', { position: 'top-right' }); 
    }
  }

  const exportToExcel = () => toast.success('Exporting to Excel...', { position: 'top-right' }); 
  const exportToPDF = () => toast.success('Exporting to PDF...', { position: 'top-right' });

  const printDoctor = (doctor) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    
    let htmlContent = `
        <html>
        <head>
            <title>Doctor: ${doctor.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #4c1d95; text-align: center; margin-bottom: 25px; }
                .section-title { font-size: 1.25rem; font-weight: 700; color: #6d28d9; margin-top: 20px; }
                .record-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .detail { padding: 12px; background-color: #f9fafb; border-radius: 6px; }
                .detail-label { font-weight: 600; color: #6b7280; }
                .detail-value { font-weight: 500; }
                .schedule-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .schedule-table th, .schedule-table td { border: 1px solid #e5e7eb; padding: 10px; }
                .schedule-table th { background-color: #ede9fe; }
            </style>
        </head>
        <body>
            <h1>Doctor: ${doctor.name}</h1>
            <div class="record-container">
    `;

    FORM_STEPS.forEach(step => {
        const stepFields = MASTER_DOCTOR_FIELDS.filter(f => f.category === step.category);
        
        htmlContent += `<div class="section-title" style="grid-column: span 2;">${step.title}</div>`;

        stepFields.forEach((fieldDef) => {
            const key = fieldDef.id;
            const val = doctor[key];
            if (val === null || val === undefined || val === '' || key === 'schedule_notes') return null;
            
            htmlContent += `
                <div class="detail">
                    <span class="detail-label">${fieldDef.label}:</span> 
                    <span class="detail-value">${String(val)}</span>
                </div>
            `;
        });
        
        if (step.category === 'Clinic' && doctor.schedule) {
            htmlContent += `
                <div style="grid-column: span 2;">
                    <h4 class="section-title">Schedule</h4>
                    <table class="schedule-table">
                        <thead><tr><th>Day</th><th>Time</th></tr></thead>
                        <tbody>
            `;
            WEEK_DAYS.forEach(day => {
                const schedule = doctor.schedule[day];
                const time = (schedule?.start && schedule?.end) ? `${schedule.start} - ${schedule.end}` : 'Unavailable';
                htmlContent += `<tr><td>${day}</td><td>${time}</td></tr>`;
            });
            htmlContent += `</tbody></table></div>`;
        }
        
        if (step.category === 'Clinic' && doctor.schedule_notes) {
             htmlContent += `
                <div style="grid-column: span 2;">
                    <h4 class="section-title">Notes</h4>
                    <div class="detail-value">${doctor.schedule_notes}</div>
                </div>
            `;
        }
    });

    htmlContent += `</div></body></html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
    toast.success(`🖨️ Printing...`, { position: 'top-right' }); 
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between py-4 border-b">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="w-8 h-8 text-purple-600" />
              Doctor Management
          </h1>
          <div className="p-3 bg-purple-100 rounded-xl flex items-center gap-3">
              <span className="text-xl font-bold text-purple-700">{doctors.length}</span>
              <span className="text-sm text-purple-600">Total Doctors</span>
          </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                  type="text"
                  placeholder="Search doctors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
          </div>
          <button 
            onClick={handleOpenAddDoctor} 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-2xl border">
        
        <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowColumnVisibility(!showColumnVisibility)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                <Columns className="w-4 h-4" />
                Columns
              </button>
              {showColumnVisibility && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border p-3 z-10">
                  <div className="space-y-2">
                    {MASTER_DOCTOR_FIELDS
                        .filter(f => activeFieldIds.includes(f.id))
                        .map(field => (
                        <label key={field.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                            <input 
                              type="checkbox" 
                              checked={!!visibleColumns[field.id]}
                              onChange={(e) => setVisibleColumns({...visibleColumns, [field.id]: e.target.checked})}
                              className="rounded w-4 h-4" 
                            />
                            <span className="text-sm">{field.label}</span>
                        </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm"
            >
                {[10, 20, 50, 100].map(num => (
                    <option key={num} value={num}>{num}</option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Filter..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {MASTER_DOCTOR_FIELDS
                    .filter(f => visibleColumns[f.id])
                    .map(field => (
                        <th key={field.id} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                            {field.label}
                        </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {currentDoctors.length === 0 ? (
                <tr>
                  <td colSpan={MASTER_DOCTOR_FIELDS.filter(f => visibleColumns[f.id]).length + 1} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-400 mb-3" />
                      <h3 className="text-base font-semibold text-gray-900">No doctors found</h3>
                      <p className="text-sm text-gray-500">Add a new doctor to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    {MASTER_DOCTOR_FIELDS
                        .filter(f => visibleColumns[f.id])
                        .map(field => (
                        <td key={field.id} className="px-6 py-4 text-sm font-medium text-gray-900">
                            {doctor[field.id] || <span className="text-gray-400">-</span>}
                        </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openViewModal(doctor)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(doctor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteDoctor(doctor)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => printDoctor(doctor)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
                Showing {indexOfFirstDoctor + 1} to {Math.min(indexOfLastDoctor, filteredDoctors.length)} of {filteredDoctors.length}
            </div>
            
            <div className="flex items-center gap-3">
                <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                >
                <ChevronLeft className="w-4 h-4" />
                Previous
                </button>
                <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
                    currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                >
                Next
                <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      <AddEditDoctorModal 
        isOpen={showAddDoctor}
        onClose={() => setShowAddDoctor(false)}
        doctorData={newDoctor}
        onSaveSuccess={handleSaveSuccess}
        activeFields={activeFieldIds}
        allFields={MASTER_DOCTOR_FIELDS}
      />

      {showViewDoctor && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-teal-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedDoctor.name}</h2>
                <p className="text-sm text-gray-600 mt-1">Specialty: {selectedDoctor.specialty}</p>
              </div>
              <button onClick={() => setShowViewDoctor(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {FORM_STEPS.map(step => (
                <div key={step.step}>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                        <step.icon className="w-5 h-5 text-purple-600"/> {step.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {MASTER_DOCTOR_FIELDS
                            .filter(f => f.category === step.category)
                            .map((field) => {
                                const val = selectedDoctor[field.id];
                                if (!val) return null;

                                return (
                                    <div key={field.id} className="bg-gray-50 rounded-lg p-4 border">
                                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                                        {field.label}
                                    </span>
                                    <span className="font-semibold text-gray-800 text-sm">
                                        {String(val)}
                                    </span>
                                    </div>
                                )
                            })}
                        {step.category === 'Clinic' && selectedDoctor.schedule && (
                            <div className="sm:col-span-2 bg-gray-100 rounded-lg p-4 border">
                                <span className="text-sm font-bold text-purple-700 block mb-3">Schedule</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                    {WEEK_DAYS.map(day => {
                                        const schedule = selectedDoctor.schedule[day];
                                        const time = (schedule?.start && schedule?.end) ? `${schedule.start} - ${schedule.end}` : 'Off';
                                        return (
                                            <div key={day}>
                                                <span className="font-semibold text-gray-700">{day}:</span>
                                                <span className="text-gray-600 ml-1">{time}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {showDeleteConfirm && doctorToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-sm text-gray-500">
                Delete <span className="font-semibold">{doctorToDelete.name}</span>? This cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 p-4 bg-gray-50 border-t">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDoctorToDelete(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}