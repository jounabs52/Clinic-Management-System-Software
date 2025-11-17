'use client'
import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Upload, Clock, DollarSign, Bell, Shield, 
  Palette, Calendar, Mail, Phone, MapPin, Building,
  CreditCard, Percent, Hash, CheckCircle, XCircle, Globe,
  Loader2, Info // <-- INFO IS ADDED HERE
} from 'lucide-react';

// Replace mockAPI with actual Supabase calls
import { settingsAPI } from '@/lib/supabase'

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [toast, setToast] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
        const data = await settingsAPI.getSettings();
      setSettings(data);
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        await settingsAPI.saveSettings(settings);

      showToast('Settings saved successfully!', 'success');
      setHasChanges(false);
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Settings...</p>
        </div>
      </div>
    );
  }
  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Content - now includes the page heading and tabs */}
      <div className="max-w-7xl mx-auto px-6 py-8"> 

        {/* New Page Header (Title + Save Button) - Moved from the redundant Header section */}
        <div className="mb-8"> 
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-purple-600" />
                System Settings
              </h1>
              <p className="text-gray-600 mt-1">Configure your clinic management system</p>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
                hasChanges && !saving
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation - Moved from the redundant Header section and restyled */}
        <div className="flex gap-4 overflow-x-auto mb-8 border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-3 font-medium whitespace-nowrap transition-all border-b-4 ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>


        {/* GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building className="text-purple-600" size={24} />
                Clinic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    value={settings.clinicName}
                    onChange={(e) => handleChange('clinicName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter clinic name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin size={16} className="inline mr-1" />
                    Address *
                  </label>
                  <textarea
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Enter complete address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail size={16} className="inline mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="contact@clinic.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Globe size={16} className="inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="www.yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Upload className="text-purple-600" size={24} />
                Clinic Logo
              </h2>
              
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium cursor-pointer hover:bg-purple-700 transition-all"
                  >
                    <Upload size={18} />
                    Upload Logo
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Recommended size: 200x200px, Max 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="text-purple-600" size={24} />
                Working Hours
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Working Hours Display</p>
                  <p>These hours will be shown in {new Date(`2000-01-01T${settings.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} to {new Date(`2000-01-01T${settings.endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} format on invoices and appointment confirmations.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENT SETTINGS */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar className="text-purple-600" size={24} />
                Appointment Rules
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Default Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultDuration}
                    onChange={(e) => handleChange('defaultDuration', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="5"
                    step="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time Slot Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.slotInterval}
                    onChange={(e) => handleChange('slotInterval', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="5"
                    step="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buffer Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.bufferTime}
                    onChange={(e) => handleChange('bufferTime', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="0"
                    step="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time between appointments</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Advance Booking (days)
                  </label>
                  <input
                    type="number"
                    value={settings.maxAdvanceBooking}
                    onChange={(e) => handleChange('maxAdvanceBooking', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cancellation Policy
                  </label>
                  <textarea
                    value={settings.cancellationPolicy}
                    onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Describe your cancellation policy..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Booking Options</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Allow Online Booking</span>
                    <p className="text-sm text-gray-600 mt-1">Patients can book appointments online</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowOnlineBooking}
                    onChange={(e) => handleChange('allowOnlineBooking', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Require Approval</span>
                    <p className="text-sm text-gray-600 mt-1">Staff must approve online bookings</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) => handleChange('requireApproval', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* BILLING SETTINGS */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="text-purple-600" size={24} />
                Financial Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Percent size={16} className="inline mr-1" />
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Hash size={16} className="inline mr-1" />
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="INV-"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Grace Period (days)
                  </label>
                  <input
                    type="number"
                    value={settings.graceperiod}
                    onChange={(e) => handleChange('gracePeriod', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Payment due period</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="text-purple-600" size={24} />
                Payment Methods
              </h2>
              
              <div className="space-y-3">
                {['Cash', 'Card', 'Bank Transfer', 'Mobile Payment', 'Insurance'].map(method => (
                  <label key={method} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className="font-medium text-gray-900">{method}</span>
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.includes(method) || false}

                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...settings.paymentMethods, method]
                          : settings.paymentMethods.filter(m => m !== method);
                        handleChange('paymentMethods', methods);
                      }}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Invoice Options</h2>
              
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <span className="font-semibold text-gray-900">Auto-Generate Invoices</span>
                  <p className="text-sm text-gray-600 mt-1">Automatically create invoices for completed appointments</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoInvoiceGeneration}
                  onChange={(e) => handleChange('autoInvoiceGeneration', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* NOTIFICATION SETTINGS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Reminder Settings</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Appointment Reminders</span>
                    <p className="text-sm text-gray-600 mt-1">Send automatic reminders before appointments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.appointmentReminders}
                    onChange={(e) => handleChange('appointmentReminders', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>

                {settings.appointmentReminders && (
                  <div className="ml-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Send reminder (hours before appointment)
                    </label>
                    <input
                      type="number"
                      value={settings.reminderHours}
                      onChange={(e) => handleChange('reminderHours', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="72"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Payment Reminders</span>
                    <p className="text-sm text-gray-600 mt-1">Remind patients about pending payments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.paymentReminders}
                    onChange={(e) => handleChange('paymentReminders', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Marketing Emails</span>
                    <p className="text-sm text-gray-600 mt-1">Send promotional and health tips emails</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.marketingEmails}
                    onChange={(e) => handleChange('marketingEmails', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY SETTINGS */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="text-purple-600" size={24} />
                Account Security
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Two-Factor Authentication (2FA)</span>
                    <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleChange('twoFactorAuth', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password Expiry (days)
                    </label>
                    <input
                      type="number"
                      value={settings.passwordExpiry}
                      onChange={(e) => handleChange('passwordExpiry', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">0 = Never expire</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE SETTINGS */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="text-purple-600" size={24} />
                UI & Personalization
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Interface Theme
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleChange('theme', 'light')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        settings.theme === 'light'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-full h-20 bg-gradient-to-b from-white to-gray-100 rounded mb-3 border border-gray-200"></div>
                      <p className="font-semibold text-center">Light Mode</p>
                    </button>
                    <button
                      onClick={() => handleChange('theme', 'dark')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        settings.theme === 'dark'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-full h-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded mb-3 border border-gray-700"></div>
                      <p className="font-semibold text-center">Dark Mode</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Accent Color
                  </label>
                  <div className="flex gap-3">
                    {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleChange('accentColor', color)}
                        className={`w-12 h-12 rounded-full transition-all ${
                          settings.accentColor === color
                            ? 'ring-4 ring-offset-2 ring-purple-300 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {settings.accentColor === color && (
                          <CheckCircle className="w-6 h-6 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => handleChange('dateFormat', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (14/11/2025)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (11/14/2025)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2025-11-14)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time Format
                    </label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => handleChange('timeFormat', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="12h">12-hour (02:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="en">English</option>
                      <option value="ur">اردو (Urdu)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-semibold text-gray-900">Compact Mode</span>
                    <p className="text-sm text-gray-600 mt-1">Reduce spacing for more content on screen</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(e) => handleChange('compactMode', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">Preview Your Changes</p>
                  <p>Changes to theme and appearance will be applied immediately across all pages. Make sure to save your preferences before leaving this page.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;