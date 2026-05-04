export const patientDashboardSeed = {
  metrics: [
    { id: 'calories', title: "Today's Calories", current: 1420, goal: 2000, unit: 'kcal', icon: 'flame', color: '#10B981', backgroundColor: '#DCFCE7' },
    { id: 'activity', title: 'Activity Minutes', current: 32, goal: 60, unit: 'min', icon: 'run', color: '#3B82F6', backgroundColor: '#DBEAFE' },
    { id: 'medication', title: 'Medication', current: 75, goal: 100, unit: '%', icon: 'pill', color: '#EC4899', backgroundColor: '#FCE7F3' },
  ],
  recentActivities: [
    { id: '1', title: 'Logged breakfast - Scrambled eggs', timeAgo: '2h ago', icon: 'food-fork-drink', color: '#F59E0B' },
    { id: '2', title: 'Took Metformin 500mg', timeAgo: '2h ago', icon: 'pill', color: '#EC4899' },
    { id: '3', title: 'Recorded blood pressure', timeAgo: '4h ago', icon: 'heart-pulse', color: '#EF4444' },
    { id: '4', title: 'Completed 30min walk', timeAgo: 'Yesterday', icon: 'walk', color: '#3B82F6' },
  ],
  quickActions: [
    { id: '1', label: 'Log Meal', icon: 'silverware-fork-knife', color: '#F59E0B' },
    { id: '2', label: 'Log Exercise', icon: 'dumbbell', color: '#3B82F6' },
    { id: '3', label: 'Log Vitals', icon: 'heart-pulse', color: '#EF4444' },
    { id: '4', label: 'Log Symptom', icon: 'emoticon-sad-outline', color: '#8B5CF6' },
    { id: '5', label: 'Log Medication', icon: 'pill', color: '#EC4899' },
  ],
  logs: [],
  plans: [],
  messages: [
    {
      id: '1',
      doctorId: '1',
      doctorName: 'Dr. Ahmed Hassan',
      specialty: 'Cardiologist',
      isOnline: true,
      lastMessage: 'Great! Remember to take your medications on time.',
      lastMessageTime: '10:40 AM',
      unreadCount: 0,
      conversation: [
        { id: '1', sender: 'doctor', message: 'Hello! How are you feeling today?', timestamp: '10:30 AM', isRead: true },
        { id: '2', sender: 'patient', message: "I'm doing well, thanks for asking!", timestamp: '10:35 AM', isRead: true },
        { id: '3', sender: 'doctor', message: 'Great! Remember to take your medications on time.', timestamp: '10:40 AM', isRead: true },
      ],
    },
  ],
};

