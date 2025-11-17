// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =========================================================================
// INVOICE MODULE APIs (Existing)
// =========================================================================

// Doctors API
export const doctorsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('doctors')
      .select('doctor_id, name, specialization')
      .eq('status', 'Active')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },
};

// Services API (Price List)
export const servicesAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, standard_price')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    
    return data.map(s => ({
      ...s,
      price: s.standard_price, 
    })); 
  },
};

// Invoices API
export const invoicesAPI = {
  async generateInvoiceNumber() {
    const prefix = 'INV-';
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}${datePart}-${randomPart}`;
  },

  async create(invoiceData) {
    const { 
      patient, attendingDoctor, services,
      subTotal, grandTotal, totalDiscount, netAmount, notes 
    } = invoiceData;

    const invoiceNumber = await this.generateInvoiceNumber();

    const { data: invoiceHeader, error: headerError } = await supabase
      .from('invoices')
      .insert({
        patient_id: patient.id,
        patient_name: patient.name,
        patient_mr_number: patient.patient_id,
        invoice_number: invoiceNumber, 
        total_amount: subTotal,
        discount: totalDiscount,
        net_amount: netAmount,
        notes: notes,
        doctor_id: attendingDoctor.doctor_id,
        doctor_name: attendingDoctor.name,
        status: netAmount > 0 ? 'unpaid' : 'paid',
      })
      .select('id, invoice_number')
      .single();

    if (headerError) throw headerError;
    const newInvoiceId = invoiceHeader.id;

    const itemsToInsert = services.map(item => ({
      invoice_id: newInvoiceId,
      service_name: item.service,
      unit_charge: item.charges,
      quantity: item.qty,
      discount: item.discount,
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
    
    return { 
        success: true, 
        invoiceNumber: invoiceHeader.invoice_number, 
        id: newInvoiceId 
    };
  },
};

// =========================================================================
// TREATMENT PLAN MODULE APIs (Fixed)
// =========================================================================

// Treatment Plans API
export const treatmentPlansAPI = {
  async create(planData) {
    const { data, error } = await supabase
      .from('treatment_plans')
      .insert(planData)
      .select()
      .single()
    if (error) throw error
    return data
  },
  
  async getAll() {
    const { data, error } = await supabase
      .from('treatment_plans')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(planId) {
    const { data, error } = await supabase
      .from('treatment_plans')
      .select('*')
      .eq('plan_id', planId)
      .single()
    if (error) throw error
    return data
  }
}

// Plan Medications API
export const planMedicationsAPI = {
  async createMultiple(medications) {
    if (!medications || medications.length === 0) return []
    
    const { data, error } = await supabase
      .from('plan_medications')
      .insert(medications)
      .select()
    
    if (error) throw error
    return data
  },

  async getByPlanId(planId) {
    const { data, error } = await supabase
      .from('plan_medications')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// Plan Procedures API (Procedures, Therapies, Lab Tests)
export const planProceduresAPI = {
  async createMultiple(procedures) {
    if (!procedures || procedures.length === 0) return []
    
    const { data, error } = await supabase
      .from('plan_procedures')
      .insert(procedures)
      .select()
    
    if (error) throw error
    return data
  },

  async getByPlanId(planId) {
    const { data, error } = await supabase
      .from('plan_procedures')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// Form Configuration API
export const formConfigAPI = {
  async getConfig() {
    const { data, error } = await supabase
      .from('form_configurations')
      .select('*')
      .eq('configuration_name', 'default')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async saveConfig(config) {
    const { data: existing } = await supabase
      .from('form_configurations')
      .select('id')
      .eq('configuration_name', 'default')
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('form_configurations')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('form_configurations')
        .insert([{ ...config, configuration_name: 'default' }])
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }
}

// Patients API
export const patientsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async generateMRNumber() {
    const { data, error } = await supabase
      .rpc('generate_mr_number')
    
    if (error) {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
      
      return `MR-${String((count || 0) + 1).padStart(3, '0')}`
    }
    
    return data
  },
  
  async create(patientData) {
    if (!patientData.mr_number) {
      patientData.mr_number = await this.generateMRNumber()
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id, patientData) {
    const { data, error } = await supabase
      .from('patients')
      .update(patientData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async search(searchTerm) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, phone, mr_number')
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,mr_number.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return (data || []).map(p => ({
      ...p,
      patient_id: p.mr_number,
    }));
  }
}


// =========================================================================
// APPOINTMENTS MODULE APIs
// =========================================================================

export const appointmentsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        appointment_id, 
        appointment_date, 
        start_time, 
        end_time, 
        status, 
        appointment_type, 
        fee,
        notes,
        doctor_id,
        patient_id,
        doctor:doctors!inner(name),
        patient:patients!inner(name, mr_number)
      `)
      .order('appointment_date', { ascending: false })

    if (error) throw error
    
    return data?.map(app => ({ 
      id: app.appointment_id,
      appointment_date: app.appointment_date,
      start_time: app.start_time,
      end_time: app.end_time,
      status: app.status,
      appointment_type: app.appointment_type,
      fee: app.fee || 0,
      notes: app.notes,
      doctor_id: app.doctor_id,
      patient_id: app.patient_id,
      doctor_name: app.doctor?.name || 'Unknown',
      patient_name: app.patient?.name || 'Unknown',
      mr_number: app.patient?.mr_number
    })) || []
  },

  async create(appointmentData) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id, appointmentData) {
    const { data, error } = await supabase
      .from('appointments')
      .update(appointmentData)
      .eq('appointment_id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('appointment_id', id)
    
    if (error) throw error
    return true
  }
}

