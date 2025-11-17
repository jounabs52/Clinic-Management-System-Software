'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, DollarSign, Stethoscope, Activity, TrendingUp, 
  FileText, Clock, AlertCircle, CheckCircle, XCircle, Pill,
  BarChart3, PieChart, LineChart as LineChartIcon, Download
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  chart: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#8B5CF6']
};

export default function HealthcareReportsDashboard() {
  const [activeTab, setActiveTab] = useState('patient-reports');
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [patientsData, doctorsData, appointmentsData, invoicesData, treatmentPlansData] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('doctors').select('*'),
        supabase.from('appointments').select('*, patient:patient_id(name), doctor:doctor_id(name)'),
        supabase.from('invoices').select('*'),
        supabase.from('treatment_plans').select('*')
      ]);

      setPatients(patientsData.data || []);
      setDoctors(doctorsData.data || []);
      setAppointments(appointmentsData.data || []);
      setInvoices(invoicesData.data || []);
      setTreatmentPlans(treatmentPlansData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to filter by date range
  const filterByDateRange = (data, dateField) => {
    if (!dateRange || dateRange === 'all') return data;
    
    const now = new Date();
    const ranges = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '365days': 365
    };
    
    const daysAgo = ranges[dateRange] || 7;
    const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= cutoffDate;
    });
  };

  // PATIENT ANALYTICS
  const patientAnalytics = useMemo(() => {
    const totalPatients = patients.length;
    
    // Filter by date range for new patients
    const filteredPatients = filterByDateRange(patients, 'created_at');
    const newPatients = filteredPatients.length;
    
    // Active patients (those with appointments in selected range)
    const recentAppointments = filterByDateRange(appointments, 'appointment_date');
    const activePatientIds = new Set(recentAppointments.map(a => a.patient_id));
    const activePatients = activePatientIds.size;
    
    // Gender distribution
    const genderDist = patients.reduce((acc, p) => {
      const gender = p.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    
    // Age groups
    const ageGroups = patients.reduce((acc, p) => {
      const age = p.age || 0;
      let group = 'Unknown';
      if (age < 18) group = '0-17';
      else if (age < 30) group = '18-29';
      else if (age < 45) group = '30-44';
      else if (age < 60) group = '45-59';
      else if (age >= 60) group = '60+';
      
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
    
    // New patient trends (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = patients.filter(p => {
        const pDate = new Date(p.created_at).toISOString().split('T')[0];
        return pDate === dateStr;
      }).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      });
    }
    
    return {
      totalPatients,
      newPatients,
      activePatients,
      genderDist: Object.entries(genderDist).map(([name, value]) => ({ name, value })),
      ageGroups: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
      trends: last7Days
    };
  }, [patients, appointments, dateRange]);

  // DOCTOR ANALYTICS
  const doctorAnalytics = useMemo(() => {
    const totalDoctors = doctors.length;
    
    // Appointments per doctor
    const appointmentsByDoctor = appointments.reduce((acc, apt) => {
      const doctorId = apt.doctor_id;
      const doctor = doctors.find(d => d.doctor_id === doctorId);
      const doctorName = doctor?.name || 'Unknown';
      
      if (!acc[doctorName]) {
        acc[doctorName] = { appointments: 0, patients: new Set(), revenue: 0 };
      }
      
      acc[doctorName].appointments += 1;
      acc[doctorName].patients.add(apt.patient_id);
      acc[doctorName].revenue += parseFloat(apt.fee || 0);
      
      return acc;
    }, {});
    
    const doctorPerformance = Object.entries(appointmentsByDoctor).map(([name, data]) => ({
      name,
      appointments: data.appointments,
      patients: data.patients.size,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);
    
    // Utilization rate (appointments per doctor)
    const avgAppointments = appointments.length / (totalDoctors || 1);
    const utilizationRate = Math.min((avgAppointments / 30) * 100, 100); // Assuming 30 appointments/day is 100%
    
    // Specialization distribution
    const specializationDist = doctors.reduce((acc, d) => {
      const spec = d.specialization || 'General';
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalDoctors,
      avgUtilization: utilizationRate.toFixed(0),
      doctorPerformance,
      specializations: Object.entries(specializationDist).map(([name, value]) => ({ name, value }))
    };
  }, [doctors, appointments]);

  // APPOINTMENT ANALYTICS
  const appointmentAnalytics = useMemo(() => {
    const filteredAppointments = filterByDateRange(appointments, 'appointment_date');
    
    const totalAppointments = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.status === 'Completed').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'Cancelled').length;
    const noShow = filteredAppointments.filter(a => a.status === 'No Show').length;
    const scheduled = filteredAppointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
    
    // Status distribution
    const statusDist = [
      { name: 'Completed', value: completed, color: COLORS.success },
      { name: 'Scheduled', value: scheduled, color: COLORS.info },
      { name: 'Cancelled', value: cancelled, color: COLORS.warning },
      { name: 'No Show', value: noShow, color: COLORS.danger }
    ];
    
    // Daily appointment load (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = appointments.filter(a => {
        const aDate = new Date(a.appointment_date).toISOString().split('T')[0];
        return aDate === dateStr;
      }).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        appointments: count
      });
    }
    
    return {
      totalAppointments,
      completed,
      cancelled,
      noShow,
      scheduled,
      statusDist,
      dailyLoad: last7Days
    };
  }, [appointments, dateRange]);

  // BILLING ANALYTICS
  const billingAnalytics = useMemo(() => {
    const filteredInvoices = filterByDateRange(invoices, 'invoice_date');
    
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.final_payable || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_paid || 0), 0);
    const pendingPayments = totalRevenue - totalPaid;
    const discountsGiven = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_discount || 0), 0);
    
    const avgTransaction = totalRevenue / (filteredInvoices.length || 1);
    
    // Payment status distribution
    const paymentStatus = filteredInvoices.reduce((acc, inv) => {
      const status = inv.status || 'unpaid';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Revenue trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = invoices
        .filter(inv => new Date(inv.invoice_date).toISOString().split('T')[0] === dateStr)
        .reduce((sum, inv) => sum + parseFloat(inv.final_payable || 0), 0);
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue
      });
    }
    
    return {
      totalRevenue,
      totalPaid,
      pendingPayments,
      discountsGiven,
      avgTransaction,
      paymentStatus: Object.entries(paymentStatus).map(([name, value]) => ({ name, value })),
      revenueTrend: last7Days
    };
  }, [invoices, dateRange]);

  // TREATMENT ANALYTICS
  const treatmentAnalytics = useMemo(() => {
    const filteredTreatments = filterByDateRange(treatmentPlans, 'created_at');
    
    const activeTreatments = filteredTreatments.filter(t => t.status === 'Active').length;
    const completedTreatments = filteredTreatments.filter(t => t.status === 'Completed').length;
    const pendingReview = filteredTreatments.filter(t => t.status === 'Pending Review').length;
    
    // Treatment status distribution
    const statusDist = [
      { name: 'Active', value: activeTreatments, color: COLORS.info },
      { name: 'Completed', value: completedTreatments, color: COLORS.success },
      { name: 'Pending Review', value: pendingReview, color: COLORS.warning }
    ];
    
    return {
      activeTreatments,
      completedTreatments,
      pendingReview,
      totalTreatments: filteredTreatments.length,
      statusDist
    };
  }, [treatmentPlans, dateRange]);

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4`} style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={16} className={trend < 0 ? 'rotate-180' : ''} />
              <span>{Math.abs(trend)}% vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg`} style={{ backgroundColor: color + '20' }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Healthcare Reports Dashboard</h1>
            <p className="text-gray-600">Comprehensive analytics and reporting system</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="365days">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md">
              <Download size={18} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'patient-reports', label: 'Patient Reports', icon: Users },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'billing', label: 'Billing & Payments', icon: DollarSign },
          { id: 'doctor-reports', label: 'Doctor Reports', icon: Stethoscope },
          { id: 'treatments', label: 'Treatments', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PATIENT REPORTS */}
      {activeTab === 'patient-reports' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Patients"
              value={patientAnalytics.totalPatients.toLocaleString()}
              subtitle={`+${patientAnalytics.newPatients} new this period`}
              icon={Users}
              color={COLORS.primary}
              trend={12}
            />
            <StatCard
              title="Active Patients"
              value={patientAnalytics.activePatients.toLocaleString()}
              subtitle="With recent appointments"
              icon={Activity}
              color={COLORS.success}
              trend={8}
            />
            <StatCard
              title="New This Period"
              value={patientAnalytics.newPatients}
              subtitle="Patient registrations"
              icon={TrendingUp}
              color={COLORS.info}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Patient Trends */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">New Patient Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={patientAnalytics.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gender Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={patientAnalytics.genderDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {patientAnalytics.genderDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age Groups */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Age Group Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={patientAnalytics.ageGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Today's Appointments"
              value={appointmentAnalytics.totalAppointments}
              icon={Calendar}
              color={COLORS.info}
            />
            <StatCard
              title="Completed"
              value={appointmentAnalytics.completed}
              icon={CheckCircle}
              color={COLORS.success}
            />
            <StatCard
              title="Cancelled"
              value={appointmentAnalytics.cancelled}
              icon={XCircle}
              color={COLORS.warning}
            />
            <StatCard
              title="No Show"
              value={appointmentAnalytics.noShow}
              icon={AlertCircle}
              color={COLORS.danger}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Appointment Load */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Appointment Load</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appointmentAnalytics.dailyLoad}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="appointments" fill={COLORS.info} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Appointment Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Appointment Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={appointmentAnalytics.statusDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentAnalytics.statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* BILLING & PAYMENTS */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Revenue"
              value={`Rs. ${billingAnalytics.totalRevenue.toLocaleString()}`}
              subtitle="+15% vs last week"
              icon={DollarSign}
              color={COLORS.success}
              trend={15}
            />
            <StatCard
              title="Pending Payments"
              value={`Rs. ${billingAnalytics.pendingPayments.toLocaleString()}`}
              icon={Clock}
              color={COLORS.warning}
            />
            <StatCard
              title="Avg Transaction"
              value={`Rs. ${billingAnalytics.avgTransaction.toFixed(0)}`}
              icon={Activity}
              color={COLORS.info}
            />
            <StatCard
              title="Discounts Given"
              value={`Rs. ${billingAnalytics.discountsGiven.toLocaleString()}`}
              icon={FileText}
              color={COLORS.danger}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={billingAnalytics.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} dot={{ fill: COLORS.success, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={billingAnalytics.paymentStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {billingAnalytics.paymentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR REPORTS */}
      {activeTab === 'doctor-reports' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Doctors"
              value={doctorAnalytics.totalDoctors}
              icon={Stethoscope}
              color={COLORS.primary}
            />
            <StatCard
              title="Avg Utilization"
              value={`${doctorAnalytics.avgUtilization}%`}
              subtitle="Appointment load"
              icon={Activity}
              color={COLORS.success}
            />
            <StatCard
              title="Total Consultations"
              value={appointments.length}
              icon={FileText}
              color={COLORS.info}
            />
          </div>

          {/* Doctor Performance Table */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Doctor Performance Overview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Doctor</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Consultations</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Unique Patients</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Revenue Generated</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Avg Per Visit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctorAnalytics.doctorPerformance.map((doctor, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{doctor.name}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">{doctor.appointments}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">{doctor.patients}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                        Rs. {doctor.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-purple-600 font-medium">
                        Rs. {(doctor.revenue / doctor.appointments).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Doctor */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue by Doctor</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={doctorAnalytics.doctorPerformance.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill={COLORS.success} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Specialization Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Specialization Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={doctorAnalytics.specializations}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {doctorAnalytics.specializations.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TREATMENTS */}
      {activeTab === 'treatments' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Active Treatments"
              value={treatmentAnalytics.activeTreatments}
              subtitle="Ongoing treatment plans"
              icon={Activity}
              color={COLORS.info}
            />
            <StatCard
              title="Completed"
              value={treatmentAnalytics.completedTreatments}
              subtitle="Successfully finished"
              icon={CheckCircle}
              color={COLORS.success}
            />
            <StatCard
              title="Pending Review"
              value={treatmentAnalytics.pendingReview}
              subtitle="Awaiting doctor review"
              icon={Clock}
              color={COLORS.warning}
            />
            <StatCard
              title="Total Plans"
              value={treatmentAnalytics.totalTreatments}
              subtitle="All treatment plans"
              icon={FileText}
              color={COLORS.primary}
            />
          </div>

          {/* Treatment Status Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Treatment Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={treatmentAnalytics.statusDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {treatmentAnalytics.statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Treatment Plan Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Active Plans</span>
                    <span className="text-sm font-bold text-blue-600">
                      {treatmentAnalytics.activeTreatments} / {treatmentAnalytics.totalTreatments}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${(treatmentAnalytics.activeTreatments / treatmentAnalytics.totalTreatments) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Completed Plans</span>
                    <span className="text-sm font-bold text-green-600">
                      {treatmentAnalytics.completedTreatments} / {treatmentAnalytics.totalTreatments}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${(treatmentAnalytics.completedTreatments / treatmentAnalytics.totalTreatments) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Pending Review</span>
                    <span className="text-sm font-bold text-yellow-600">
                      {treatmentAnalytics.pendingReview} / {treatmentAnalytics.totalTreatments}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-600 h-3 rounded-full transition-all"
                      style={{ width: `${(treatmentAnalytics.pendingReview / treatmentAnalytics.totalTreatments) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-blue-900">In Progress</h4>
                <Activity className="text-blue-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-blue-900">{treatmentAnalytics.activeTreatments}</p>
              <p className="text-sm text-blue-700 mt-2">Active treatment plans</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-green-900">Successfully Finished</h4>
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-green-900">{treatmentAnalytics.completedTreatments}</p>
              <p className="text-sm text-green-700 mt-2">Completed treatments</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-yellow-900">Awaiting Review</h4>
                <Clock className="text-yellow-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-yellow-900">{treatmentAnalytics.pendingReview}</p>
              <p className="text-sm text-yellow-700 mt-2">Pending doctor review</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}