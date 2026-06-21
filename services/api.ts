import Constants from "expo-constants";
import { getToken, signIn, signOut } from "./auth";

// Optional callback the app can register to react to an expired/invalid session
// (e.g. redirect to the login screen).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function resolveApiBaseUrl() {
  const constantsAny = Constants as unknown as {
    expoConfig?: {
      hostUri?: string;
      extra?: { EXPO_PUBLIC_API_URL?: string };
    };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: {
      extra?: {
        EXPO_PUBLIC_API_URL?: string;
        expoGo?: { debuggerHost?: string };
      };
    };
    manifest?: {
      extra?: { EXPO_PUBLIC_API_URL?: string };
      debuggerHost?: string;
      hostUri?: string;
    };
  };

  // Explicit override wins (set EXPO_PUBLIC_API_URL only if you need it).
  const explicitUrl =
    constantsAny.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    constantsAny.manifest2?.extra?.EXPO_PUBLIC_API_URL ||
    constantsAny.manifest?.extra?.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  // Otherwise auto-detect the LAN IP from whatever host the Expo dev server
  // (Metro) is served on — the phone already reaches that IP, so the backend
  // on the same machine is reachable at <that-ip>:5001. This keeps working
  // even when your network/IP changes.
  const hostFromExpo =
    constantsAny.expoConfig?.hostUri ||
    constantsAny.expoGoConfig?.debuggerHost ||
    constantsAny.manifest2?.extra?.expoGo?.debuggerHost ||
    constantsAny.manifest?.hostUri ||
    constantsAny.manifest?.debuggerHost;

  if (hostFromExpo) {
    const hostIp = hostFromExpo.split(":")[0];
    return `http://${hostIp}:5001`;
  }

  return "http://localhost:5001";
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log(`[api] Using backend base URL: ${API_BASE_URL}`);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (response.status === 401) {
      // Token missing/expired — drop the session and notify the app.
      await signOut();
      if (onUnauthorized) onUnauthorized();
      throw new Error(data?.message || "Your session has expired. Please sign in again.");
    }

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
        `Cannot reach backend at ${API_BASE_URL}. Make sure backend is running and phone/emulator can access this IP.`,
      );
    }

    throw error;
  }
}

export type LoginResponse = {
  message: string;
  token: string;
  user: {
    email: string;
    fullName: string;
    age: string;
    height: string;
    weight: string;
  };
};

export async function registerUser(payload: {
  email: string;
  phone: string;
  password: string;
}) {
  const result = await apiRequest<{
    message: string;
    token: string;
    userId: string;
    email: string;
  }>("/api/v1/auth/register", {
    method: "POST",
    body: payload,
  });

  if (result.token) {
    await signIn(result.token, {
      email: result.email,
      role: "patient",
      fullName: result.email.split("@")[0],
    });
  }

  return result;
}