// Enhanced Doctors API for Appointments
export const appointmentDoctorsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('doctors')
      .select('doctor_id, name, specialization, consultation_fee')
      .eq('status', 'Active')
      .order('name', { ascending: true })
    
    if (error) throw error
    
    return data?.map(d => ({ 
      id: d.doctor_id, 
      name: d.name, 
      specialty: d.specialization,
      fee: d.consultation_fee || 0
    })) || []
  }
}



// Add this to your existing lib/supabase.js file

// =========================================================================
// SETTINGS MODULE APIs
// =========================================================================


export const settingsAPI = {

  // ========================================================
  // LOAD SETTINGS (DB → React camelCase)
  // ========================================================
  async getSettings() {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("id", 1)
      .single();

    // No row exists → return defaults
    if (error && error.code === "PGRST116") {
      return {
        clinicName: "InstaCare Gynecology Clinic",
        address: "",
        phone: "",
        email: "",
        website: "",
        startTime: "09:00",
        endTime: "18:00",
        logoUrl: null,

        defaultDuration: 30,
        slotInterval: 15,
        cancellationPolicy: "",
        allowOnlineBooking: true,
        requireApproval: false,
        bufferTime: 5,
        maxAdvanceBooking: 60,

        currency: "PKR",
        taxRate: 0,
        invoicePrefix: "INV-",
        autoInvoiceGeneration: true,
        paymentMethods: ["Cash", "Card", "Bank Transfer"],
        lateFee: 0,
        gracePeriod: 7,

        emailNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        reminderHours: 24,
        paymentReminders: true,
        marketingEmails: false,

        twoFactorAuth: false,
        passwordExpiry: 90,
        sessionTimeout: 30,
        ipRestriction: false,
        allowedIPs: [],

        theme: "light",
        accentColor: "#8B5CF6",
        compactMode: false,
        language: "en",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
      };
    }

    if (error) throw error;

    // ========================================================
    // Convert DB snake_case → React camelCase
    // ========================================================
    return {
      clinicName: data.clinic_name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      startTime: data.start_time,
      endTime: data.end_time,
      logoUrl: data.logo_url,

      defaultDuration: data.default_duration,
      slotInterval: data.slot_interval,
      cancellationPolicy: data.cancellation_policy,
      allowOnlineBooking: data.allow_online_booking,
      requireApproval: data.require_approval,
      bufferTime: data.buffer_time,
      maxAdvanceBooking: data.max_advance_booking,

      currency: data.currency,
      taxRate: data.tax_rate,
      invoicePrefix: data.invoice_prefix,
      autoInvoiceGeneration: data.auto_invoice_generation,

      paymentMethods: data.payment_methods || [], // IMPORTANT FIX
      lateFee: data.late_fee,
      gracePeriod: data.grace_period,

      emailNotifications: data.email_notifications,
      smsNotifications: data.sms_notifications,
      appointmentReminders: data.appointment_reminders,
      reminderHours: data.reminder_hours,
      paymentReminders: data.payment_reminders,
      marketingEmails: data.marketing_emails,

      twoFactorAuth: data.two_factor_auth,
      passwordExpiry: data.password_expiry,
      sessionTimeout: data.session_timeout,
      ipRestriction: data.ip_restriction,
      allowedIPs: data.allowed_ips || [],

      theme: data.theme,
      accentColor: data.accent_color,
      compactMode: data.compact_mode,
      language: data.language,
      dateFormat: data.date_format,
      timeFormat: data.time_format,
    };
  },

  // ========================================================
  // SAVE SETTINGS (React camelCase → DB snake_case)
  // ========================================================
  async saveSettings(settings) {
    const payload = {
      clinic_name: settings.clinicName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      start_time: settings.startTime,
      end_time: settings.endTime,
      logo_url: settings.logoUrl,

      default_duration: settings.defaultDuration,
      slot_interval: settings.slotInterval,
      cancellation_policy: settings.cancellationPolicy,
      allow_online_booking: settings.allowOnlineBooking,
      require_approval: settings.requireApproval,
      buffer_time: settings.bufferTime,
      max_advance_booking: settings.maxAdvanceBooking,

      currency: settings.currency,
      tax_rate: settings.taxRate,
      invoice_prefix: settings.invoicePrefix,
      auto_invoice_generation: settings.autoInvoiceGeneration,

      payment_methods: settings.paymentMethods || [], // IMPORTANT FIX
      late_fee: settings.lateFee,
      grace_period: settings.gracePeriod,

      email_notifications: settings.emailNotifications,
      sms_notifications: settings.smsNotifications,
      appointment_reminders: settings.appointmentReminders,
      reminder_hours: settings.reminderHours,
      payment_reminders: settings.paymentReminders,
      marketing_emails: settings.marketingEmails,

      two_factor_auth: settings.twoFactorAuth,
      password_expiry: settings.passwordExpiry,
      session_timeout: settings.sessionTimeout,
      ip_restriction: settings.ipRestriction,
      allowed_ips: settings.allowedIPs || [],

      theme: settings.theme,
      accent_color: settings.accentColor,
      compact_mode: settings.compactMode,
      language: settings.language,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("system_settings")
      .update(payload)
      .eq("id", 1)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========================================================
  // LOGO UPLOAD
  // ========================================================
  async uploadLogo(file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `clinic-logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("clinic-assets")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("clinic-assets")
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // ========================================================
  // DELETE LOGO
  // ========================================================
  async deleteLogo(logoUrl) {
    if (!logoUrl) return;

    const filePath = logoUrl.split("/").slice(-2).join("/");

    const { error } = await supabase.storage
      .from("clinic-assets")
      .remove([filePath]);

    if (error) throw error;
  }
};


// =========================================================================
// BACKUP & RESTORE APIs
// =========================================================================

export const backupAPI = {
  async createBackup() {
    // Call a Supabase Edge Function or PostgreSQL function to create backup
    const { data, error } = await supabase.rpc('create_full_backup')
    
    if (error) throw error
    return data
  },

  async getBackupHistory() {
    const { data, error } = await supabase
      .from('backup_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data || []
  },

  async restoreBackup(backupId) {
    const { data, error } = await supabase.rpc('restore_backup', {
      backup_id: backupId
    })
    
    if (error) throw error
    return data
  }
}

// lib/supabase.js - Add these functions to your existing supabase file

// User API functions
export const userAPI = {
  // Get current user by ID
  async getById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          email: updates.email,
          role: updates.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  },

  // Update user password
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      // First verify current password
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single()
      
      if (fetchError) throw fetchError
      
      // In a real app, you should use bcrypt to hash and compare passwords
      // For now, this is a simple comparison (NOT SECURE FOR PRODUCTION)
      if (user.password !== currentPassword) {
        throw new Error('Current password is incorrect')
      }
      
      // Update password
      const { data, error } = await supabase
        .from('users')
        .update({
          password: newPassword, // In production, hash this with bcrypt
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  },

  // Combined update (profile + optional password)
  async update(userId, updates) {
    try {
      // If password update is requested
      if (updates.currentPassword && updates.newPassword) {
        // First update password
        await this.updatePassword(
          userId,
          updates.currentPassword,
          updates.newPassword
        )
      }
      
      // Then update profile
      const profileData = await this.updateProfile(userId, {
        name: updates.name,
        email: updates.email,
        role: updates.role
      })
      
      return profileData
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }
}