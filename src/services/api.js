const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("clinicflow:unauthorized"));
    }
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.code = data?.code || "UNKNOWN";
    error.status = response.status;
    throw error;
  }

  return data;
}

function unwrapApiData(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.content)) {
    const hasPaginationMeta =
      payload.totalPages !== undefined ||
      payload.totalElements !== undefined ||
      payload.pageable !== undefined ||
      payload.number !== undefined ||
      payload.size !== undefined ||
      payload.last !== undefined ||
      payload.first !== undefined;
    if (hasPaginationMeta) return payload;
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.clinic)) return payload.clinic;
  if (Array.isArray(payload.clinics)) return payload.clinics;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === "object") {
    const hasPaginationMeta =
      payload.data.totalPages !== undefined ||
      payload.data.totalElements !== undefined ||
      payload.data.pageable !== undefined ||
      payload.data.number !== undefined ||
      payload.data.size !== undefined ||
      payload.data.last !== undefined ||
      payload.data.first !== undefined;
    if (hasPaginationMeta) return payload.data;
    if (Array.isArray(payload.data.clinic)) return payload.data.clinic;
    if (Array.isArray(payload.data.clinics)) return payload.data.clinics;
    if (Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    return payload.data;
  }

  return payload;
}

export function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function createClinicUser(payload, token) {
  return request("/api/clinic-admin/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getClinicDoctors(clinicId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function createClinicDoctor(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.doctor) return payload.doctor;
    }
    return payload;
  });
}

export function updateClinicDoctor(clinicId, doctorId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors/${doctorId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.doctor) return response.doctor;
    }
    return response;
  });
}

export function deleteClinicDoctor(clinicId, doctorId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors/${doctorId}/delete`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.doctor) return response.doctor;
    }
    return response;
  });
}

export function getDoctorServices(clinicId, token) {
  return request(`/api/n8n/clinics/${clinicId}/services`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getClinicServices(clinicId, token, doctorId) {
  const query = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
  return request(`/api/dashboard/clinics/${clinicId}/services${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function getClinicAvailableSlots(clinicId, doctorId, serviceId, date, token) {
  const query = new URLSearchParams({
    doctorId: String(doctorId),
    serviceId: String(serviceId),
    date,
  });

  return request(`/api/dashboard/clinics/${clinicId}/availability?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const data = unwrapApiData(payload);
    return Array.isArray(data?.slots) ? data.slots : [];
  });
}

export function createClinicService(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/services`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.service) return payload.service;
      if (payload.services) return payload.services;
    }
    return payload;
  });
}

export function deleteClinicService(clinicId, serviceId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/services/${serviceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.service) return response.service;
    }
    return response;
  });
}

export function getClinicUsers(clinicId, token) {
  return request(`/api/clinic-admin/users/${clinicId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getUserClinics(username, token) {
  return request(`/api/users?userName=${encodeURIComponent(username)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getClinicProfiles(token) {
  return request("/api/dashboard/clinics", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function getClinicPatients(clinicId, filters = {}, token) {
  const query = new URLSearchParams();
  if (filters.page !== undefined && filters.page !== null) query.set("page", String(filters.page));
  if (filters.size) query.set("size", String(filters.size));

  return request(`/api/dashboard/clinics/${clinicId}/patients?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const unwrapped = unwrapApiData(payload);
    const list = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped && Array.isArray(unwrapped.content)
        ? unwrapped.content
        : [];

    const pagination = unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
      ? {
          pageNumber: unwrapped.pageNumber ?? unwrapped.number ?? 0,
          pageSize: unwrapped.pageSize ?? unwrapped.size ?? list.length,
          totalPages: unwrapped.totalPages ?? 0,
          totalElements: unwrapped.totalElements ?? list.length,
          number: unwrapped.number ?? unwrapped.pageNumber ?? 0,
          size: unwrapped.size ?? unwrapped.pageSize ?? list.length,
        }
      : null;

    if ((filters.page !== undefined && filters.page !== null) || filters.size) {
      return { items: list, pagination };
    }

    return list;
  });
}

export function getPatientAppointmentHistory(clinicId, patientId, filters = {}, token) {
  const query = new URLSearchParams();
  if (filters.page !== undefined && filters.page !== null) query.set("page", String(filters.page));
  if (filters.size) query.set("size", String(filters.size));

  return request(`/api/dashboard/clinics/${clinicId}/patients/${patientId}/appointments?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const unwrapped = unwrapApiData(payload);
    const items = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped && Array.isArray(unwrapped.content)
        ? unwrapped.content
        : [];
    const pagination = unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
      ? {
          pageNumber: unwrapped.pageNumber ?? unwrapped.number ?? 0,
          pageSize: unwrapped.pageSize ?? unwrapped.size ?? items.length,
          totalPages: unwrapped.totalPages ?? 0,
          totalElements: unwrapped.totalElements ?? items.length,
          number: unwrapped.number ?? unwrapped.pageNumber ?? 0,
          size: unwrapped.size ?? unwrapped.pageSize ?? items.length,
        }
      : null;
    return { items, pagination };
  });
}

export function generatePatientQr(clinicId, patientId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/patients/${patientId}/qr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function generateClinicQr(clinicId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/qr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function searchClinicPatientsByQuery(clinicId, query, token) {
  const params = new URLSearchParams();
  if (query) params.set("query", query.trim());
  const url = params.toString() ? `/api/dashboard/clinics/${clinicId}/patients/search?${params.toString()}` : `/api/dashboard/clinics/${clinicId}/patients/search`;

  return request(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const data = unwrapApiData(payload);
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  });
}

export function createClinicPatient(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/patients`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      whatsappNumber: payload.whatsappNumber,
      email: payload.email,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
    }),
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.patient) return response.patient;
    }
    return response;
  });
}

export function getClinicDashboard(clinicId, token) {
  return request(`/api/dashboard/${clinicId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getClinicWeeklyAppointments(clinicId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/appointments-this-week`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const data = unwrapApiData(payload);
    return Array.isArray(data) ? data : [];
  });
}

export function getClinicHolidays(clinicId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/holidays`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function createClinicHoliday(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/holidays/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      holidayDate: payload.holidayDate,
      name: payload.name,
    }),
  });
}

export function createClinicAppointment(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/appointments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: Number(payload.patientId),
      doctorId: Number(payload.doctorId),
      serviceId: Number(payload.serviceId),
      appointmentDate: payload.appointmentDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
    }),
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.appointment) return response.appointment;
    }
    return response;
  });
}