export async function loginUser(payload: { email: string; password: string }) {
  const result = await apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
  });

  if (result.token) {
    await signIn(result.token, {
      email: result.user.email,
      role: "patient",
      fullName: result.user.fullName || result.user.email.split("@")[0],
    });
  }

  return result;
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
  return apiRequest<{ message: string; user: Record<string, unknown> }>(
    "/api/v1/users/profile",
    {
      method: "POST",
      body: payload,
    },
  );
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
  return apiRequest<{ message: string; subscription: UserSubscription }>(
    "/api/v1/users/subscriptions",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function fetchUserSubscriptions(email: string) {
  return apiRequest<{ subscriptions: UserSubscription[] }>(
    `/api/v1/users/${encodeURIComponent(email)}/subscriptions`,
  );
}

export type Professional = {
  _id?: string;
  id?: string;
  type: "doctor" | "nutritionist" | "coach";
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
  return apiRequest<{ professionals: Professional[] }>("/api/v1/professionals");
}

export type RegisteredProfessional = {
  id: string;
  fullName: string;
  email: string;
  type: "doctor" | "nutritionist" | "coach";
  specialty: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  createdAt?: string;
};

export async function registerProfessional(payload: {
  fullName: string;
  email: string;
  password: string;
  type: "doctor" | "nutritionist" | "coach";
  specialty?: string;
}) {
  const result = await apiRequest<{
    message: string;
    token: string;
    professional: RegisteredProfessional;
  }>("/api/v1/professionals/register", {
    method: "POST",
    body: payload,
  });

  if (result.token) {
    await signIn(result.token, {
      email: result.professional.email,
      role: "professional",
      fullName: result.professional.fullName,
    });
  }

  return result;
}

export async function loginProfessional(payload: {
  email: string;
  password: string;
}) {
  const result = await apiRequest<{
    message: string;
    token: string;
    professional: RegisteredProfessional;
  }>("/api/v1/professionals/login", {
    method: "POST",
    body: payload,
  });

  if (result.token) {
    await signIn(result.token, {
      email: result.professional.email,
      role: "professional",
      fullName: result.professional.fullName,
    });
  }

  return result;
}

export async function fetchRegisteredProfessionals() {
  return apiRequest<{ professionals: RegisteredProfessional[] }>(
    "/api/v1/professionals/registered",
  );
}

export async function getUserByEmail(email: string) {
  return apiRequest<{
    user: {
      email: string;
      phone?: string;
      isVerified?: boolean;
      profile?: Record<string, unknown>;
    };
  }>(`/api/v1/users/${encodeURIComponent(email)}`);
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
  metrics: Record<string, unknown>[];
  healthMetrics?: {
    calories: { current: number; goal: number };
    sleep: { bedtime: string; wakeTime: string };
    water: { amount: number; unit: "cups" | "litres"; goal: number };
  };
  recentActivities: Record<string, unknown>[];
  quickActions: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  professionals: Record<string, unknown>[];
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
  metrics: Record<string, unknown>[];
  recentAlerts: Record<string, unknown>[];
  patientActivity: Record<string, unknown>[];
  patients: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  analytics: {
    stats: Record<string, unknown>[];
    patientsByCondition: Record<string, unknown>[];
    weeklyActivity: Record<string, unknown>[];
    alertTrends: Record<string, unknown>[];
  };
};

export async function fetchPatientDashboard(email: string) {
  return apiRequest<PatientDashboard>(
    `/api/v1/dashboard/patient/${encodeURIComponent(email)}`,
  );
}

export async function fetchDashboardStats(email?: string) {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  return apiRequest<DashboardLog[]>(`/api/dashboard-stats${query}`);
}

export async function savePatientLog(
  email: string,
  payload: {
    type: string;
    title: string;
    subtitle?: string;
    note?: string;
  },
) {
  return apiRequest<{ message: string; logId: string }>(
    `/api/v1/dashboard/patient/${encodeURIComponent(email)}/logs`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function savePatientMetrics(
  email: string,
  payload: {
    calories?: { current: number; goal: number };
    sleep?: { bedtime: string; wakeTime: string };
    water?: { amount: number; unit: "cups" | "litres"; goal: number };
  },
) {
  return apiRequest<{ message: string }>(
    `/api/v1/dashboard/patient/${encodeURIComponent(email)}/metrics`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export async function savePatientPlan(
  email: string,
  payload: {
    title: string;
    description: string;
    type?: string;
  },
) {
  return apiRequest<{ message: string; planId: string }>(
    `/api/v1/dashboard/patient/${encodeURIComponent(email)}/plans`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function fetchDoctorDashboard(email: string) {
  return apiRequest<DoctorDashboard>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}`,
  );
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
  },
) {
  return apiRequest<{ message: string; planId: string }>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}/plans`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function fetchDoctorAlerts(email: string) {
  return apiRequest<{ alerts: Record<string, unknown>[] }>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}/alerts`,
  );
}

export async function resolveDoctorAlert(email: string, alertId: string) {
  return apiRequest<{ message: string }>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}/alerts/${encodeURIComponent(alertId)}/resolve`,
    {
      method: "PATCH",
    },
  );
}

export async function fetchDoctorPatients(email: string) {
  return apiRequest<{ patients: Record<string, unknown>[] }>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}/patients`,
  );
}

export async function fetchDoctorAnalytics(email: string) {
  return apiRequest<DoctorDashboard["analytics"]>(
    `/api/v1/dashboard/doctor/${encodeURIComponent(email)}/analytics`,
  );
}

export async function fetchMessages(email: string) {
  return apiRequest<{ messages: Record<string, unknown>[] }>(
    `/api/v1/dashboard/messages/${encodeURIComponent(email)}`,
  );
}

export async function sendMessage(
  email: string,
  payload: {
    doctorId: string;
    doctorName: string;
    message: string;
  },
) {
  return apiRequest<{ message: string; messageId: string }>(
    `/api/v1/dashboard/messages/${encodeURIComponent(email)}`,
    {
      method: "POST",
      body: payload,
    },
  );
}
