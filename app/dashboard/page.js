'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, Users, DollarSign, Clock, TrendingUp, Activity, UserCheck, AlertCircle, CheckCircle, Stethoscope, ClipboardList, FileText } from 'lucide-react';
import { supabase, patientsAPI, appointmentsAPI, doctorsAPI, invoicesAPI } from '@/lib/supabase';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState('6months'); // '6months', '12months', 'year'
  
  // Real-time data states
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayAppointmentsChange: '+0%',
    totalPatients: 0,
    totalPatientsChange: '+0%',
    todayRevenue: 0,
    todayRevenueChange: '+0%',
    pendingAppointments: 0,
    pendingAppointmentsChange: '+0%',
    consultationRate: 0,
    patientSatisfaction: 94, // This would need a separate ratings table
    newPatientsThisMonth: 0,
    activeDoctors: 0,
    totalDoctors: 0,
    emergencyCases: 0,
    completedAppointments: 0
  });

  const [revenueData, setRevenueData] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeDoctors, setActiveDoctors] = useState([]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load all dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const appointmentsChannel = supabase
      .channel('dashboard-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadDashboardData();
      })
      .subscribe();

    const patientsChannel = supabase
      .channel('dashboard-patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        loadDashboardData();
      })
      .subscribe();

    const invoicesChannel = supabase
      .channel('dashboard-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, []);

  // Reload revenue data when filter changes
  useEffect(() => {
    loadRevenueData();
  }, [revenueFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Parallel data fetching
      const [
        appointmentsData,
        patientsData,
        doctorsData,
        invoicesData
      ] = await Promise.all([
        appointmentsAPI.getAll(),
        patientsAPI.getAll(),
        doctorsAPI.getAll(),
        fetchInvoices()
      ]);

      // Calculate stats
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

      // Today's appointments
      const todayAppointments = appointmentsData.filter(a => a.appointment_date === todayStr);
      const yesterdayAppointments = appointmentsData.filter(a => a.appointment_date === yesterdayStr);
      const todayAppointmentsChange = calculatePercentageChange(todayAppointments.length, yesterdayAppointments.length);

      // Pending appointments
      const pendingAppointments = appointmentsData.filter(a => 
        a.status === 'Scheduled' || a.status === 'Confirmed'
      );

      // Emergency cases (appointments with type 'Emergency')
      const emergencyCases = appointmentsData.filter(a => 
        a.appointment_type === 'Emergency' && a.appointment_date === todayStr
      );

      // Completed appointments today
      const completedToday = appointmentsData.filter(a => 
        a.appointment_date === todayStr && a.status === 'Completed'
      );

      // Total patients
      const totalPatients = patientsData.length;
      const lastMonthPatients = patientsData.filter(p => {
        const createdDate = new Date(p.created_at).toISOString().split('T')[0];
        return createdDate >= lastMonthStart && createdDate <= lastMonthEnd;
      }).length;
      const totalPatientsChange = calculatePercentageChange(totalPatients, totalPatients - lastMonthPatients);

      // New patients this month
      const newPatientsThisMonth = patientsData.filter(p => {
        const createdDate = new Date(p.created_at).toISOString().split('T')[0];
        return createdDate >= thisMonthStart;
      }).length;

      // Today's revenue
      const todayInvoices = invoicesData.filter(inv => inv.invoice_date === todayStr);
      const todayRevenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.net_amount || 0), 0);
      const yesterdayInvoices = invoicesData.filter(inv => inv.invoice_date === yesterdayStr);
      const yesterdayRevenue = yesterdayInvoices.reduce((sum, inv) => sum + parseFloat(inv.net_amount || 0), 0);
      const todayRevenueChange = calculatePercentageChange(todayRevenue, yesterdayRevenue);

      // Active doctors (those with appointments today)
      const todayDoctorIds = new Set(todayAppointments.map(a => a.doctor_id));
      const activeDoctorsCount = doctorsData.filter(d => todayDoctorIds.has(d.doctor_id)).length;

      // Consultation rate (completed vs total appointments)
      const totalAppointmentsAllTime = appointmentsData.length;
      const completedAppointmentsAllTime = appointmentsData.filter(a => a.status === 'Completed').length;
      const consultationRate = totalAppointmentsAllTime > 0 
        ? Math.round((completedAppointmentsAllTime / totalAppointmentsAllTime) * 100) 
        : 0;

      setStats({
        todayAppointments: todayAppointments.length,
        todayAppointmentsChange: `${todayAppointmentsChange > 0 ? '+' : ''}${todayAppointmentsChange}%`,
        totalPatients,
        totalPatientsChange: `${totalPatientsChange > 0 ? '+' : ''}${totalPatientsChange}%`,
        todayRevenue,
        todayRevenueChange: `${todayRevenueChange > 0 ? '+' : ''}${todayRevenueChange}%`,
        pendingAppointments: pendingAppointments.length,
        pendingAppointmentsChange: '+0%', // Can be calculated with historical data
        consultationRate,
        patientSatisfaction: 94, // Would need ratings system
        newPatientsThisMonth,
        activeDoctors: activeDoctorsCount,
        totalDoctors: doctorsData.length,
        emergencyCases: emergencyCases.length,
        completedAppointments: completedToday.length
      });

      // Load active doctors details
      loadActiveDoctors(doctorsData, appointmentsData, todayStr);

      // Load recent activity
      loadRecentActivity(appointmentsData, patientsData, invoicesData);

      // Load upcoming events (from appointments)
      loadUpcomingEvents(appointmentsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    try {
      const invoicesData = await fetchInvoices();
      const today = new Date();
      let monthsToShow = 6;
      
      if (revenueFilter === '12months') monthsToShow = 12;
      else if (revenueFilter === 'year') monthsToShow = 12;

      const revenueByMonth = [];
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM
        const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
        
        const monthRevenue = invoicesData
          .filter(inv => inv.invoice_date.startsWith(monthStr))
          .reduce((sum, inv) => sum + parseFloat(inv.net_amount || 0), 0);
        
        revenueByMonth.push({
          month: monthName,
          revenue: monthRevenue
        });
      }

      setRevenueData(revenueByMonth);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    }
  };

  const loadActiveDoctors = async (doctorsData, appointmentsData, todayStr) => {
    const todayAppointments = appointmentsData.filter(a => a.appointment_date === todayStr);
    
    const doctorStats = doctorsData.map(doctor => {
      const doctorAppointments = todayAppointments.filter(a => a.doctor_id === doctor.doctor_id);
      const inConsultation = doctorAppointments.some(a => a.status === 'Confirmed' || a.status === 'In Progress');
      
      return {
        name: doctor.name,
        specialty: doctor.specialization || 'General',
        status: inConsultation ? 'In Consultation' : 'Available',
        patients: doctorAppointments.length
      };
    }).slice(0, 4); // Show top 4

    setActiveDoctors(doctorStats);
  };

  const loadRecentActivity = (appointmentsData, patientsData, invoicesData) => {
    const activities = [];

    // Recent patients (last 4)
    const recentPatients = [...patientsData]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 2);
    
    recentPatients.forEach(patient => {
      activities.push({
        action: `New patient registered: ${patient.name}`,
        time: getTimeAgo(patient.created_at),
        icon: UserCheck,
        color: 'text-green-600'
      });
    });

    // Recent appointments (last 2)
    const recentAppointments = [...appointmentsData]
      .sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date))
      .slice(0, 1);
    
    recentAppointments.forEach(apt => {
      activities.push({
        action: `Appointment ${apt.status.toLowerCase()}: ${apt.patient_name}`,
        time: getTimeAgo(apt.created_at || apt.appointment_date),
        icon: CheckCircle,
        color: 'text-blue-600'
      });
    });

    // Recent invoices (last 1)
    const recentInvoices = [...invoicesData]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 1);
    
    recentInvoices.forEach(inv => {
      activities.push({
        action: `Payment received: Rs. ${parseFloat(inv.net_amount || 0).toFixed(0)}`,
        time: getTimeAgo(inv.created_at),
        icon: DollarSign,
        color: 'text-emerald-600'
      });
    });

    setRecentActivity(activities.slice(0, 4));
  };

  const loadUpcomingEvents = (appointmentsData) => {
    const today = new Date();
    const upcoming = appointmentsData
      .filter(a => new Date(a.appointment_date) >= today)
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
      .slice(0, 3)
      .map(apt => ({
        title: `Appointment: ${apt.patient_name}`,
        desc: `Dr. ${apt.doctor_name} - ${apt.appointment_type}`,
        time: `${formatTime(apt.start_time)} - ${formatTime(apt.end_time)}`,
        date: formatDate(apt.appointment_date),
        color: 'bg-blue-100 border-blue-500'
      }));

    setUpcomingEvents(upcoming);
  };

  // Helper functions
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);
  const circleProgress = (stats.consultationRate / 100) * 283;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-600 text-sm">Monitor your clinic's daily operations - Real-time Data</p>
      </div>

      {/* Main Stats Grid - 4 Cards in a Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <span className={`text-sm font-semibold flex items-center ${
              parseInt(stats.todayAppointmentsChange) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp size={14} className="mr-1" />
              {stats.todayAppointmentsChange}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-2">Today's Appointments</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.todayAppointments}</p>
        </div>

        {/* Total Patients */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <span className={`text-sm font-semibold flex items-center ${
              parseInt(stats.totalPatientsChange) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp size={14} className="mr-1" />
              {stats.totalPatientsChange}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-2">Total Patients</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.totalPatients}</p>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="text-purple-600" size={24} />
            </div>
            <span className={`text-sm font-semibold flex items-center ${
              parseInt(stats.todayRevenueChange) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp size={14} className="mr-1" />
              {stats.todayRevenueChange}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-2">Today's Revenue</h3>
          <p className="text-3xl font-bold text-gray-800">Rs. {stats.todayRevenue.toLocaleString()}</p>
        </div>

        {/* Pending Appointments */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="text-orange-600" size={24} />
            </div>
            <span className="text-green-600 text-sm font-semibold flex items-center">
              <TrendingUp size={14} className="mr-1" />
              {stats.pendingAppointmentsChange}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-2">Pending Appointments</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.pendingAppointments}</p>
        </div>
      </div>

      {/* Middle Section - Revenue Chart and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Revenue Overview</h2>
            <select 
              value={revenueFilter}
              onChange={(e) => setRevenueFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div className="h-72 flex items-end justify-between gap-4">
            {revenueData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg hover:from-purple-700 hover:to-purple-500 transition-all cursor-pointer relative group" 
                     style={{ height: `${(item.revenue / maxRevenue) * 100}%`, minHeight: '40px' }}>
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                    Rs. {item.revenue.toLocaleString()}
                  </div>
                </div>
                <span className="text-sm text-gray-600 mt-3 font-medium">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Performance Metrics</h2>
          
          {/* Consultation Rate Circle */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-36 h-36">
              <svg className="transform -rotate-90 w-36 h-36">
                <circle cx="72" cy="72" r="60" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                <circle cx="72" cy="72" r="60" stroke="#8b5cf6" strokeWidth="10" fill="none"
                        strokeDasharray="377" strokeDashoffset={377 - (circleProgress * 1.33)}
                        strokeLinecap="round"
                        className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-800">{stats.consultationRate}%</span>
                <span className="text-xs text-gray-600 mt-1">Consultation</span>
              </div>
            </div>
          </div>

          {/* Other Metrics */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="text-blue-600 mr-3" size={20} />
                <span className="text-sm text-gray-700 font-medium">Patient Satisfaction</span>
              </div>
              <span className="text-xl font-bold text-gray-800">{stats.patientSatisfaction}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserCheck className="text-green-600 mr-3" size={20} />
                <span className="text-sm text-gray-700 font-medium">New Patients</span>
              </div>
              <span className="text-xl font-bold text-gray-800">{stats.newPatientsThisMonth}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="text-purple-600 mr-3" size={20} />
                <span className="text-sm text-gray-700 font-medium">Completed Today</span>
              </div>
              <span className="text-xl font-bold text-gray-800">{stats.completedAppointments}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="text-red-600 mr-3" size={20} />
                <span className="text-sm text-gray-700 font-medium">Emergency Cases</span>
              </div>
              <span className="text-xl font-bold text-gray-800">{stats.emergencyCases}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Doctors */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800">Active Doctors</h2>
            <span className="bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">
              {stats.activeDoctors}/{stats.totalDoctors} Active
            </span>
          </div>
          <div className="space-y-3">
            {activeDoctors.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active doctors today</p>
            ) : (
              activeDoctors.map((doctor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3 text-sm">
                      {doctor.name.split(' ')[0][0]}{doctor.name.split(' ')[1]?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{doctor.name}</p>
                      <p className="text-xs text-gray-600">{doctor.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      doctor.status === 'Available' ? 'bg-green-100 text-green-700' :
                      doctor.status === 'In Consultation' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {doctor.status}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">{doctor.patients} patients</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Upcoming Appointments</h2>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming appointments</p>
            ) : (
              upcomingEvents.map((event, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${event.color}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{event.title}</h3>
                    <span className="text-xs bg-white px-2 py-1 rounded text-gray-700 font-medium">{event.date}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{event.desc}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock size={12} className="mr-1" />
                    {event.time}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity & System Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start">
                  <div className={`p-2 rounded-lg bg-gray-100 mr-3 ${activity.color}`}>
                    <activity.icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* System Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Server</span>
                <span className="text-green-600 font-semibold flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Database</span>
                <span className="text-green-600 font-semibold flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Update</span>
                <span className="text-gray-800 font-semibold">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;