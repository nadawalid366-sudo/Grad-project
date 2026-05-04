import Constants from 'expo-constants';

function resolveApiBaseUrl() {
  const constantsAny = Constants as unknown as {
    expoConfig?: { extra?: { EXPO_PUBLIC_API_URL?: string }; hostUri?: string };
    manifest2?: { extra?: { EXPO_PUBLIC_API_URL?: string; expoGo?: { debuggerHost?: string } } };
    manifest?: { extra?: { EXPO_PUBLIC_API_URL?: string }; debuggerHost?: string };
  };

  // Try Expo constants first (runtime), then process.env (build time)
  const expoExtraUrl =
    constantsAny.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    constantsAny.manifest2?.extra?.EXPO_PUBLIC_API_URL ||
    (constantsAny.manifest as any)?.extra?.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL;

  if (expoExtraUrl) return expoExtraUrl;

  const hostFromExpo =
    constantsAny.expoConfig?.hostUri ||
    constantsAny.manifest2?.extra?.expoGo?.debuggerHost ||
    (constantsAny.manifest as any)?.debuggerHost;

  if (hostFromExpo) {
    const hostIp = hostFromExpo.split(':')[0];
    return `http://${hostIp}:5000`;
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      throw new Error(data?.message || `Request failed (${response.status})`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response from backend at ${url}`);
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach backend at ${API_BASE_URL}. Make sure backend is running and phone/emulator can access this IP.`
      );
    }

    throw error;
  }
}

export type LoginResponse = {
  message: string;
  user: {
    email: string;
    fullName: string;
    age: string;
    height: string;
    weight: string;
  };
};