export const doctorDashboardSeed = {
  metrics: [
    { id: 'patients', title: 'Total Active Patients', value: '48', subtitle: '+2 this month', icon: 'account-group', color: '#3B82F6', backgroundColor: '#DBEAFE' },
    { id: 'alerts', title: 'Pending Alerts', value: '5', subtitle: '2 critical', icon: 'alert-circle', color: '#EF4444', backgroundColor: '#FEE2E2' },
    { id: 'plans', title: 'Plans Assigned', value: '12', subtitle: 'This week', icon: 'clipboard-text', color: '#10B981', backgroundColor: '#D1FAE5' },
  ],
  recentAlerts: [
    { id: '1', patientName: 'Ahmed Mohamed', issue: 'Severe symptoms via voice note', severity: 'Critical', time: '10 min ago' },
    { id: '2', patientName: 'Fatima Ali', issue: 'Blood pressure out of range', severity: 'High', time: '1 hour ago' },
    { id: '3', patientName: 'Omar Hassan', issue: 'Missed medication doses', severity: 'Medium', time: '2 hours ago' },
    { id: '4', patientName: 'Sara Ibrahim', issue: 'Inactive for 3 days', severity: 'Low', time: '5 hours ago' },
  ],
  patientActivity: [
    { id: '1', patientName: 'Ahmed Mohamed', action: 'Logged meal - Lunch', time: '10 min ago', icon: 'food-fork-drink', iconColor: '#F59E0B' },
    { id: '2', patientName: 'Layla Ahmed', action: 'Completed workout session', time: '25 min ago', icon: 'dumbbell', iconColor: '#3B82F6' },
    { id: '3', patientName: 'Fatima Ali', action: 'Recorded blood pressure', time: '1 hour ago', icon: 'heart-pulse', iconColor: '#EF4444' },
    { id: '4', patientName: 'Omar Hassan', action: 'Sent message', time: '2 hours ago', icon: 'message-text', iconColor: '#8B5CF6' },
    { id: '5', patientName: 'Sara Ibrahim', action: 'Logged medication', time: '3 hours ago', icon: 'pill', iconColor: '#EC4899' },
  ],
  patients: [
    { id: '1', name: 'Ahmed Mohamed', age: 45, gender: 'Male', conditions: ['Diabetes Type 2', 'Hypertension'], lastActivity: '2 hours ago', adherence: 85, alerts: 2, trend: 'up' },
    { id: '2', name: 'Fatima Ali', age: 38, gender: 'Female', conditions: ['Hypertension'], lastActivity: '5 hours ago', adherence: 92, alerts: 1, trend: 'stable' },
    { id: '3', name: 'Layla Ahmed', age: 34, gender: 'Female', conditions: ['Asthma'], lastActivity: '4 hours ago', adherence: 88, alerts: 0, trend: 'up' },
    { id: '4', name: 'Omar Hassan', age: 52, gender: 'Male', conditions: ['Diabetes Type 2', 'High Cholesterol'], lastActivity: '1 day ago', adherence: 67, alerts: 3, trend: 'down' },
    { id: '5', name: 'Sara Ibrahim', age: 29, gender: 'Female', conditions: ['Obesity'], lastActivity: '3 days ago', adherence: 45, alerts: 2, trend: 'down' },
  ],
  plans: [],
  alerts: [
    { id: '1', patientName: 'Omar Hassan', patientAge: 52, patientGender: 'Male', alertType: 'Blood Glucose Critical', description: 'Blood glucose level at 45 mg/dL - immediate attention required', severity: 'Critical', time: '10 mins ago', isResolved: false },
    { id: '2', patientName: 'Ahmed Mohamed', patientAge: 45, patientGender: 'Male', alertType: 'Missed Medication', description: 'Missed insulin dose for breakfast', severity: 'Critical', time: '2 hours ago', isResolved: false },
    { id: '3', patientName: 'Sara Ibrahim', patientAge: 29, patientGender: 'Female', alertType: 'Blood Pressure Elevated', description: 'BP reading: 145/95 mmHg - above target range', severity: 'High', time: '3 hours ago', isResolved: false },
    { id: '4', patientName: 'Fatima Ali', patientAge: 38, patientGender: 'Female', alertType: 'Activity Goal Not Met', description: 'No exercise logged for 3 consecutive days', severity: 'High', time: '5 hours ago', isResolved: false },
    { id: '5', patientName: 'Layla Ahmed', patientAge: 34, patientGender: 'Female', alertType: 'Inhaler Usage Spike', description: 'Used rescue inhaler 4 times today - possible trigger exposure', severity: 'Medium', time: '6 hours ago', isResolved: false },
    { id: '6', patientName: 'Ahmed Mohamed', patientAge: 45, patientGender: 'Male', alertType: 'Weight Fluctuation', description: 'Weight increased by 2.5 kg over 3 days', severity: 'Medium', time: '1 day ago', isResolved: false },
    { id: '7', patientName: 'Omar Hassan', patientAge: 52, patientGender: 'Male', alertType: 'Meal Logging Delayed', description: 'No meal logged since lunch yesterday', severity: 'Low', time: '1 day ago', isResolved: false },
    { id: '8', patientName: 'Sara Ibrahim', patientAge: 29, patientGender: 'Female', alertType: 'Sleep Pattern Change', description: 'Average sleep reduced to 5 hours for past week', severity: 'Low', time: '2 days ago', isResolved: false },
  ],
  analytics: {
    stats: [
      { id: '1', title: 'Total Patients', value: '48', change: '+12%', trend: 'up', color: '#3B82F6', icon: 'account-group' },
      { id: '2', title: 'Active Cases', value: '32', change: '+8%', trend: 'up', color: '#10B981', icon: 'medical-bag' },
      { id: '3', title: 'Alerts Resolved', value: '156', change: '+24%', trend: 'up', color: '#F59E0B', icon: 'alert-circle-check' },
      { id: '4', title: 'Avg Response Time', value: '12m', change: '-18%', trend: 'down', color: '#8B5CF6', icon: 'clock-fast' },
    ],
    patientsByCondition: [
      { label: 'Diabetes', value: 18, percentage: 37.5 },
      { label: 'Hypertension', value: 15, percentage: 31.25 },
      { label: 'Asthma', value: 8, percentage: 16.67 },
      { label: 'Other', value: 7, percentage: 14.58 },
    ],
    weeklyActivity: [
      { label: 'Mon', value: 12, percentage: 60 },
      { label: 'Tue', value: 18, percentage: 90 },
      { label: 'Wed', value: 15, percentage: 75 },
      { label: 'Thu', value: 20, percentage: 100 },
      { label: 'Fri', value: 16, percentage: 80 },
      { label: 'Sat', value: 8, percentage: 40 },
      { label: 'Sun', value: 5, percentage: 25 },
    ],
    alertTrends: [
      { severity: 'Critical', count: 8, color: '#EF4444', percentage: 16 },
      { severity: 'High', count: 15, color: '#F59E0B', percentage: 30 },
      { severity: 'Medium', count: 18, color: '#3B82F6', percentage: 36 },
      { severity: 'Low', count: 9, color: '#10B981', percentage: 18 },
    ],
  },
};