export function getClinicAppointments(clinicId, filters, token) {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.doctorId) query.set("doctorId", filters.doctorId);
  if (filters.serviceId) query.set("serviceId", filters.serviceId);
  if (filters.status) query.set("status", filters.status);
  if (filters.page !== undefined && filters.page !== null) query.set("page", String(filters.page));
  if (filters.size) query.set("size", String(filters.size));

  return request(`/api/dashboard/clinics/${clinicId}/appointments?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    const unwrapped = unwrapApiData(payload);
    const list = Array.isArray(unwrapped)
      ? unwrapped
      : unwrapped && Array.isArray(unwrapped.content)
        ? unwrapped.content
        : [];

    const pagination = unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
      ? {
          pageNumber: unwrapped.pageNumber ?? unwrapped.number ?? 0,
          pageSize: unwrapped.pageSize ?? unwrapped.size ?? list.length,
          totalPages: unwrapped.totalPages ?? 0,
          totalElements: unwrapped.totalElements ?? list.length,
          number: unwrapped.number ?? unwrapped.pageNumber ?? 0,
          size: unwrapped.size ?? unwrapped.pageSize ?? list.length,
        }
      : null;

    if ((filters.page !== undefined && filters.page !== null) || filters.size) {
      return { items: list, pagination };
    }

    return list;
  });
}

export function updateAppointmentStatus(appointmentId, status, token) {
  return request(`/api/dashboard/appointments/${appointmentId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.appointment) return payload.appointment;
    }
    return payload;
  });
}

export function cancelAppointment(appointmentId, token) {
  return request(`/api/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.appointment) return payload.appointment;
    }
    return payload;
  });
}

export function createNextAppointment(appointmentId, payload, token) {
  return request(`/api/dashboard/appointments/${appointmentId}/next`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appointmentDate: payload.appointmentDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
    }),
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.appointment) return response.appointment;
    }
    return response;
  });
}

export function rescheduleAppointment(appointmentId, payload, token) {
  return request(`/api/dashboard/appointments/${appointmentId}/reschedule`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appointmentDate: payload.appointmentDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason,
    }),
  }).then((response) => {
    if (response && typeof response === "object") {
      if (response.data && typeof response.data === "object") return response.data;
      if (response.appointment) return response.appointment;
    }
    return response;
  });
}

export function followUpAppointment(appointmentId, suggestedFollowUpDate, token) {
  return request(`/api/dashboard/appointments/${appointmentId}/follow-up`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ suggestedFollowUpDate }),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.appointment) return payload.appointment;
    }
    return payload;
  });
}

export function saveClinicProfile(payload, token) {
  return request("/api/dashboard/clinics", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateClinicProfile(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function upsertClinicWorkingHours(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/working-hours`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getClinicWhatsAppConfig(clinicId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/whatsapp-config`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function saveClinicWhatsAppConfig(clinicId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/whatsapp-config`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.config && typeof payload.config === "object") return payload.config;
    }
    return payload;
  });
}

export function connectClinicWhatsApp(clinicId, code, token) {
  return request("/api/whatsapp/connect", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, clinicId }),
  });
}

export function getDoctorAvailability(clinicId, doctorId, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors/${doctorId}/availability`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((payload) => unwrapApiData(payload));
}

export function saveDoctorAvailability(clinicId, doctorId, payload, token) {
  return request(`/api/dashboard/clinics/${clinicId}/doctors/${doctorId}/availability`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((payload) => {
    if (payload && typeof payload === "object") {
      if (payload.data && typeof payload.data === "object") return payload.data;
      if (payload.availability) return payload.availability;
    }
    return payload;
  });
}

export { API_BASE_URL };