export async function registerUser(payload: { email: string; phone: string; password: string }) {
  return apiRequest<{ message: string; userId: string; email: string }>('/api/v1/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyUser(payload: { email: string; code: string }) {
  return apiRequest<{ message: string; email: string }>('/api/v1/auth/verify', {
    method: 'POST',
    body: payload,
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function saveUserProfile(payload: {
  email: string;
  profile: {
    fullName: string;
    age: string;
    gender: string;
    height: string;
    weight: string;
    medicalConditions: string[];
    allergies: string[];
    healthGoals: string[];
    language: string;
    units: string;
  };
}) {
  return apiRequest<{ message: string; user: Record<string, unknown> }>('/api/v1/users/profile', {
    method: 'POST',
    body: payload,
  });
}

export type UserSubscription = {
  id: string;
  professionalId?: string | null;
  professionalTitle: string;
  planName: string;
  amount: number;
  period: string;
  subscribedAt?: string;
  selectedDoctorName?: string | null;
};

export async function saveUserSubscription(payload: {
  email: string;
  subscription: {
    id?: string;
    professionalId?: string | null;
    professionalTitle: string;
    planName: string;
    amount: number;
    period: string;
    selectedDoctorName?: string | null;
  };
}) {
  return apiRequest<{ message: string; subscription: UserSubscription }>('/api/v1/users/subscriptions', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchUserSubscriptions(email: string) {
  return apiRequest<{ subscriptions: UserSubscription[] }>(`/api/v1/users/${encodeURIComponent(email)}/subscriptions`);
}

export type Professional = {
  _id?: string;
  id?: string;
  type: 'doctor' | 'nutritionist' | 'coach';
  title: string;
  description: string;
  icon: string;
  subscriptionPlans: {
    id: string;
    name: string;
    price: number;
    period: string;
    description: string;
    features: string[];
  }[];
  features: string[];
  rating: number;
  reviewCount: number;
};

export async function fetchProfessionals() {
  return apiRequest<{ professionals: Professional[] }>('/api/v1/professionals');
}

export async function getUserByEmail(email: string) {
  return apiRequest<{ user: { email: string; phone?: string; isVerified?: boolean; profile?: Record<string, unknown> } }>(
    `/api/v1/users/${encodeURIComponent(email)}`
  );
}

export type PatientDashboard = {
  user: {
    email: string;
    fullName: string;
    age: string;
    height: string;
    weight: string;
    phone: string;
  };
  metrics: Array<Record<string, unknown>>;
  recentActivities: Array<Record<string, unknown>>;
  quickActions: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
  plans: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  professionals: Array<Record<string, unknown>>;
};

export type DashboardLog = {
  _id?: string;
  id?: string;
  email?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  note?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  calories?: number;
  activity_minutes?: number;
  blood_pressure?: number;
};

export type DoctorDashboard = {
  doctor: Record<string, unknown>;
  metrics: Array<Record<string, unknown>>;
  recentAlerts: Array<Record<string, unknown>>;
  patientActivity: Array<Record<string, unknown>>;
  patients: Array<Record<string, unknown>>;
  plans: Array<Record<string, unknown>>;
  analytics: {
    stats: Array<Record<string, unknown>>;
    patientsByCondition: Array<Record<string, unknown>>;
    weeklyActivity: Array<Record<string, unknown>>;
    alertTrends: Array<Record<string, unknown>>;
  };
};

export async function fetchPatientDashboard(email: string) {
  return apiRequest<PatientDashboard>(`/api/v1/dashboard/patient/${encodeURIComponent(email)}`);
}

export async function fetchDashboardStats(email?: string) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return apiRequest<DashboardLog[]>(`/api/dashboard-stats${query}`);
}

export async function savePatientLog(email: string, payload: { type: string; title: string; subtitle?: string; note?: string }) {
  return apiRequest<{ message: string; logId: string }>(`/api/v1/dashboard/patient/${encodeURIComponent(email)}/logs`, {
    method: 'POST',
    body: payload,
  });
}

export async function savePatientPlan(email: string, payload: { title: string; description: string; type?: string }) {
  return apiRequest<{ message: string; planId: string }>(`/api/v1/dashboard/patient/${encodeURIComponent(email)}/plans`, {
    method: 'POST',
    body: payload,
  });
}

export async function fetchDoctorDashboard(email: string) {
  return apiRequest<DoctorDashboard>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}`);
}

export async function saveDoctorPlan(
  email: string,
  payload: {
    patientName: string;
    patientAge: number;
    planType: string;
    status: string;
    startDate: string;
    endDate: string;
    adherence: number;
    description: string;
    goals: string[];
  }
) {
  return apiRequest<{ message: string; planId: string }>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}/plans`, {
    method: 'POST',
    body: payload,
  });
}

export async function fetchDoctorAlerts(email: string) {
  return apiRequest<{ alerts: Array<Record<string, unknown>> }>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}/alerts`);
}

export async function resolveDoctorAlert(email: string, alertId: string) {
  return apiRequest<{ message: string }>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: 'PATCH',
  });
}

export async function fetchDoctorPatients(email: string) {
  return apiRequest<{ patients: Array<Record<string, unknown>> }>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}/patients`);
}

export async function fetchDoctorAnalytics(email: string) {
  return apiRequest<DoctorDashboard['analytics']>(`/api/v1/dashboard/doctor/${encodeURIComponent(email)}/analytics`);
}

export async function fetchMessages(email: string) {
  return apiRequest<{ messages: Array<Record<string, unknown>> }>(`/api/v1/dashboard/messages/${encodeURIComponent(email)}`);
}

export async function sendMessage(email: string, payload: { doctorId: string; doctorName: string; message: string }) {
  return apiRequest<{ message: string; messageId: string }>(`/api/v1/dashboard/messages/${encodeURIComponent(email)}`, {
    method: 'POST',
    body: payload,
  });
}

export async function signInDoctor(payload: { email: string; doctorName: string; specialty?: string }) {
  return apiRequest<{ message: string; doctor: { email: string; doctorName: string; specialty: string } }>(
    '/api/v1/dashboard/doctor-login',
    {
      method: 'POST',
      body: payload,
    }
  );
}
