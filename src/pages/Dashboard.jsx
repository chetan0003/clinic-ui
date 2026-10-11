import React from "react";
import { useEffect, useMemo,useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Subscriptions from "./Subscriptions";
import ClinicPolicySettings from "./ClinicPolicySettings";
import holaMdLogo from "../assets/logo/hola-md-final-logo.png";
import whatsAppIcon from "../assets/logo/WhatsApp-Icon.png";
import jsQR from "jsqr";
import { activateClinicPolicy, cancelAppointment, checkInAppointment, checkInAppointmentByQrToken, collectAppointmentPayment, connectClinicWhatsApp, createClinicAppointment, createClinicDoctor, createClinicHoliday, createClinicPatient, createClinicPolicy, createClinicService, createClinicUser, createNextAppointment, deactivateClinicPolicy, deleteClinicAppointment, deleteClinicDoctor, deleteClinicHoliday, deleteClinicService, followUpAppointment, generateClinicQr, generatePatientQr, getAppointmentByQrToken, getAppointmentPayment, getClinicAppointments, getClinicAvailableSlots, getClinicDashboard, getClinicDoctors, getClinicHolidays, getClinicNotifications, getClinicPatients, getClinicPolicy, getClinicPolicies, getClinicPoliciesByCategory, getClinicPolicyVersions, getClinicProfiles, getClinicServices, getClinicUnreadNotificationCount, getClinicUsers, getClinicWeeklyAppointments, getClinicWorkingHours, getDoctorAvailability, getDoctorServices, getPatientAppointmentHistory, getUserClinics, markAllClinicNotificationsRead, markClinicNotificationRead, rescheduleAppointment, rollbackClinicPolicy, saveClinicProfile, saveClinicWhatsAppConfig, saveDoctorAvailability, searchClinicPatientsByQuery, updateAppointmentStatus, updateClinicDoctor, updateClinicPolicy, updateClinicProfile, updateClinicPatient, upsertClinicWorkingHours, validateClinicPolicy } from "../services/api";

const pageMeta = {
  dashboard: ["Dashboard", "Good morning. Here's today's clinic overview."],
  reception: ["Reception Desk", "Check in patients, collect payments, and manage the OPD queue."],
  appointments: ["Appointments", "Manage and monitor clinic appointments."],
  queue: ["Appointment Queue", "Keep today's checked-in patients moving."],
  patients: ["Patients", "Patients associated with this clinic."],
  doctors: ["Doctors", "Doctors registered with this clinic."],
  services: ["Services", "Services offered by this clinic."],
  staff: ["Staff & Users", "Manage dashboard access and roles."],
  reports: ["Reports", "Clinic performance and appointment analytics."],
  subscriptions: ["Subscription", "Manage plans, payments, and clinic limits."],
  settings: ["Settings", "Configure your clinic."],
  accountSecurity: ["Account Security", "Protect your account with an authenticator app."],
};

const appointments = [
  // ["Ankita Sharma", "AS", "Dental Consultation", "Dr Patel", "24 Aug 2026", "09:00 AM", "CONFIRMED"],
  // ["Neeta Deshmukh", "ND", "Health Consultation", "Dr Nikhil", "24 Aug 2026", "10:30 AM", "CONFIRMED"],
  // ["Rahul Joshi", "RJ", "Teeth Cleaning", "Dr Sharma", "24 Aug 2026", "12:00 PM", "PENDING"],
  // ["Priya Patil", "PP", "Dental Consultation", "Dr Patel", "24 Aug 2026", "03:30 PM", "CONFIRMED"],
  // ["Amit Kulkarni", "AK", "Health Consultation", "Dr Nikhil", "24 Aug 2026", "06:00 PM", "CONFIRMED"],
];

function initials(user) {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  if (name) return name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  return (user?.username || "CA").slice(0, 2).toUpperCase();
}

function formatTime(time) {
  if (!time) return "-";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount) || 0);
}

function formatNotificationTime(value) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return String(value);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function normalizeTime(time) {
  return time ? String(time).slice(0, 5) : "";
}

function addMinutesToTime(time, minutes) {
  if (!time || !Number.isFinite(Number(minutes))) return "";
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + Number(minutes);
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, "0")}:${String(normalizedMinutes % 60).padStart(2, "0")}`;
}

const DEFAULT_CLINIC_WORKING_HOURS = [
  { day: "MONDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "TUESDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "WEDNESDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "THURSDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "FRIDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "SATURDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  { day: "SUNDAY", active: false, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
];

function mapClinicWorkingHours(savedHours) {
  const records = Array.isArray(savedHours) ? savedHours : [];
  return DEFAULT_CLINIC_WORKING_HOURS.map((defaultHours) => {
    const saved = records.find((item) => String(item.dayOfWeek || item.day || "").toUpperCase() === defaultHours.day);
    if (!saved) return defaultHours;

    return {
      ...defaultHours,
      active: saved.active ?? defaultHours.active,
      start: normalizeTime(saved.startTime || saved.start || defaultHours.start),
      end: normalizeTime(saved.endTime || saved.end || defaultHours.end),
      breakStart: saved.breakStartTime == null ? "" : normalizeTime(saved.breakStartTime || saved.breakStart),
      breakEnd: saved.breakEndTime == null ? "" : normalizeTime(saved.breakEndTime || saved.breakEnd),
    };
  });
}

function Modal({ title, children, onClose, onSave, cancelLabel = "Cancel", saveLabel = "Save", saveDisabled = false, saveClassName = "btn btn-primary", className = "" }) {
  return (
    <div className="modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>{cancelLabel}</button>
          <button className={saveClassName} onClick={onSave} disabled={saveDisabled}>{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

function AppointmentPaymentDialog({ appointment, clinicId, token, onClose, onPaymentCollected, showToast }) {
  const [details, setDetails] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPayment() {
      try {
        setLoading(true);
        setError("");
        const result = await getAppointmentPayment(appointment.id, token, clinicId);
        if (cancelled) return;
        const totalAmount = Number(result?.totalAmount) || 0;
        const isUnpaid = String(appointment.paymentStatus || "").toUpperCase() === "UNPAID";
        const paymentDetails = isUnpaid && totalAmount > 0
          ? { ...result, paidAmount: 0, remainingAmount: totalAmount, status: "UNPAID" }
          : result;
        setDetails(paymentDetails);
        setAmount(String(paymentDetails?.remainingAmount ?? ""));
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load payment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPayment();
    return () => { cancelled = true; };
  }, [appointment.id, appointment.paymentStatus, clinicId, token]);

  async function collectPayment() {
    const paymentAmount = Number(amount);
    const remainingAmount = Number(details?.remainingAmount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > remainingAmount) {
      setError(`Enter an amount greater than 0 and no more than ${remainingAmount}.`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const result = await collectAppointmentPayment(appointment.id, { amount: paymentAmount, paymentMethod }, token, clinicId);
      setDetails(result);
      setAmount(String(result?.remainingAmount ?? ""));
      onPaymentCollected?.(result);
      showToast("Payment collected successfully");
    } catch (err) {
      setError(err.message || "Unable to collect payment.");
    } finally {
      setSaving(false);
    }
  }

  return <Modal
    title="Collect Payment"
    onClose={onClose}
    onSave={collectPayment}
    saveLabel={saving ? "Collecting..." : "Collect"}
    saveDisabled={loading || saving || !details || Number(details.remainingAmount) <= 0}
  >
    {loading && <p className="muted">Loading payment details...</p>}
    {details && <>
      <div className="info-line"><span>Patient</span><strong>{appointment.patientName || "-"}</strong></div>
      <div className="info-line"><span>Service</span><strong>{appointment.serviceName || appointment.service?.name || "-"}</strong></div>
      <div className="info-line"><span>Total Amount</span><strong>{formatCurrency(details.totalAmount)}</strong></div>
      <div className="info-line"><span>Paid Amount</span><strong>{formatCurrency(details.paidAmount)}</strong></div>
      <div className="info-line"><span>Remaining</span><strong>{formatCurrency(details.remainingAmount)}</strong></div>
      {Number(details.remainingAmount) > 0 && <div className="form-grid mt">
        <Field label="Amount" type="number" min="0.01" max={details.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div className="field">
          <label>Payment Method</label>
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="ONLINE">Online</option>
            <option value="FREE">Free</option>
          </select>
        </div>
      </div>}
    </>}
    {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
  </Modal>;
}

export default function Dashboard({ theme, onToggleTheme }) {
  const { user, token, logout } = useAuth();
  const [page, setPage] = useState(() => {
    if (user?.isPlanActive === false && String(user?.role).toUpperCase() !== "SUPER_ADMIN") return "subscriptions";
    return String(user?.role).toUpperCase() === "STAFF" ? "reception" : "dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [serviceFilter, setServiceFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [search, setSearch] = useState("");
  const [staffForm, setStaffForm] = useState({
    username: "", email: "", password: "", firstName: "", lastName: "",
    phone: "", role: "STAFF", clinicId: "1", doctorId: ""
  });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffRefreshKey, setStaffRefreshKey] = useState(0);
  const [staffDoctors, setStaffDoctors] = useState([]);
  const [staffDoctorsLoading, setStaffDoctorsLoading] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ name: "", specialization: "", serviceId: "", active: true });
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState("");
  const [doctorRefreshKey, setDoctorRefreshKey] = useState(0);
  const [doctorServices, setDoctorServices] = useState([]);
  const [doctorServicesLoading, setDoctorServicesLoading] = useState(false);
  const [patientForm, setPatientForm] = useState({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" });
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [appointmentForm, setAppointmentForm] = useState({ patientId: "", patientQuery: "", doctorId: "", serviceId: "", appointmentDate: "", startTime: "09:00", endTime: "09:30" });
  const [appointmentPatientOptions, setAppointmentPatientOptions] = useState([]);
  const [appointmentPatientLoading, setAppointmentPatientLoading] = useState(false);
  const [appointmentDoctors, setAppointmentDoctors] = useState([]);
  const [appointmentServices, setAppointmentServices] = useState([]);
  const [appointmentSlots, setAppointmentSlots] = useState([]);
  const [appointmentSlotsLoading, setAppointmentSlotsLoading] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");
  const [serviceForm, setServiceForm] = useState({ name: "", durationMinutes: "30", price: "" });
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(user?.clinicId || "");
  const [userDoctorId, setUserDoctorId] = useState(user?.doctorId || user?.doctor?.id || "");
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationActionId, setNotificationActionId] = useState(null);
  const [markingAllNotificationsRead, setMarkingAllNotificationsRead] = useState(false);
  const notificationMenuRef = useRef(null);

  const displayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "Chetan Admin";
  const role = user?.role || "CLINIC ADMIN";
  const normalizedRole = String(role).toUpperCase();
  const avatar = initials(user);
  const isDoctor = normalizedRole === "DOCTOR";
  const isSuperAdmin = normalizedRole === "SUPER_ADMIN";
  const canUseReceptionDesk = ["STAFF", "CLINIC_ADMIN"].includes(normalizedRole);
  const canViewAppointmentQueue = isDoctor || isSuperAdmin;
  const canManageStaff = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(String(role).toUpperCase());
  const canManageSettings = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(String(role).toUpperCase());
  const canViewClinicProfile = String(role).toUpperCase() === "SUPER_ADMIN";
  const isPlanInactive = user?.isPlanActive === false && !isSuperAdmin;
  const canViewSubscriptions = canManageSettings || isDoctor || isPlanInactive;
  const selectedClinicName = clinics.find((clinic) => String(clinic.id) === String(selectedClinicId))?.name || "your clinic";

  useEffect(() => {
    if (isPlanInactive) setPage("subscriptions");
  }, [isPlanInactive]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserClinics() {
      if (!token || !user?.username) {
        setClinicsLoading(false);
        return;
      }

      try {
        setClinicsLoading(true);
        const result = await getUserClinics(user.username, token);
        const userClinics = Array.isArray(result?.clinic)
          ? result.clinic
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.clinics)
              ? result.clinics
              : Array.isArray(result)
                ? result
                : [];
        if (!cancelled) setUserDoctorId(result?.doctorId || result?.data?.doctorId || user?.doctorId || user?.doctor?.id || "");
        const availableClinics = String(role).toUpperCase() === "SUPER_ADMIN" ? userClinics : userClinics.slice(0, 1);
        if (!cancelled) {
          setClinics(availableClinics);
          setSelectedClinicId((currentId) => availableClinics.some((clinic) => String(clinic.id) === String(currentId))
            ? currentId
            : availableClinics[0]?.id || "");
        }
      } catch (err) {
        if (!cancelled) showToast(err.message || "Unable to load clinics.");
      } finally {
        if (!cancelled) setClinicsLoading(false);
      }
    }

    loadUserClinics();
    return () => { cancelled = true; };
  }, [token, user?.username, role]);

  useEffect(() => {
    let cancelled = false;

    if (!token || !selectedClinicId) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      setNotificationsLoading(false);
      return undefined;
    }

    async function refreshNotifications() {
      try {
        const [notificationResult, unreadResult] = await Promise.allSettled([
          getClinicNotifications(selectedClinicId, { page: 0, size: 20 }, token),
          getClinicUnreadNotificationCount(selectedClinicId, token),
        ]);
        if (cancelled) return;

        if (notificationResult.status === "fulfilled") {
          setNotifications(Array.isArray(notificationResult.value) ? notificationResult.value : []);
        }
        if (unreadResult.status === "fulfilled") {
          setUnreadNotificationCount(Number(unreadResult.value) || 0);
        }
        const failure = notificationResult.status === "rejected" ? notificationResult.reason : unreadResult.status === "rejected" ? unreadResult.reason : null;
        setNotificationsError(failure?.message || "");
      } catch (err) {
        if (!cancelled) setNotificationsError(err.message || "Unable to load notifications.");
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }

    setNotificationsLoading(true);
    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedClinicId, token]);

  useEffect(() => {
    function closeNotificationMenu(event) {
      if (!notificationMenuRef.current?.contains(event.target)) setNotificationsOpen(false);
    }

    document.addEventListener("pointerdown", closeNotificationMenu);
    return () => document.removeEventListener("pointerdown", closeNotificationMenu);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setDoctorForm((value) => ({ ...value, serviceId: "" }));

    async function loadDoctorServices() {
      if (!token || !selectedClinicId) {
        setDoctorServices([]);
        return;
      }

      try {
        setDoctorServicesLoading(true);
        const result = await getDoctorServices(selectedClinicId, token);
        let services = Array.isArray(result) ? result : [];
        if (services.length === 0) {
          const clinicServices = await getClinicServices(selectedClinicId, token);
          services = Array.isArray(clinicServices) ? clinicServices : [];
        }
        if (!cancelled) setDoctorServices(services);
      } catch (err) {
        try {
          const clinicServices = await getClinicServices(selectedClinicId, token);
          if (!cancelled) setDoctorServices(Array.isArray(clinicServices) ? clinicServices : []);
        } catch (fallbackError) {
          if (!cancelled) {
            setDoctorServices([]);
            setDoctorError(fallbackError.message || err.message || "Unable to load services.");
          }
        }
      } finally {
        if (!cancelled) setDoctorServicesLoading(false);
      }
    }

    loadDoctorServices();
    return () => { cancelled = true; };
  }, [selectedClinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadStaffDoctors() {
      if (!token || !selectedClinicId) {
        setStaffDoctors([]);
        return;
      }

      try {
        setStaffDoctorsLoading(true);
        const result = await getClinicDoctors(selectedClinicId, token);
        if (!cancelled) setStaffDoctors(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) {
          setStaffDoctors([]);
          setStaffError(err.message || "Unable to load doctors.");
        }
      } finally {
        if (!cancelled) setStaffDoctorsLoading(false);
      }
    }

    loadStaffDoctors();
    return () => { cancelled = true; };
  }, [selectedClinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadAppointmentOptions() {
      if (!modal || modal !== "appointment" || !token || !selectedClinicId) {
        setAppointmentDoctors([]);
        setAppointmentServices([]);
        return;
      }

      try {
        const [doctorResult, serviceResult] = await Promise.all([
          getClinicDoctors(selectedClinicId, token),
          getClinicServices(selectedClinicId, token),
        ]);

        if (!cancelled) {
          setAppointmentDoctors(Array.isArray(doctorResult) ? doctorResult : []);
          setAppointmentServices(Array.isArray(serviceResult) ? serviceResult : []);
        }
      } catch (err) {
        if (!cancelled) {
          setAppointmentDoctors([]);
          setAppointmentServices([]);
        }
      }
    }

    loadAppointmentOptions();
    return () => { cancelled = true; };
  }, [modal, selectedClinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadAppointmentSlots() {
      const { doctorId, serviceId, appointmentDate } = appointmentForm;
      if (modal !== "appointment" || !token || !selectedClinicId || !doctorId || !serviceId || !appointmentDate) {
        setAppointmentSlots([]);
        setAppointmentSlotsLoading(false);
        return;
      }

      try {
        setAppointmentSlotsLoading(true);
        const slots = await getClinicAvailableSlots(selectedClinicId, doctorId, serviceId, appointmentDate, token);
        if (!cancelled) setAppointmentSlots(slots);
      } catch (err) {
        if (!cancelled) setAppointmentSlots([]);
      } finally {
        if (!cancelled) setAppointmentSlotsLoading(false);
      }
    }

    loadAppointmentSlots();
    return () => { cancelled = true; };
  }, [modal, selectedClinicId, token, appointmentForm.doctorId, appointmentForm.serviceId, appointmentForm.appointmentDate]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(window.__clinicToast);
    window.__clinicToast = window.setTimeout(() => setToast(""), 2600);
  }

  function go(next) {
    setPage(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openNotification(notification) {
    if (!notification.read) {
      try {
        setNotificationActionId(notification.id);
        await markClinicNotificationRead(selectedClinicId, notification.id, token);
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
        setUnreadNotificationCount((count) => Math.max(0, count - 1));
      } catch (err) {
        showToast(err.message || "Unable to mark notification as read.");
      } finally {
        setNotificationActionId(null);
      }
    }

    setNotificationsOpen(false);
    if (notification.appointmentId) go("appointments");
  }

  async function markAllNotificationsRead() {
    if (!selectedClinicId || unreadNotificationCount === 0) return;

    try {
      setMarkingAllNotificationsRead(true);
      await markAllClinicNotificationsRead(selectedClinicId, token);
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      showToast(err.message || "Unable to mark notifications as read.");
    } finally {
      setMarkingAllNotificationsRead(false);
    }
  }

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo-image" src={holaMdLogo} alt="Hola MD logo" />
          <div className="brand-name">Hola MD</div>
        </div>

        <div className="clinic-switcher">
          <small>Current clinic</small>
          <select value={selectedClinicId} onChange={(e) => setSelectedClinicId(e.target.value)} disabled={clinics.length <= 1}>
            {clinics.length === 0 && <option value="">Loading clinic...</option>}
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </select>
        </div>

        {!isPlanInactive && <>
        <div className="nav-section">Overview</div>
        <NavButton active={page === "dashboard"} onClick={() => go("dashboard")} icon="▣">Dashboard</NavButton>

        <div className="nav-section">Clinic Operations</div>
        {canUseReceptionDesk && <NavButton active={page === "reception"} onClick={() => go("reception")} icon="▣">Reception Desk</NavButton>}
        <NavButton active={page === "appointments"} onClick={() => go("appointments")} icon="◷">Appointments</NavButton>
        {canViewAppointmentQueue && <NavButton active={page === "queue"} onClick={() => go("queue")} icon="☷">Appointment Queue</NavButton>}
        <NavButton active={page === "patients"} onClick={() => go("patients")} icon="♙">Patients</NavButton>
        <NavButton active={page === "doctors"} onClick={() => go("doctors")} icon="♧">Doctors</NavButton>
        <NavButton active={page === "services"} onClick={() => go("services")} icon="▤">Services</NavButton>

        <div className="nav-section">Administration</div>
        {canManageStaff && <NavButton active={page === "staff"} onClick={() => go("staff")} icon="♙">Staff & Users</NavButton>}
        <NavButton active={page === "reports"} onClick={() => go("reports")} icon="▥">Reports</NavButton>
        {canManageSettings && <NavButton active={page === "settings"} onClick={() => go("settings")} icon="⚙">Settings</NavButton>}
        </>}
        {canViewSubscriptions && <NavButton active={page === "subscriptions"} onClick={() => go("subscriptions")} icon="◇">Subscription</NavButton>}
        <NavButton active={page === "accountSecurity"} onClick={() => go("accountSecurity")} icon="▣">Account Security</NavButton>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{avatar}</div>
            <div>
              <div className="u-name">{displayName}</div>
              <div className="u-role">{String(role).replaceAll("_", " ")}</div>
            </div>
            <button className="logout-side" onClick={logout} title="Logout" aria-label="Logout">↪</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
            <div className="page-heading">
              <h1>{pageMeta[page][0]}</h1>
              <p>{pageMeta[page][1]}</p>
            </div>
          </div>
          <div className="top-actions">
            <div className="search">
              <span>⌕</span>
              <input
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="icon-btn theme-toggle" onClick={onToggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <div className="notification-menu" ref={notificationMenuRef}>
              <button className="icon-btn notification-trigger" onClick={() => { setNotificationsExpanded(false); setNotificationsOpen((open) => !open); }} aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`} aria-expanded={notificationsOpen}>
                ♢
                {unreadNotificationCount > 0 && <span className="notification-count">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
              </button>
              {notificationsOpen && <section className="notification-panel" aria-label="Notifications">
                <header className="notification-panel-header">
                  <div><h2>Notifications</h2>{unreadNotificationCount > 0 && <span className="notification-unread-count">{unreadNotificationCount} unread</span>}</div>
                  <div className="notification-panel-controls">
                    <button type="button" className="notification-mark-all" onClick={markAllNotificationsRead} disabled={markingAllNotificationsRead || unreadNotificationCount === 0}>{markingAllNotificationsRead ? "Marking..." : "Mark all read"}</button>
                    <button type="button" className="notification-close" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
                  </div>
                </header>
                {notificationsError && <div className="notification-error">{notificationsError}</div>}
                <div className="notification-list">
                  {notificationsLoading && notifications.length === 0 && <p className="notification-empty">Loading notifications...</p>}
                  {!notificationsLoading && notifications.length === 0 && <p className="notification-empty">You&apos;re all caught up.</p>}
                  {notifications.slice(0, notificationsExpanded ? notifications.length : 5).map((notification) => <button type="button" className={`notification-item ${notification.read ? "read" : "unread"}`} key={notification.id} onClick={() => openNotification(notification)} disabled={notificationActionId === notification.id}>
                    <span className="notification-type-icon" aria-hidden="true">{String(notification.type || "").includes("APPOINTMENT") ? "▣" : "◇"}</span>
                    <span className="notification-item-content">
                      <strong>{notification.title || "Notification"}</strong>
                      <span className="notification-message">{notification.message || ""}</span>
                      <time>{formatNotificationTime(notification.createdAt)}</time>
                    </span>
                    {!notification.read && <span className="notification-new-label">New</span>}
                  </button>)}
                </div>
                {notifications.length > 5 && <button type="button" className="notification-view-more" onClick={() => setNotificationsExpanded((expanded) => !expanded)}>{notificationsExpanded ? "View less" : `View more (${notifications.length - 5})`}</button>}
              </section>}
            </div>
            <div className="profile">
              <div className="avatar">{avatar}</div>
              <div className="profile-text">
                <strong>{displayName}</strong>
                <span>{String(role).replaceAll("_", " ")}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {clinicsLoading ? <PageLoader /> : <>
          {page === "dashboard" && (
            <DashboardHome go={go} openModal={setModal} clinicId={selectedClinicId} clinicName={selectedClinicName} token={token} />
          )}

          {page === "reception" && canUseReceptionDesk && (
            <ReceptionDesk
              clinicId={selectedClinicId}
              clinicName={selectedClinicName}
              token={token}
              search={search}
              openModal={setModal}
              showToast={showToast}
              onUpdatePatient={(patient) => {
                setEditingPatientId(patient.id);
                setPatientForm({
                  name: patient.name || "",
                  whatsappNumber: patient.whatsappNumber || patient.phoneNo || "",
                  email: patient.email || "",
                  dateOfBirth: patient.dateOfBirth || "",
                  gender: patient.gender || "",
                });
                setPatientError("");
                setModal("patient");
              }}
            />
          )}

          {page === "appointments" && (
            <Appointments
              clinicId={selectedClinicId}
              token={token}
              userRole={role}
              userDoctorId={user?.doctorId || user?.doctor?.id}
              search={search}
              openModal={setModal}
              showToast={showToast}
            />
          )}

          {canViewAppointmentQueue && page === "queue" && (
            <AppointmentQueue
              clinicId={selectedClinicId}
              token={token}
              userRole={role}
              userDoctorId={userDoctorId}
              search={search}
              showToast={showToast}
            />
          )}

          {page === "patients" && (
            <Patients openModal={setModal} onEdit={(patient) => {
              if (!patient) {
                setEditingPatientId(null);
                setPatientForm({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" });
                setPatientError("");
                return;
              }
              setEditingPatientId(patient.id);
              setPatientForm({
                name: patient.name || "",
                whatsappNumber: patient.whatsappNumber || patient.phoneNo || "",
                email: patient.email || "",
                dateOfBirth: patient.dateOfBirth || "",
                gender: patient.gender || "",
              });
              setPatientError("");
              setModal("patient");
            }} showToast={showToast} clinicId={selectedClinicId} clinicName={selectedClinicName} token={token} />
          )}

          {page === "doctors" && (
            <Doctors
              openModal={setModal}
              showToast={showToast}
              clinicId={selectedClinicId}
              token={token}
              refreshKey={doctorRefreshKey}
              onEdit={(doctor) => {
                if (!doctor) {
                  setEditingDoctorId(null);
                  setDoctorForm({ name: "", specialization: "", serviceId: "", active: true });
                  setDoctorError("");
                  return;
                }
                setEditingDoctorId(doctor.id);
                setDoctorForm({
                  name: doctor.name || "",
                  specialization: doctor.specialization || "",
                  serviceId: String(doctor.serviceId || doctor.service?.id || ""),
                  active: doctor.isActive ?? doctor.active ?? true,
                });
                setDoctorError("");
                setModal("doctor");
              }}
            />
          )}

          {page === "services" && (
            <Services
              openModal={setModal}
              showToast={showToast}
              clinicId={selectedClinicId}
              token={token}
              doctorId={String(role).toUpperCase() === "DOCTOR" ? userDoctorId : ""}
              refreshKey={serviceRefreshKey}
            />
          )}

          {page === "staff" && canManageStaff && (
            <Staff
              openModal={setModal}
              clinicId={selectedClinicId}
              token={token}
              refreshKey={staffRefreshKey}
            />
          )}

          {page === "reports" && <Reports showToast={showToast} />}

          {page === "subscriptions" && canViewSubscriptions && <Subscriptions clinicId={selectedClinicId} clinicName={selectedClinicName} token={token} isSuperAdmin={isSuperAdmin} showToast={showToast} />}

          {page === "settings" && canManageSettings && <Settings showToast={showToast} clinicId={selectedClinicId} clinicName={selectedClinicName} token={token} canViewClinicProfile={canViewClinicProfile} />}
          </>}
          {page === "accountSecurity" && <AccountSecurity showToast={showToast} />}
        </div>
      </main>

      {modal === "appointment" && (
        <Modal
          title="New Appointment"
          onClose={() => { setModal(null); setAppointmentError(""); setAppointmentForm({ patientId: "", patientQuery: "", doctorId: "", serviceId: "", appointmentDate: "", startTime: "09:00", endTime: "09:30" }); setAppointmentPatientOptions([]); }}
          onSave={async () => {
            setAppointmentError("");
            if (!selectedClinicId) {
              setAppointmentError("Please select a clinic first.");
              return;
            }
            if (!appointmentForm.patientId || !appointmentForm.doctorId || !appointmentForm.serviceId || !appointmentForm.appointmentDate || !appointmentForm.startTime || !appointmentForm.endTime) {
              setAppointmentError("Please fill in all required fields.");
              return;
            }

            try {
              setAppointmentLoading(true);
              await createClinicAppointment(selectedClinicId, {
                patientId: appointmentForm.patientId,
                doctorId: appointmentForm.doctorId,
                serviceId: appointmentForm.serviceId,
                appointmentDate: appointmentForm.appointmentDate,
                startTime: appointmentForm.startTime,
                endTime: appointmentForm.endTime,
              }, token);
              setModal(null);
              setAppointmentForm({ patientId: "", patientQuery: "", doctorId: "", serviceId: "", appointmentDate: "", startTime: "09:00", endTime: "09:30" });
              setAppointmentPatientOptions([]);
              showToast("Appointment created successfully");
            } catch (err) {
              setAppointmentError(err.message || "Unable to create appointment.");
            } finally {
              setAppointmentLoading(false);
            }
          }}
          saveLabel={appointmentLoading ? "Creating..." : "Create Appointment"}
          saveDisabled={appointmentLoading}
        >
          <div className="form-grid">
            <div className="field">
              <label>Patient *</label>
              <input value={appointmentForm.patientQuery} placeholder="Search patient by name or phone" onChange={async (e) => {
                const query = e.target.value;
                setAppointmentForm((value) => ({ ...value, patientQuery: query }));
                if (!selectedClinicId || !token || query.trim().length < 2) {
                  setAppointmentPatientOptions([]);
                  return;
                }
                try {
                  setAppointmentPatientLoading(true);
                  const results = await searchClinicPatientsByQuery(selectedClinicId, query, token);
                  setAppointmentPatientOptions(Array.isArray(results) ? results : []);
                } catch (err) {
                  setAppointmentPatientOptions([]);
                } finally {
                  setAppointmentPatientLoading(false);
                }
              }} />
            </div>
            <div className="field">
              <label>Patient</label>
              <select value={appointmentForm.patientId} onChange={(e) => setAppointmentForm((value) => ({ ...value, patientId: e.target.value }))} disabled={appointmentPatientLoading || appointmentPatientOptions.length === 0}>
                <option value="">{appointmentPatientLoading ? "Loading patients..." : appointmentPatientOptions.length === 0 ? "No patient found" : "Select patient"}</option>
                {appointmentPatientOptions.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name} ({patient.phoneNo || patient.whatsappNumber || "No phone"})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Service *</label>
              <select value={appointmentForm.serviceId} onChange={(e) => setAppointmentForm((value) => ({ ...value, serviceId: e.target.value, startTime: "", endTime: "" }))} disabled={appointmentServices.length === 0}>
                <option value="">{appointmentServices.length === 0 ? "No services available" : "Select service"}</option>
                {appointmentServices.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Doctor *</label>
              <select value={appointmentForm.doctorId} onChange={(e) => setAppointmentForm((value) => ({ ...value, doctorId: e.target.value, startTime: "", endTime: "" }))} disabled={appointmentDoctors.length === 0}>
                <option value="">{appointmentDoctors.length === 0 ? "No doctors available" : "Select doctor"}</option>
                {appointmentDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            </div>
            <Field label="Date *" type="date" value={appointmentForm.appointmentDate} onChange={(e) => setAppointmentForm((value) => ({ ...value, appointmentDate: e.target.value, startTime: "", endTime: "" }))} />
            <div className="field">
              <label>Available Slot *</label>
              <select value={appointmentForm.startTime} onChange={(e) => {
                const startTime = normalizeTime(e.target.value);
                const selectedService = appointmentServices.find((service) => String(service.id) === String(appointmentForm.serviceId));
                const duration = Number(selectedService?.durationMinutes || 30);
                setAppointmentForm((value) => ({ ...value, startTime, endTime: addMinutesToTime(startTime, duration) }));
              }} disabled={appointmentSlotsLoading || appointmentSlots.length === 0}>
                <option value="">{appointmentSlotsLoading ? "Loading available slots..." : appointmentSlots.length === 0 ? "No slots available" : "Select available slot"}</option>
                {appointmentSlots.map((slot) => <option key={slot} value={normalizeTime(slot)}>{formatTime(normalizeTime(slot))}</option>)}
              </select>
            </div>
            <div className="field">
              <label>End Time *</label>
              <input type="time" value={appointmentForm.endTime} readOnly />
            </div>
          </div>
          {appointmentError && <div className="auth-error" style={{ marginTop: 12 }}>{appointmentError}</div>}
        </Modal>
      )}

      {modal === "patient" && (
        <Modal
          title={editingPatientId === null ? "Add Patient" : "Edit Patient"}
          onClose={() => { setModal(null); setEditingPatientId(null); setPatientError(""); setPatientForm({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" }); }}
          onSave={async () => {
            setPatientError("");
            if (!selectedClinicId) {
              setPatientError("Please select a clinic first.");
              return;
            }
            if (!patientForm.name.trim() || !patientForm.whatsappNumber.trim()) {
              setPatientError("Please enter patient name and WhatsApp number.");
              return;
            }
            try {
              setPatientLoading(true);
              const patientPayload = {
                name: patientForm.name.trim(),
                whatsappNumber: patientForm.whatsappNumber.trim(),
                email: patientForm.email.trim(),
                dateOfBirth: patientForm.dateOfBirth,
                gender: patientForm.gender,
              };
              if (editingPatientId === null) {
                await createClinicPatient(selectedClinicId, patientPayload, token);
              } else {
                await updateClinicPatient(selectedClinicId, editingPatientId, patientPayload, token);
              }
              setModal(null);
              setEditingPatientId(null);
              setPatientForm({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" });
              showToast(editingPatientId === null ? "Patient added successfully" : "Patient updated successfully");
            } catch (err) {
              setPatientError(err.message || "Unable to add patient.");
            } finally {
              setPatientLoading(false);
            }
          }}
          saveLabel={patientLoading ? (editingPatientId === null ? "Adding..." : "Updating...") : (editingPatientId === null ? "Add Patient" : "Update Patient")}
          saveDisabled={patientLoading}
        >
          <div className="form-grid">
            <Field label="Patient Name *" placeholder="Full name" value={patientForm.name} onChange={(e) => setPatientForm((v) => ({ ...v, name: e.target.value }))} />
            <Field label="WhatsApp Number *" placeholder="+91..." value={patientForm.whatsappNumber} onChange={(e) => setPatientForm((v) => ({ ...v, whatsappNumber: e.target.value }))} />
            <Field label="Email" type="email" placeholder="Optional" value={patientForm.email} onChange={(e) => setPatientForm((v) => ({ ...v, email: e.target.value }))} />
            <Field label="Date of Birth" type="date" value={patientForm.dateOfBirth} onChange={(e) => setPatientForm((v) => ({ ...v, dateOfBirth: e.target.value }))} />
            <div className="field">
              <label>Gender</label>
              <select value={patientForm.gender} onChange={(e) => setPatientForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>
          {patientError && <div className="auth-error" style={{ marginTop: 12 }}>{patientError}</div>}
        </Modal>
      )}

      {modal === "doctor" && (
        <Modal
          title={editingDoctorId === null ? "Add Doctor" : "Edit Doctor"}
          onClose={() => { setModal(null); setEditingDoctorId(null); setDoctorError(""); }}
          onSave={async () => {
            setDoctorError("");
            if (!token) {
              setDoctorError("A clinic-admin login token is required.");
              return;
            }
            if (!selectedClinicId) {
              setDoctorError("Please select a clinic first.");
              return;
            }
            if (!doctorForm.name.trim() || !doctorForm.specialization.trim() || !doctorForm.serviceId) {
              setDoctorError("Please fill all required fields.");
              return;
            }
            try {
              setDoctorLoading(true);
              const payload = {
                name: doctorForm.name.trim(),
                specialization: doctorForm.specialization.trim(),
                serviceId: Number(doctorForm.serviceId),
              };
              if (editingDoctorId === null) {
                await createClinicDoctor(selectedClinicId, payload, token);
              } else {
                await updateClinicDoctor(selectedClinicId, editingDoctorId, { ...payload, active: doctorForm.active }, token);
              }
              setModal(null);
              setEditingDoctorId(null);
              setDoctorForm({ name: "", specialization: "", serviceId: "", active: true });
              setDoctorRefreshKey((value) => value + 1);
              showToast(editingDoctorId === null ? "Doctor added successfully" : "Doctor updated successfully");
            } catch (err) {
              setDoctorError(err.message || "Unable to add doctor.");
            } finally {
              setDoctorLoading(false);
            }
          }}
          saveLabel={doctorLoading ? "Saving..." : editingDoctorId === null ? "Add Doctor" : "Update Doctor"}
          saveDisabled={doctorLoading || doctorServicesLoading}
        >
          {doctorError && <div className="auth-error">{doctorError}</div>}
          <div className="form-grid">
            <Field label="Doctor Name *" placeholder="Dr ..." value={doctorForm.name} onChange={(e) => setDoctorForm((value) => ({ ...value, name: e.target.value }))} />
            <Field label="Specialization *" placeholder="Dentist / MD / etc." value={doctorForm.specialization} onChange={(e) => setDoctorForm((value) => ({ ...value, specialization: e.target.value }))} />
            <div className="field"><label>Service *</label><select value={doctorForm.serviceId} onChange={(e) => setDoctorForm((value) => ({ ...value, serviceId: e.target.value }))} disabled={doctorServicesLoading || doctorServices.length === 0}><option value="">{doctorServicesLoading ? "Loading services..." : doctorServices.length === 0 ? "No services available" : "Select service"}</option>{doctorServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
            {editingDoctorId !== null && <div className="field"><label>Status *</label><select value={doctorForm.active ? "true" : "false"} onChange={(e) => setDoctorForm((value) => ({ ...value, active: e.target.value === "true" }))}><option value="true">Active</option><option value="false">Inactive</option></select></div>}
          </div>
        </Modal>
      )}

      {modal === "service" && (
        <Modal
          title="Add Service"
          onClose={() => { setModal(null); setServiceError(""); }}
          onSave={async () => {
            setServiceError("");
            if (!token) {
              setServiceError("A clinic-admin login token is required.");
              return;
            }
            if (!selectedClinicId) {
              setServiceError("Please select a clinic first.");
              return;
            }
            if (!serviceForm.name.trim() || !String(serviceForm.durationMinutes).trim() || !String(serviceForm.price).trim()) {
              setServiceError("Please fill all required fields.");
              return;
            }
            const durationMinutes = Number(serviceForm.durationMinutes);
            const price = Number(serviceForm.price);
            if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(price) || price < 0) {
              setServiceError("Duration and price must be valid numbers.");
              return;
            }
            try {
              setServiceLoading(true);
              await createClinicService(selectedClinicId, {
                name: serviceForm.name.trim(),
                durationMinutes,
                price,
              }, token);
              setModal(null);
              setServiceForm({ name: "", durationMinutes: "30", price: "" });
              setServiceRefreshKey((value) => value + 1);
              showToast("Service added successfully");
            } catch (err) {
              setServiceError(err.message || "Unable to add service.");
            } finally {
              setServiceLoading(false);
            }
          }}
          saveLabel={serviceLoading ? "Adding..." : "Add Service"}
          saveDisabled={serviceLoading}
        >
          {serviceError && <div className="auth-error">{serviceError}</div>}
          <div className="form-grid">
            <Field label="Service Name *" placeholder="Consultation" value={serviceForm.name} onChange={(e) => setServiceForm((value) => ({ ...value, name: e.target.value }))} />
            <Field label="Duration (minutes) *" type="number" min="1" value={serviceForm.durationMinutes} onChange={(e) => setServiceForm((value) => ({ ...value, durationMinutes: e.target.value }))} />
            <Field label="Price *" type="number" min="0" step="0.01" placeholder="0.00" value={serviceForm.price} onChange={(e) => setServiceForm((value) => ({ ...value, price: e.target.value }))} />
          </div>
        </Modal>
      )}

      {modal === "staff" && (
        <Modal
          title="Add Staff / User"
          onClose={() => { setModal(null); setStaffError(""); }}
          onSave={async () => {
            setStaffError("");
            if (!token) {
              setStaffError("A clinic-admin login token is required.");
              return;
            }
            const clinicId = selectedClinicId;
            const required = ["username", "email", "password", "firstName", "lastName", "phone"];
            if (required.some((key) => !String(staffForm[key]).trim()) || !String(clinicId).trim() || (staffForm.role === "DOCTOR" && !staffForm.doctorId)) {
              setStaffError("Please fill all required fields.");
              return;
            }
            const roleToCreate = isSuperAdmin
              ? staffForm.role
              : ["STAFF", "DOCTOR"].includes(staffForm.role) ? staffForm.role : "STAFF";
            try {
              setStaffLoading(true);
              await createClinicUser({
                username: staffForm.username.trim(),
                email: staffForm.email.trim(),
                password: staffForm.password,
                firstName: staffForm.firstName.trim(),
                lastName: staffForm.lastName.trim(),
                phone: staffForm.phone.trim(),
                role: roleToCreate,
                clinicId: Number(clinicId),
                doctorId: staffForm.role === "DOCTOR" ? Number(staffForm.doctorId) : null
              }, token);
              setModal(null);
              setStaffForm({ username:"", email:"", password:"", firstName:"", lastName:"", phone:"", role:"STAFF", clinicId:String(user?.clinicId || 1), doctorId:"" });
              setStaffRefreshKey((value) => value + 1);
              showToast("User created successfully");
            } catch (err) {
              setStaffError(err.message || "Unable to create user.");
            } finally {
              setStaffLoading(false);
            }
          }}
          saveLabel={staffLoading ? "Creating..." : "Create User"}
          saveDisabled={staffLoading || (staffForm.role === "DOCTOR" && staffDoctorsLoading)}
        >
          {staffError && <div className="auth-error">{staffError}</div>}
          <div className="form-grid">
            <Field label="Username *" value={staffForm.username} onChange={(e) => setStaffForm(v => ({...v, username:e.target.value}))} />
            <Field label="Email *" type="email" value={staffForm.email} onChange={(e) => setStaffForm(v => ({...v, email:e.target.value}))} />
            <Field label="Password *" type="password" value={staffForm.password} onChange={(e) => setStaffForm(v => ({...v, password:e.target.value}))} />
            <Field label="Phone *" value={staffForm.phone} onChange={(e) => setStaffForm(v => ({...v, phone:e.target.value}))} placeholder="+91..." />
            <Field label="First Name *" value={staffForm.firstName} onChange={(e) => setStaffForm(v => ({...v, firstName:e.target.value}))} />
            <Field label="Last Name *" value={staffForm.lastName} onChange={(e) => setStaffForm(v => ({...v, lastName:e.target.value}))} />
            <div className="field"><label>Role *</label><select value={staffForm.role} onChange={(e) => setStaffForm(v => ({...v, role:e.target.value, doctorId: e.target.value === "DOCTOR" ? v.doctorId : ""}))}><option>STAFF</option><option>DOCTOR</option>{isSuperAdmin && <option>CLINIC_ADMIN</option>}</select></div>
            <Field label="Clinic ID *" type="number" min="1" value={selectedClinicId} disabled />
            {staffForm.role === "DOCTOR" && <div className="field"><label>Doctor *</label><select value={staffForm.doctorId} onChange={(e) => setStaffForm(v => ({ ...v, doctorId: e.target.value }))} disabled={staffDoctorsLoading || staffDoctors.length === 0}><option value="">{staffDoctorsLoading ? "Loading doctors..." : staffDoctors.length === 0 ? "No doctors available" : "Select doctor"}</option>{staffDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></div>}
          </div>
        </Modal>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

function NavButton({ active, onClick, icon, children }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>{children}
    </button>
  );
}

function Field({ label, select, options = [], ...props }) {
  return (
    <div className="field">
      <label>{label}</label>
      {select ? (
        <select {...props} defaultValue={props.value === undefined ? options[0] : undefined}>
          {options.map((x) => <option key={x}>{x}</option>)}
        </select>
      ) : (
        <input {...props} />
      )}
    </div>
  );
}

function PageLoader() {
  return <div className="page-loader" role="status" aria-label="Loading dashboard"><div className="loader-spinner" /><span>Loading your clinic...</span></div>;
}

function DashboardHome({ go, openModal, clinicId, clinicName, token }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [weeklyAppointments, setWeeklyAppointments] = useState([]);
  const [weeklyAppointmentsLoading, setWeeklyAppointmentsLoading] = useState(true);
  const [weeklyAppointmentsError, setWeeklyAppointmentsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!token || !clinicId) {
        setDashboard(null);
        setLoading(false);
        setError(!token ? "Please log in to view the dashboard." : "Please select a clinic.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicDashboard(clinicId, token);
        if (!cancelled) setDashboard(result);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyAppointments() {
      if (!token || !clinicId) {
        setWeeklyAppointments([]);
        setWeeklyAppointmentsLoading(false);
        return;
      }

      try {
        setWeeklyAppointmentsLoading(true);
        setWeeklyAppointmentsError("");
        const result = await getClinicWeeklyAppointments(clinicId, token);
        if (!cancelled) setWeeklyAppointments(result);
      } catch (err) {
        if (!cancelled) {
          setWeeklyAppointments([]);
          setWeeklyAppointmentsError(err.message || "Unable to load weekly appointment statistics.");
        }
      } finally {
        if (!cancelled) setWeeklyAppointmentsLoading(false);
      }
    }

    loadWeeklyAppointments();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadHolidays() {
      if (!token || !clinicId) {
        setHolidays([]);
        setHolidaysLoading(false);
        return;
      }

      try {
        setHolidaysLoading(true);
        const result = await getClinicHolidays(clinicId, token);
        const holidayList = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.content)
              ? result.content
              : [];
        if (!cancelled) setHolidays(holidayList);
      } catch (err) {
        if (!cancelled) setHolidays([]);
      } finally {
        if (!cancelled) setHolidaysLoading(false);
      }
    }

    loadHolidays();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  const schedule = dashboard?.todaySchedule || [];
  const weeklyMax = Math.max(...weeklyAppointments.map((item) => Number(item.appointmentCount) || 0), 1);

  return (
    <section className="page active">
      <div className="welcome">
        <h2>Good morning 👋</h2>
        <p>Here is what&apos;s happening at {clinicName} today.</p>
      </div>

      {error && <div className="auth-error">{error}</div>}
      <div className="grid-4">
        <Kpi label="Today's Appointments" value={loading ? "..." : dashboard?.todayAppointments ?? 0} footer="For selected clinic" />
        <Kpi label="Pending Appointments" value={loading ? "..." : dashboard?.pendingAppointments ?? 0} footer="Needs attention" />
        <Kpi label="Total Patients" value={loading ? "..." : dashboard?.totalPatients ?? 0} footer="For selected clinic" />
        <Kpi label="Active Doctors" value={loading ? "..." : dashboard?.activeDoctors ?? 0} footer="Currently active" />
      </div>

      <div className="grid-2 mt">
        <div className="card">
          <div className="card-header">
            <div><h3>Today's Schedule</h3><p>Monday, 24 August 2026</p></div>
            <button className="btn btn-light" onClick={() => go("appointments")}>View all</button>
          </div>
          <div className="card-body">
            <div className="schedule-list">
              {loading && <p className="muted">Loading today&apos;s schedule...</p>}
              {!loading && schedule.length === 0 && <p className="muted">No appointments scheduled today.</p>}
              {!loading && schedule.map((appointment) => (
                <div className="schedule-row" key={appointment.id}>
                  <div className="time">{formatTime(appointment.startTime)}</div>
                  <div><div className="patient-name">{appointment.patientName}</div><div className="patient-meta">{appointment.serviceName} · {appointment.doctorName}</div></div>
                  <span className={`status ${appointment.status.toLowerCase()}`}>{appointment.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div><h3>Appointments This Week</h3><p>Number of appointments by day</p></div></div>
          <div className="card-body">
            {weeklyAppointmentsLoading && <p className="muted">Loading weekly appointments...</p>}
            {!weeklyAppointmentsLoading && weeklyAppointmentsError && <div className="auth-error">{weeklyAppointmentsError}</div>}
            {!weeklyAppointmentsLoading && !weeklyAppointmentsError && weeklyAppointments.length === 0 && <p className="muted">No weekly appointment data available.</p>}
            {!weeklyAppointmentsLoading && !weeklyAppointmentsError && weeklyAppointments.length > 0 && <>
            <div className="chart">
              {weeklyAppointments.map((item) => (
                <div className="bar-wrap" key={item.date || item.day} title={`${item.day}: ${item.appointmentCount || 0} appointments`}>
                  <div className="bar" style={{ height: `${Math.max(((Number(item.appointmentCount) || 0) / weeklyMax) * 100, item.appointmentCount ? 10 : 2)}%` }} />
                  <span className="bar-label">{item.day}</span>
                </div>
              ))}
            </div>
            <div className="chart-grid"><span>0</span><span>{Math.ceil(weeklyMax / 3)}</span><span>{Math.ceil((weeklyMax * 2) / 3)}</span><span>{weeklyMax}</span></div>
            </>}
          </div>
        </div>
      </div>

      <div className="grid-3 mt">
        <QuickCard title="Quick Actions" subtitle="Common clinic operations">
          <button className="btn btn-primary" onClick={() => openModal("appointment")}>+ Appointment</button>
          <button className="btn btn-light" onClick={() => go("patients")}>Patients</button>
          <button className="btn btn-light" onClick={() => go("doctors")}>Doctors</button>
        </QuickCard>
        <QuickCard title="Popular Services" subtitle="This month">
          <InfoLine left="Dental Consultation" right="142" />
          <InfoLine left="Health Consultation" right="96" />
          <InfoLine left="Teeth Cleaning" right="71" />
        </QuickCard>
        <div className="card">
          <div className="card-header"><div><h3>Clinic Holidays</h3><p>Upcoming clinic closures</p></div></div>
          <div className="card-body">
            <div className="holiday-list">
              {holidaysLoading && <p className="muted">Loading clinic holidays...</p>}
              {!holidaysLoading && holidays.filter((holiday) => holiday.active !== false).length === 0 && <p className="muted">No active clinic holidays.</p>}
              {!holidaysLoading && holidays.filter((holiday) => holiday.active !== false).map((holiday) => {
                const holidayDate = holiday.holiday_date || holiday.date || holiday.holidayDate;
                const dateObj = holidayDate ? new Date(`${holidayDate}T00:00:00`) : new Date();
                return (
                  <div className="holiday-row" key={holiday.id || `${holidayDate}-${holiday.name}`}>
                    <div className="holiday-date-box">
                      <span>{dateObj.toLocaleDateString("en-GB", { day: "2-digit" })}</span>
                      <small>{dateObj.toLocaleDateString("en-GB", { month: "short" })}</small>
                    </div>
                    <div className="holiday-info">
                      <strong>{holiday.name}</strong>
                      <span>{dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, footer }) {
  return (
    <div className="card kpi">
      <div className="kpi-top"><span className="kpi-label">{label}</span><span className="kpi-icon">◷</span></div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">{footer}</div>
    </div>
  );
}

function QuickCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="card-header"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
      <div className="card-body"><div className="quick-actions">{children}</div></div>
    </div>
  );
}

function InfoLine({ left, right, positive }) {
  return <div className="info-line"><span>{left}</span><strong className={positive ? "up" : ""}>{right}</strong></div>;
}

function AppointmentOverviewContent({ appointment, paymentDetails, paymentLoading, paymentError, canScheduleFollowUp = false, onScheduleFollowUp }) {
  const status = String(appointment.status || "").toUpperCase();
  const statusClass = status === "IN_CONSULTATION" ? "in_progress" : status.toLowerCase();
  const patientName = appointment.patientName || appointment.patient?.name || "Unknown patient";
  const patientPhone = appointment.phoneNo || appointment.patientPhone || appointment.patient?.phoneNo || "-";
  const appointmentDate = appointment.appointmentDate || appointment.date;
  const startTime = appointment.startTime || appointment.time;
  const paymentStatus = paymentDetails?.status || appointment.paymentStatus || "-";
  const paidAt = paymentDetails?.paidAt || appointment.paidAt;
  const amount = paymentDetails?.totalAmount ?? appointment.totalAmount ?? appointment.amount;
  const paymentMethod = paymentDetails?.paymentMethod || appointment.paymentMethod;
  const consultationStartedAt = appointment.inConsultationStartedAt || appointment.consultationStartedAt || appointment.inConsultationAt;
  const consultationCompletedAt = appointment.completedAt || appointment.consultationCompletedAt || (status === "COMPLETED" && typeof appointment.completed !== "boolean" ? appointment.completed : null);
  const consultationStartTime = consultationStartedAt ? new Date(consultationStartedAt).getTime() : NaN;
  const consultationEndTime = consultationCompletedAt ? new Date(consultationCompletedAt).getTime() : NaN;
  const consultationDurationMinutes = Number.isFinite(consultationStartTime) && Number.isFinite(consultationEndTime) && consultationEndTime >= consultationStartTime
    ? Math.floor((consultationEndTime - consultationStartTime) / 60000)
    : null;
  const consultationDuration = consultationDurationMinutes === null
    ? "-"
    : consultationDurationMinutes < 1
      ? "Less than 1 minute"
      : [
          Math.floor(consultationDurationMinutes / 60) ? `${Math.floor(consultationDurationMinutes / 60)} hr${Math.floor(consultationDurationMinutes / 60) === 1 ? "" : "s"}` : "",
          consultationDurationMinutes % 60 ? `${consultationDurationMinutes % 60} min` : "",
        ].filter(Boolean).join(" ");
  const statusOrder = ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED"];
  const currentStatusIndex = statusOrder.indexOf(status);
  const cancelledAt = appointment.CancelledAt || appointment.cancelledAt || appointment.canceledAt || appointment.cancellationAt || appointment.cancellationDate;
  const timelineSteps = [
    { label: "Booked", time: appointment.createdAt || appointment.confirmedAt || appointment.bookedAt, done: true },
    { label: "Confirmed", time: appointment.confirmedAt, done: currentStatusIndex >= 0 || Boolean(appointment.confirmedAt) },
    { label: "Checked In", time: appointment.checkedInAt, done: currentStatusIndex >= 1 || Boolean(appointment.checkedInAt) },
    { label: "Waiting", time: appointment.waitingAt, done: currentStatusIndex >= 2 || Boolean(appointment.waitingAt) },
    { label: "In Consultation", time: consultationStartedAt, done: currentStatusIndex >= 3 || Boolean(consultationStartedAt) },
    { label: "Completed", time: consultationCompletedAt, done: currentStatusIndex >= 4 || Boolean(consultationCompletedAt) },
  ];
  if (status === "CANCELLED") {
    timelineSteps.push({ label: "Cancelled", time: cancelledAt, done: true, cancelled: true });
  }
  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const formatAppointmentDate = (date, time) => {
    if (!date) return "-";
    const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);
    const dateLabel = Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    return `${dateLabel}${time ? ` · ${formatTime(time)}` : ""}`;
  };

  return <div className="appointment-overview">
    <div className="appointment-overview-summary">
      <span className={`status ${statusClass}`}>{appointment.status || "-"}</span>
      <div><small>Appointment ID</small><strong>#{appointment.id ?? appointment.appointmentId ?? "-"}</strong></div>
      <div className="appointment-overview-date"><span aria-hidden="true">▦</span><div><small>Date &amp; Time</small><strong>{formatAppointmentDate(appointmentDate, startTime)}</strong></div></div>
    </div>

    <div className="appointment-overview-grid">
      <section className="appointment-overview-section">
        <h4><span aria-hidden="true">♙</span>Patient Information</h4>
        <div className="appointment-patient-overview"><div className="appointment-overview-avatar">{initials({ firstName: patientName })}</div><div><strong>{patientName}</strong><span>{patientPhone}</span></div></div>
      </section>
      <section className="appointment-overview-section">
        <h4><span aria-hidden="true">✚</span>Consultation Details</h4>
        <div className="appointment-overview-detail"><span>Doctor</span><strong>{appointment.doctorName || appointment.doctor?.name || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Service</span><strong>{appointment.serviceName || appointment.service?.name || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Source</span><strong>{appointment.source || appointment.bookingSource || "-"}</strong></div>
      </section>
      <section className="appointment-overview-section">
        <div className="appointment-overview-section-heading"><h4><span aria-hidden="true">▤</span>Payment Information</h4><span className={`status ${String(paymentStatus).toLowerCase()}`}>{paymentStatus}</span></div>
        {paymentLoading && <p className="muted">Loading payment...</p>}
        {paymentError && <p className="muted">{paymentError}</p>}
        <div className="appointment-overview-detail"><span>Amount</span><strong>{amount == null ? "-" : formatCurrency(amount)}</strong></div>
        <div className="appointment-overview-detail"><span>Payment Method</span><strong>{paymentMethod || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Payment Status</span><strong>{paidAt ? `Paid on ${formatDateTime(paidAt)}` : paymentStatus}</strong></div>
      </section>
      <section className="appointment-overview-section">
        <h4><span aria-hidden="true">▦</span>Follow-up</h4>
        <div className="appointment-overview-detail"><span>Suggested Follow-up</span><strong>{appointment.suggestedFollowUpDate || "-"}</strong></div>
        {canScheduleFollowUp && onScheduleFollowUp && <button className="btn btn-outline appointment-follow-up-button" onClick={onScheduleFollowUp}>＋ Create follow-up appointment</button>}
      </section>
      <section className="appointment-overview-section">
        <h4><span aria-hidden="true">☷</span>Queue Information</h4>
        <div className="appointment-overview-detail"><span>Queue Number</span><strong>{appointment.queueNumber ?? appointment.queueCode ?? appointment.queueToken ?? "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Queue Token</span><strong>{appointment.queueToken || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Queue Status</span><strong>{appointment.status || "-"}</strong></div>
        {/* <div className="appointment-overview-detail"><span>Checked In At</span><strong>{formatDateTime(appointment.checkInTime || appointment.checkedInAt) || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Consultation Started At</span><strong>{formatDateTime(consultationStartedAt) || "-"}</strong></div>
        <div className="appointment-overview-detail"><span>Consultation Completed At</span><strong>{formatDateTime(consultationCompletedAt) || "-"}</strong></div> */}
        <div className="appointment-overview-detail"><span>Time Taken in Consultation</span><strong>{consultationDuration}</strong></div>
      </section>
    </div>

    <section className="appointment-overview-section appointment-timeline">
      <h4><span aria-hidden="true">◷</span>Appointment Timeline</h4>
      <div className={`appointment-timeline-steps ${status === "CANCELLED" ? "cancelled" : ""}`}>{timelineSteps.map((step) => <div className={`appointment-timeline-step ${step.done ? "done" : ""} ${step.cancelled ? "cancelled" : ""}`} key={step.label}><span className="appointment-timeline-marker">{step.cancelled ? "×" : step.done ? "✓" : ""}</span><strong>{step.label}</strong><small>{formatDateTime(step.time) || ""}</small></div>)}</div>
    </section>
  </div>;
}

function Appointments({ clinicId, token, userRole, userDoctorId, search, openModal, showToast }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [filterDoctors, setFilterDoctors] = useState([]);
  const [filterServices, setFilterServices] = useState([]);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState(null);
  const [cancelConfirmationId, setCancelConfirmationId] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [deletingAppointmentId, setDeletingAppointmentId] = useState(null);
  const [deleteConfirmationAppointment, setDeleteConfirmationAppointment] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [creatingNextAppointmentId, setCreatingNextAppointmentId] = useState(null);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [appointmentDetailsLoading, setAppointmentDetailsLoading] = useState(false);
  const [appointmentDetailsError, setAppointmentDetailsError] = useState("");
  const [appointmentPaymentDetails, setAppointmentPaymentDetails] = useState(null);
  const [appointmentPaymentLoading, setAppointmentPaymentLoading] = useState(false);
  const [appointmentPaymentError, setAppointmentPaymentError] = useState("");
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const isDoctor = String(userRole).toUpperCase() === "DOCTOR";
  const isSuperAdmin = String(userRole).toUpperCase() === "SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      if (!token || !clinicId) {
        setFilterDoctors([]);
        setFilterServices([]);
        return;
      }

      setDoctorId("");
      setServiceId("");
      try {
        const [doctors, services] = await Promise.all([
          getClinicDoctors(clinicId, token),
          getClinicServices(clinicId, token),
        ]);
        if (!cancelled) {
          setFilterDoctors(Array.isArray(doctors) ? doctors : []);
          setFilterServices(Array.isArray(services) ? services : []);
        }
      } catch {
        if (!cancelled) {
          setFilterDoctors([]);
          setFilterServices([]);
        }
      }
    }

    loadFilterOptions();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleSlots() {
      if (!scheduleModal || !token || !clinicId || !scheduleModal.doctorId || !scheduleModal.serviceId || !scheduleModal.appointmentDate) {
        setScheduleSlots([]);
        setScheduleSlotsLoading(false);
        return;
      }

      try {
        setScheduleSlotsLoading(true);
        setScheduleError("");
        const slots = await getClinicAvailableSlots(clinicId, scheduleModal.doctorId, scheduleModal.serviceId, scheduleModal.appointmentDate, token);
        if (!cancelled) setScheduleSlots(slots);
      } catch (err) {
        if (!cancelled) {
          setScheduleSlots([]);
          setScheduleError(err.message || "Unable to load available slots.");
        }
      } finally {
        if (!cancelled) setScheduleSlotsLoading(false);
      }
    }

    loadScheduleSlots();
    return () => { cancelled = true; };
  }, [scheduleModal, clinicId, token]);

  useEffect(() => {
    if (isDoctor) setDoctorId(userDoctorId ? String(userDoctorId) : "");
  }, [isDoctor, userDoctorId]);

  function handlePageChange(direction) {
    const nextPage = Math.max(0, page + direction);
    if (nextPage === page) return;
    setPage(nextPage);
  }

  function handlePageSizeChange(nextSize) {
    setPage(0);
    setPageSize(Number(nextSize) || 5);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAppointments() {
      if (!token || !clinicId) {
        setRows([]);
        setLoading(false);
        setError(!token ? "Please log in to view appointments." : "Please select a clinic.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicAppointments(clinicId, {
          from,
          to,
          doctorId: isDoctor ? userDoctorId : doctorId,
          serviceId,
          status,
          page,
          size: pageSize,
        }, token);
        if (!cancelled) {
          const items = Array.isArray(result) ? result : result?.items || [];
          const nextPagination = result?.pagination || null;
          setRows(items);
          setPagination(nextPagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load appointments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAppointments();
    return () => { cancelled = true; };
  }, [clinicId, token, from, to, doctorId, serviceId, status, isDoctor, userDoctorId, page, pageSize, refreshKey]);

  const filteredRows = rows.filter((appointment) => {
    const query = search.trim().toLowerCase();
    const patientQuery = patientSearch.trim().toLowerCase();
    const matchesGlobalSearch = !query || [appointment.patientName, appointment.phoneNo, appointment.patientPhone, appointment.serviceName, appointment.doctorName]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const matchesPatientSearch = !patientQuery || [appointment.patientName, appointment.phoneNo, appointment.patientPhone]
      .some((value) => String(value || "").toLowerCase().includes(patientQuery));
    return matchesGlobalSearch && matchesPatientSearch;
  });
  const currentPage = Number(pagination?.number ?? pagination?.pageNumber ?? page) || 0;
  const totalPages = Number(pagination?.totalPages) > 0 ? Number(pagination.totalPages) : null;
  const hasNextPage = totalPages !== null ? currentPage < totalPages - 1 : rows.length >= pageSize;
  function openPaymentDialog(appointment) {
    setPaymentAppointment(appointment);
  }

  async function openAppointmentDetails(appointmentId) {
    try {
      setAppointmentDetails(null);
      setAppointmentDetailsError("");
      setAppointmentPaymentDetails(null);
      setAppointmentPaymentError("");
      setAppointmentDetailsLoading(true);
      const result = await getClinicAppointments(clinicId, { appointmentId }, token);
      const details = Array.isArray(result) ? result[0] : result?.items?.[0] || result;
      if (!details) throw new Error("Appointment details were not returned.");
      setAppointmentDetails(details);
    } catch (err) {
      setAppointmentDetailsError(err.message || "Unable to load appointment details.");
    } finally {
      setAppointmentDetailsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAppointmentPaymentDetails() {
      if (!appointmentDetails?.id || !token) {
        setAppointmentPaymentDetails(null);
        return;
      }

      try {
        setAppointmentPaymentLoading(true);
        setAppointmentPaymentError("");
        const result = await getAppointmentPayment(appointmentDetails.id, token, clinicId);
        if (!cancelled) setAppointmentPaymentDetails(result);
      } catch (err) {
        if (!cancelled) setAppointmentPaymentError(err.message || "Unable to load payment information.");
      } finally {
        if (!cancelled) setAppointmentPaymentLoading(false);
      }
    }

    loadAppointmentPaymentDetails();
    return () => { cancelled = true; };
  }, [appointmentDetails?.id, clinicId, token]);

  function closeAppointmentDetails() {
    setAppointmentDetails(null);
    setAppointmentDetailsError("");
    setAppointmentPaymentDetails(null);
    setAppointmentPaymentError("");
  }

  function scheduleAppointmentFollowUp() {
    if (!appointmentDetails) return;
    const appointment = appointmentDetails;
    closeAppointmentDetails();
    handleCreateNextAppointment(appointment);
  }

  function handlePaymentCollected(result) {
      setRows((items) => items.map((item) => String(item.id) === String(paymentAppointment.id)
        ? { ...item, paymentStatus: result?.status || item.paymentStatus }
        : item));
  }

  function handleCancelAppointment(appointmentId) {
    if (!token) {
      setError("Please log in to cancel appointments.");
      return;
    }

    setCancelError("");
    setCancelConfirmationId(appointmentId);
  }

  async function handleDeleteAppointment(appointment) {
    if (!isSuperAdmin || !token || !clinicId) return;
    setDeleteError("");
    setDeleteConfirmationAppointment(appointment);
  }

  async function confirmDeleteAppointment() {
    const appointment = deleteConfirmationAppointment;
    if (!isSuperAdmin || !token || !clinicId || !appointment) return;

    try {
      setDeletingAppointmentId(appointment.id);
      setDeleteError("");
      await deleteClinicAppointment(clinicId, appointment.id, token);
      setRows((items) => items.filter((item) => String(item.id) !== String(appointment.id)));
      if (String(appointmentDetails?.id) === String(appointment.id)) closeAppointmentDetails();
      setDeleteConfirmationAppointment(null);
      showToast("Appointment deleted successfully");
      if (rows.length === 1 && page > 0) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setRefreshKey((key) => key + 1);
      }
    } catch (err) {
      setDeleteError(err.message || "Unable to delete appointment.");
    } finally {
      setDeletingAppointmentId(null);
    }
  }

  async function confirmCancelAppointment() {
    const appointmentId = cancelConfirmationId;
    if (!appointmentId) return;

    try {
      setCancelingAppointmentId(appointmentId);
      setCancelError("");
      const updatedAppointment = await cancelAppointment(appointmentId, token, clinicId);
      setRows((items) => items.map((appointment) => appointment.id === appointmentId
        ? { ...appointment, ...(updatedAppointment || {}), status: updatedAppointment?.status || "CANCELLED" }
        : appointment));
      setCancelConfirmationId(null);
      showToast("Appointment cancelled");
    } catch (err) {
      setCancelError(err.message || "Unable to cancel appointment.");
    } finally {
      setCancelingAppointmentId(null);
    }
  }

  async function handleCreateNextAppointment(appointment) {
    if (!token || !appointment?.id) {
      setError("Please log in to create the next appointment.");
      return;
    }

    setScheduleError("");
    setScheduleSlots([]);
    setScheduleModal({
      mode: "next",
      appointment,
      doctorId: appointment.doctorId,
      serviceId: appointment.serviceId,
      appointmentDate: appointment.suggestedFollowUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      startTime: "",
      endTime: "",
      reason: "",
    });
  }

  async function handleRescheduleAppointment(appointment) {
    if (!token || !appointment?.id) {
      setError("Please log in to reschedule appointments.");
      return;
    }

    setScheduleError("");
    setScheduleSlots([]);
    setScheduleModal({
      mode: "reschedule",
      appointment,
      doctorId: appointment.doctorId,
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate || new Date().toISOString().slice(0, 10),
      startTime: "",
      endTime: "",
      reason: "Patient requested a different time",
    });
  }

  async function handleScheduleSave() {
    if (!scheduleModal?.startTime || !scheduleModal.endTime) {
      setScheduleError("Please select an available slot.");
      return;
    }

    const appointmentId = scheduleModal.appointment.id;
    try {
      setScheduleError("");
      if (scheduleModal.mode === "next") {
        setCreatingNextAppointmentId(appointmentId);
        const nextAppointment = await createNextAppointment(clinicId,appointmentId, {
          appointmentDate: scheduleModal.appointmentDate,
          startTime: scheduleModal.startTime,
          endTime: scheduleModal.endTime,
        }, token);
        setRows((items) => items.map((item) => item.id === appointmentId
          ? { ...item, ...(nextAppointment || {}), followUpAppointmentId: nextAppointment?.id || item.followUpAppointmentId }
          : item));
        showToast("Next appointment created");
      } else {
        setReschedulingAppointmentId(appointmentId);
        const updatedAppointment = await rescheduleAppointment(appointmentId, {
          appointmentDate: scheduleModal.appointmentDate,
          startTime: scheduleModal.startTime,
          endTime: scheduleModal.endTime,
          reason: scheduleModal.reason || "Patient requested a different time",
        }, token, clinicId);
        setRows((items) => items.map((item) => item.id === appointmentId
          ? { ...item, ...(updatedAppointment || {}), appointmentDate: updatedAppointment?.appointmentDate || scheduleModal.appointmentDate, startTime: updatedAppointment?.startTime || scheduleModal.startTime, endTime: updatedAppointment?.endTime || scheduleModal.endTime }
          : item));
        showToast("Appointment rescheduled");
      }
      setScheduleModal(null);
    } catch (err) {
      setScheduleError(err.message || "Unable to save appointment schedule.");
    } finally {
      setCreatingNextAppointmentId(null);
      setReschedulingAppointmentId(null);
    }
  }

  const canCancelAppointment = (appointment) => String(appointment.status || "").toUpperCase() !== "CANCELLED";
  const canMarkNoShow = (appointment) => String(appointment.status || "").toUpperCase() === "CHECKED_IN";
  const canCreateNextAppointment = (appointment) => String(appointment.status || "").toUpperCase() === "COMPLETED" && !appointment.followUpAppointmentId;
  const canScheduleSuggestedFollowUp = (appointment) => canCreateNextAppointment(appointment) && Boolean(appointment.suggestedFollowUpDate);

  return <>
  <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Appointments</h3><p>Manage and monitor clinic appointments</p></div><button className="btn btn-primary" onClick={() => openModal("appointment")}>+ New Appointment</button></div>
    <div className="filters">
      <input className="control" type="search" placeholder="Search patient name or phone" value={patientSearch} onChange={(e) => { setPage(0); setPatientSearch(e.target.value); }} />
      <input className="control" type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} />
      <input className="control" type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} />
      {!isDoctor && <select className="control" value={doctorId} onChange={(e) => { setPage(0); setDoctorId(e.target.value); }}><option value="">All Doctors</option>{filterDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name || `Doctor ${doctor.id}`}</option>)}</select>}
      <select className="control" value={serviceId} onChange={(e) => { setPage(0); setServiceId(e.target.value); }}><option value="">All Services</option>{filterServices.map((service) => <option key={service.id} value={service.id}>{service.name || `Service ${service.id}`}</option>)}</select>
      <select className="control" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}><option value="">All Status</option><option value="CONFIRMED">Confirmed</option><option value="CHECKED_IN">Checked In</option><option value="WAITING">Waiting</option><option value="IN_CONSULTATION">In Consultation</option><option value="COMPLETED">Completed</option><option value="NO_SHOW">No Show</option><option value="CANCELLED">Cancelled</option></select>
    </div>
    {error && <div className="auth-error">{error}</div>}
    {loading && <div className="card-body"><p className="muted">Loading appointments...</p></div>}
    {!loading && !error && filteredRows.length === 0 && <div className="card-body"><p className="muted">No appointments found.</p></div>}
    {!loading && !error && filteredRows.length > 0 && <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Service</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Payment</th><th>Follow-Up</th><th>Action</th></tr></thead><tbody>
      {filteredRows.map((appointment) => {
        const isCancelling = cancelingAppointmentId === appointment.id;
        const isDeleting = deletingAppointmentId === appointment.id;
        const isCreatingNext = creatingNextAppointmentId === appointment.id;
        const isRescheduling = reschedulingAppointmentId === appointment.id;
        const appointmentStatus = String(appointment.status || "").toUpperCase();
        const statusClass = appointmentStatus === "IN_CONSULTATION" ? "in_progress" : appointmentStatus.toLowerCase();
        const paymentStatus = String(appointment.paymentStatus || "-").toUpperCase();
        const paymentStatusClass = { UNPAID: "pending", PARTIAL: "in_progress", PAID: "completed", REFUNDED: "cancelled" }[paymentStatus] || "";
        const canCollectPayment = appointmentStatus === "COMPLETED" && ["UNPAID", "PARTIAL"].includes(paymentStatus);

        return <tr key={appointment.id}>
          <td><div className="patient-cell"><div className="small-avatar">{initials({ firstName: appointment.patientName })}</div><div><strong>{appointment.patientName || "-"}</strong><span>{appointment.phoneNo || appointment.patientPhone || "-"}</span></div></div></td>
          <td>{appointment.serviceName || appointment.service?.name || "-"}</td>
          <td>{appointment.doctorName || appointment.doctor?.name || "-"}</td>
          <td>{appointment.appointmentDate || appointment.date || "-"}</td>
          <td>{formatTime(appointment.startTime || appointment.time)}</td>
          <td><span className={`status ${statusClass}`}>{appointment.status || "-"}</span></td>
          <td>{canCollectPayment
            ? <button type="button" className={`status ${paymentStatusClass}`} onClick={() => openPaymentDialog(appointment)}>{paymentStatus}</button>
            : <span className={`status ${paymentStatusClass}`}>{paymentStatus}</span>}
          </td>
          <td>{appointment.suggestedFollowUpDate || "-"}</td>
          <td><div className="row-actions">
            <button className="btn btn-light icon-btn" title="View appointment details" aria-label="View appointment details" onClick={() => openAppointmentDetails(appointment.id)}>◉</button>
            {canCreateNextAppointment(appointment) && <button className="btn btn-light icon-btn" title={isCreatingNext ? "Creating..." : "Next Visit"} disabled={isCreatingNext} onClick={() => handleCreateNextAppointment(appointment)} aria-label={isCreatingNext ? "Creating..." : "Next Visit"}>{isCreatingNext ? "…" : "+"}</button>}
            {appointmentStatus !== "COMPLETED" && <button className="btn btn-light icon-btn" title={isRescheduling ? "Rescheduling..." : "Reschedule"} disabled={isRescheduling} onClick={() => handleRescheduleAppointment(appointment)} aria-label={isRescheduling ? "Rescheduling..." : "Reschedule"}>{isRescheduling ? "…" : "↺"}</button>}
            {canCancelAppointment(appointment) && <button className="btn btn-danger icon-btn" title={isCancelling ? "Cancelling..." : "Cancel"} disabled={isCancelling} onClick={() => handleCancelAppointment(appointment.id)} aria-label={isCancelling ? "Cancelling..." : "Cancel"}>{isCancelling ? "…" : "✕"}</button>}
            {isSuperAdmin && <button type="button" className="btn btn-danger icon-btn" title={isDeleting ? "Deleting..." : "Delete appointment"} disabled={isDeleting} onClick={() => handleDeleteAppointment(appointment)} aria-label={isDeleting ? "Deleting appointment" : "Delete appointment"}>{isDeleting ? "…" : <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h14M8 5V3h4v2m3 0-.7 11H5.7L5 5m3 3v5m4-5v5" /></svg>}</button>}
          </div></td>
        </tr>;
      })}
    </tbody></table></div>}
    {!loading && !error && <div className="pagination">
      <button className="btn btn-light" disabled={page === 0} onClick={() => handlePageChange(-1)}>Previous</button>
      <span className="pagination-meta">Page {Math.max(currentPage + 1, 1)}{totalPages === null ? "" : ` of ${totalPages}`}</span>
      <div className="pagination-actions">
        <select className="control" value={pageSize} onChange={(e) => handlePageSizeChange(e.target.value)} style={{ maxWidth: 90 }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select>
        <button className="btn btn-light" disabled={!hasNextPage} onClick={() => handlePageChange(1)}>Next</button>
      </div>
    </div>}
  </div></section>
  {(appointmentDetails || appointmentDetailsLoading || appointmentDetailsError) && <Modal
    title="Appointment Overview"
    className="appointment-overview-modal"
    onClose={closeAppointmentDetails}
    onSave={closeAppointmentDetails}
    saveLabel="Close"
    saveDisabled={appointmentDetailsLoading}
  >
    {appointmentDetailsLoading && <p className="muted">Loading appointment details...</p>}
    {appointmentDetailsError && <div className="auth-error">{appointmentDetailsError}</div>}
    {appointmentDetails && <AppointmentOverviewContent
      appointment={appointmentDetails}
      paymentDetails={appointmentPaymentDetails}
      paymentLoading={appointmentPaymentLoading}
      paymentError={appointmentPaymentError}
      canScheduleFollowUp={canScheduleSuggestedFollowUp(appointmentDetails)}
      onScheduleFollowUp={scheduleAppointmentFollowUp}
    />}
  </Modal>}
  {cancelConfirmationId && <Modal
    title="Cancel Appointment"
    onClose={() => { setCancelConfirmationId(null); setCancelError(""); }}
    onSave={confirmCancelAppointment}
    saveLabel={cancelingAppointmentId ? "Cancelling..." : "Cancel Appointment"}
    saveDisabled={Boolean(cancelingAppointmentId)}
    saveClassName="btn btn-danger"
  >
    {cancelError && <div className="auth-error">{cancelError}</div>}
    <p>Are you sure you want to cancel this appointment? This action cannot be undone.</p>
  </Modal>}
  {deleteConfirmationAppointment && <Modal
    title="Delete Appointment"
    onClose={() => {
      if (deletingAppointmentId === null) {
        setDeleteConfirmationAppointment(null);
        setDeleteError("");
      }
    }}
    onSave={confirmDeleteAppointment}
    saveLabel={deletingAppointmentId === deleteConfirmationAppointment.id ? "Deleting..." : "Delete Appointment"}
    saveDisabled={deletingAppointmentId !== null}
    saveClassName="btn btn-danger"
  >
    {deleteError && <div className="auth-error" role="alert">{deleteError}</div>}
    <p>Are you sure you want to delete appointment #{deleteConfirmationAppointment.id}? This action cannot be undone.</p>
  </Modal>}
  {scheduleModal && <Modal
    title={scheduleModal.mode === "next" ? "Create Next Visit" : "Reschedule Appointment"}
    onClose={() => setScheduleModal(null)}
    onSave={handleScheduleSave}
    saveLabel={scheduleModal.mode === "next" ? "Create Appointment" : "Reschedule"}
    saveDisabled={scheduleSlotsLoading || !scheduleModal.startTime}
  >
    <div className="form-grid">
      <Field label="Patient" value={scheduleModal.appointment.patientName || "-"} disabled />
      <Field label="Date *" type="date" value={scheduleModal.appointmentDate} onChange={(e) => setScheduleModal((value) => ({ ...value, appointmentDate: e.target.value, startTime: "", endTime: "" }))} />
      <div className="field">
        <label>Available Slot *</label>
        <select value={scheduleModal.startTime} onChange={(e) => {
          const startTime = normalizeTime(e.target.value);
          const duration = Number(scheduleModal.appointment.durationMinutes || 30);
          setScheduleModal((value) => ({ ...value, startTime, endTime: addMinutesToTime(startTime, duration) }));
        }} disabled={scheduleSlotsLoading || scheduleSlots.length === 0}>
          <option value="">{scheduleSlotsLoading ? "Loading available slots..." : scheduleSlots.length === 0 ? "No slots available" : "Select available slot"}</option>
          {scheduleSlots.map((slot) => <option key={slot} value={normalizeTime(slot)}>{formatTime(normalizeTime(slot))}</option>)}
        </select>
      </div>
      <Field label="End Time *" type="time" value={scheduleModal.endTime} disabled />
      {scheduleModal.mode === "reschedule" && <Field label="Reason" value={scheduleModal.reason} onChange={(e) => setScheduleModal((value) => ({ ...value, reason: e.target.value }))} />}
    </div>
    {scheduleError && <div className="auth-error" style={{ marginTop: 12 }}>{scheduleError}</div>}
  </Modal>}
  {paymentAppointment && <AppointmentPaymentDialog
    appointment={paymentAppointment}
    clinicId={clinicId}
    token={token}
    onClose={() => setPaymentAppointment(null)}
    onPaymentCollected={handlePaymentCollected}
    showToast={showToast}
  />}
  </>;
}

function Patients({ openModal, onEdit, showToast, clinicId, clinicName, token }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [qrPatient, setQrPatient] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrTemplateBlob, setQrTemplateBlob] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  const patientQrDisplayId = (() => {
    if (!qrPatient) return "PT-0000";
    const rawId = qrPatient.patientCode || qrPatient.patientId || qrPatient.registrationNumber || qrPatient.id;
    if (!rawId && rawId !== 0) return "PT-0000";
    if (typeof rawId === "string") {
      const normalized = rawId.trim();
      if (normalized.toUpperCase().startsWith("PT-")) return normalized;
      if (normalized.length > 0) return normalized;
    }
    return `PT-${new Date().getFullYear()}-${String(rawId).padStart(4, "0")}`;
  })();

  const patientQrClinicName = clinicName || qrPatient?.clinicName || "Clinic";

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      if (!token || !clinicId) {
        setPatients([]);
        setLoading(false);
        setError(!token ? "Please log in to view patients." : "Please select a clinic.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicPatients(clinicId, { page, size: pageSize }, token);
        if (!cancelled) {
          const items = Array.isArray(result) ? result : result?.items || [];
          const nextPagination = result?.pagination || null;
          setPatients(items);
          setPagination(nextPagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load patients.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPatients();
    return () => { cancelled = true; };
  }, [clinicId, token, page, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function loadPatientHistory() {
      if (!selectedPatient || !token || !clinicId) return;

      try {
        setHistoryLoading(true);
        setHistoryError("");
        const result = await getPatientAppointmentHistory(clinicId, selectedPatient.id, { page: historyPage, size: 10 }, token);
        if (!cancelled) {
          setHistory(result.items || []);
          setHistoryPagination(result.pagination || null);
        }
      } catch (err) {
        if (!cancelled) setHistoryError(err.message || "Unable to load patient history.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadPatientHistory();
    return () => { cancelled = true; };
  }, [clinicId, token, selectedPatient, historyPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadPatientQr() {
      if (!qrPatient || !token || !clinicId) {
        setQrImageUrl("");
        setQrError("");
        return;
      }

      try {
        setQrLoading(true);
        setQrError("");
        const response = await generatePatientQr(clinicId, qrPatient.id, token);
        const qrImageBase64 = response?.data?.qrImageBase64;
        if (!qrImageBase64) throw new Error("The QR code image was not returned by the server.");
        if (!cancelled) setQrImageUrl(`data:image/png;base64,${qrImageBase64}`);
      } catch (err) {
        if (!cancelled) setQrError(err.message || "Unable to load patient QR code.");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    }

    loadPatientQr();
    return () => {
      cancelled = true;
    };
  }, [clinicId, qrPatient, token]);

  useEffect(() => {
    let cancelled = false;
    setQrTemplateBlob(null);
    if (!qrImageUrl || !qrPatient) return () => { cancelled = true; };

    createPatientQrTemplateBlob()
      .then((blob) => {
        if (!cancelled) setQrTemplateBlob(blob);
      })
      .catch((err) => {
        if (!cancelled) setQrError(err.message || "Unable to prepare the patient QR template.");
      });

    return () => { cancelled = true; };
  }, [qrImageUrl, qrPatient, patientQrClinicName, patientQrDisplayId]);

  const filteredPatients = patients.filter((patient) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || patient.name?.toLowerCase().includes(query) || patient.phoneNo?.toLowerCase().includes(query);
  });

  function handlePageChange(direction) {
    const nextPage = Math.max(0, page + direction);
    if (nextPage === page) return;
    setPage(nextPage);
  }

  function handlePageSizeChange(nextSize) {
    setPage(0);
    setPageSize(Number(nextSize) || 5);
  }

  async function createPatientQrTemplateBlob() {
    if (!qrImageUrl || !qrPatient) throw new Error("Wait for the patient QR code to finish loading.");

    const qrImage = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load the patient QR image."));
      image.src = qrImageUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 960;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create the patient QR template.");

    const roundedRect = (x, y, width, height, radius, fill, stroke, lineWidth = 1) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke) {
        context.lineWidth = lineWidth;
        context.strokeStyle = stroke;
        context.stroke();
      }
    };
    const drawClinicIcon = () => {
      context.save();
      context.strokeStyle = "#376c53";
      context.lineWidth = 9;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.moveTo(586, 166);
      context.lineTo(586, 112);
      context.lineTo(633, 88);
      context.lineTo(633, 166);
      context.moveTo(633, 166);
      context.lineTo(633, 106);
      context.lineTo(680, 83);
      context.lineTo(680, 166);
      context.moveTo(576, 166);
      context.lineTo(696, 166);
      context.stroke();
      context.lineWidth = 5;
      [[602, 127], [619, 127], [602, 145], [619, 145], [648, 119], [666, 119], [648, 140], [666, 140]].forEach(([x, y]) => {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + 5, y);
        context.stroke();
      });
      context.restore();
    };

    const background = context.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#edf5f0");
    background.addColorStop(1, "#e7efeb");
    roundedRect(8, 8, 984, 944, 48, background, "#2b4f42", 8);

    roundedRect(32, 32, 936, 170, 42, "#e6f1eb");
    context.fillStyle = "#c8e2d4";
    context.beginPath();
    context.arc(112, 116, 52, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#245b43";
    context.beginPath();
    context.arc(112, 99, 17, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(80, 150);
    context.lineTo(80, 137);
    context.quadraticCurveTo(80, 120, 98, 120);
    context.lineTo(126, 120);
    context.quadraticCurveTo(144, 120, 144, 137);
    context.lineTo(144, 150);
    context.closePath();
    context.fill();

    context.fillStyle = "#58716e";
    context.font = "700 18px Arial, sans-serif";
    context.letterSpacing = "3px";
    context.fillText("PATIENT", 184, 72);
    context.letterSpacing = "0px";
    const patientName = String(qrPatient.name || "Patient");
    let nameSize = 44;
    context.font = `700 ${nameSize}px Arial, sans-serif`;
    while (context.measureText(patientName).width > 360 && nameSize > 28) {
      nameSize -= 1;
      context.font = `700 ${nameSize}px Arial, sans-serif`;
    }
    context.fillStyle = "#1e433b";
    context.fillText(patientName, 184, 121);
    context.fillStyle = "#334b44";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(`ID: ${patientQrDisplayId}`, 184, 158);

    context.strokeStyle = "rgba(35,68,60,.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(568, 72);
    context.lineTo(568, 163);
    context.stroke();
    drawClinicIcon();
    context.fillStyle = "#1e433b";
    const clinicName = String(patientQrClinicName || "Clinic");
    let clinicNameSize = 24;
    context.font = `700 ${clinicNameSize}px Arial, sans-serif`;
    while (context.measureText(clinicName).width > 238 && clinicNameSize > 16) {
      clinicNameSize -= 1;
      context.font = `700 ${clinicNameSize}px Arial, sans-serif`;
    }
    context.fillText(clinicName, 712, 137);

    roundedRect(220, 224, 560, 560, 42, "#edf7f4", "rgba(36,78,67,.9)", 8);
    roundedRect(244, 248, 512, 512, 28, "#ffffff");
    context.drawImage(qrImage, 270, 274, 460, 460);

    const footerGradient = context.createLinearGradient(0, 804, 0, 944);
    footerGradient.addColorStop(0, "#b2d0c5");
    footerGradient.addColorStop(1, "#7ea996");
    roundedRect(10, 804, 980, 144, 0, footerGradient);
    roundedRect(54, 838, 78, 78, 20, "rgba(255,255,255,.3)", "rgba(21,57,49,.15)", 2);
    context.fillStyle = "#376c53";
    roundedRect(76, 853, 34, 48, 6, "#376c53");
    roundedRect(80, 859, 26, 34, 2, "#dbe8e0");
    context.fillStyle = "#245b43";
    context.beginPath();
    context.arc(93, 897, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#12342f";
    context.font = "700 34px Arial, sans-serif";
    context.fillText("Scan this QR code", 162, 873);
    context.fillStyle = "#1d3a35";
    context.font = "21px Arial, sans-serif";
    context.fillText("to book your appointments and more.", 162, 909);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create the patient QR template."));
      }, "image/png");
    });
  }

  async function handlePatientQrPrint() {
    if (!qrImageUrl || qrLoading) {
      setQrError("Wait for the patient QR code to finish loading before printing.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setQrError("Allow pop-ups to print the patient QR code.");
      return;
    }

    try {
      const templateBlob = await createPatientQrTemplateBlob();
      const imageUrl = URL.createObjectURL(templateBlob);
      printWindow.document.title = `${qrPatient.name || "Patient"} QR Code`;
      printWindow.document.body.innerHTML = "";
      printWindow.document.body.style.cssText = "margin:0;padding:16px;display:grid;place-items:center;background:#fff";
      const style = printWindow.document.createElement("style");
      style.textContent = "@page{margin:10mm}img{display:block;width:min(100%,180mm);height:auto;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{padding:0!important}}";
      const image = printWindow.document.createElement("img");
      image.alt = `Patient QR template for ${qrPatient.name || "patient"}`;
      image.onload = () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(imageUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        printWindow.close();
        setQrError("Unable to load the patient QR template for printing.");
      };
      printWindow.document.head.appendChild(style);
      printWindow.document.body.appendChild(image);
      image.src = imageUrl;
    } catch (err) {
      printWindow.close();
      setQrError(err.message || "Unable to create the patient QR template for printing.");
    }
  }

  async function handlePatientQrShare() {
    if (!qrTemplateBlob) {
      setQrError("Wait for the patient QR template to finish preparing.");
      return;
    }

    try {
      const fileName = `patient-${qrPatient.id}-qr-template.png`;
      const downloadUrl = URL.createObjectURL(qrTemplateBlob);
      try {
        if (typeof File !== "undefined" && navigator.share) {
          const file = new File([qrTemplateBlob], fileName, { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${qrPatient.name || "Patient"} QR Code`,
              text: `Patient QR code for ${qrPatient.name || "patient"} at ${patientQrClinicName}.`,
            });
            return;
          }
        }

        if (navigator.clipboard?.write && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": qrTemplateBlob })]);
          showToast("Patient QR template copied. Paste it into a message to share.");
          return;
        }

        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = fileName;
        downloadLink.click();
        showToast("Patient QR template downloaded so you can share it.");
      } finally {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setQrError(err.message || "Unable to share the patient QR template.");
      }
    }
  }

  return <>
  <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Patients</h3><p>Patients associated with this clinic</p></div><button className="btn btn-primary" onClick={() => { onEdit(null); openModal("patient"); }}>+ Add Patient</button></div>
    <div className="filters"><input className="control" style={{minWidth:240}} placeholder="Search by name or WhatsApp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><button className="btn btn-outline" onClick={() => showToast(`${filteredPatients.length} patients found`)}>Search</button></div>
    <div className="card-body">
      {loading && <p className="muted">Loading patients...</p>}
      {!loading && error && <div className="auth-error">{error}</div>}
      {!loading && !error && filteredPatients.length === 0 && <p className="muted">No patients found for this clinic.</p>}
    </div>
    {!loading && !error && filteredPatients.length > 0 && <div className="table-wrap"><table><thead><tr><th>ID</th><th>Patient</th><th>WhatsApp</th><th>Gender</th><th>Source</th><th>Profile Status</th><th>Clinic ID</th><th>Action</th></tr></thead><tbody>
      {filteredPatients.map((patient) => <tr key={patient.id}><td>{patient.id}</td><td><div className="patient-cell"><div className="small-avatar">{initials({ firstName: patient.name })}</div><div><strong>{patient.name}</strong><span>Patient</span></div></div></td><td>{patient.phoneNo}</td><td>{patient.gender || "-"}</td><td>{patient.source || "-"}</td><td>{patient.patientProfileStatus || "-"}</td><td>{patient.clinicId}</td><td><div className="row-actions"><button className="btn btn-light icon-btn" title="Edit patient" aria-label="Edit patient" onClick={() => onEdit(patient)}>✎</button><button className="btn btn-light icon-btn" title="View patient QR code" aria-label="View patient QR code" onClick={() => setQrPatient(patient)}>▦</button><button className="btn btn-light icon-btn" title="View patient history" aria-label="View patient history" onClick={() => { setSelectedPatient(patient); setHistoryPage(0); setHistory([]); setHistoryPagination(null); setHistoryError(""); }}>👁</button></div></td></tr>)}
    </tbody></table></div>}
    {!loading && !error && <div className="pagination">
      <button className="btn btn-light" disabled={page === 0} onClick={() => handlePageChange(-1)}>Previous</button>
      <span className="pagination-meta">Page {Math.max((pagination?.number ?? page) + 1, 1)} of {Math.max(pagination?.totalPages || 1, 1)}</span>
      <div className="pagination-actions">
        <select className="control" value={pageSize} onChange={(e) => handlePageSizeChange(e.target.value)} style={{ maxWidth: 90 }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select>
        <button className="btn btn-light" disabled={!pagination || page >= (pagination.totalPages || 1) - 1} onClick={() => handlePageChange(1)}>Next</button>
      </div>
    </div>}
  </div></section>
  {selectedPatient && <Modal title={`${selectedPatient.name} - Appointment History`} onClose={() => setSelectedPatient(null)} onSave={() => setSelectedPatient(null)} saveLabel="Close" saveDisabled={false}>
    <div className="patient-cell" style={{ marginBottom: 16 }}><div className="small-avatar">{initials({ firstName: selectedPatient.name })}</div><div><strong>{selectedPatient.name}</strong><span>{selectedPatient.phoneNo || "-"}</span></div></div>
    {historyLoading && <p className="muted">Loading appointment history...</p>}
    {!historyLoading && historyError && <div className="auth-error">{historyError}</div>}
    {!historyLoading && !historyError && history.length === 0 && <p className="muted">No appointment history found.</p>}
    {!historyLoading && !historyError && history.length > 0 && <div className="table-wrap"><table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Service</th><th>Status</th><th>Follow-Up</th></tr></thead><tbody>{history.map((appointment) => <tr key={appointment.id}><td>{appointment.appointmentDate || "-"}</td><td>{formatTime(appointment.startTime)}</td><td>{appointment.doctorName || "-"}</td><td>{appointment.serviceName || "-"}</td><td><span className={`status ${String(appointment.status || "").toLowerCase()}`}>{appointment.status || "-"}</span></td><td>{appointment.suggestedFollowUpDate || "-"}</td></tr>)}</tbody></table></div>}
    {!historyLoading && !historyError && <div className="pagination"><button className="btn btn-light" disabled={historyPage === 0} onClick={() => setHistoryPage((value) => Math.max(0, value - 1))}>Previous</button><span className="pagination-meta">Page {historyPage + 1} of {Math.max(historyPagination?.totalPages || 1, 1)}</span><button className="btn btn-light" disabled={!historyPagination || historyPage >= (historyPagination.totalPages || 1) - 1} onClick={() => setHistoryPage((value) => value + 1)}>Next</button></div>}
  </Modal>}
  {qrPatient && <div className="patient-qr-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget) setQrPatient(null);
  }}>
    <div className="patient-qr-card">
      <button className="patient-qr-close" type="button" aria-label="Close patient QR" onClick={() => setQrPatient(null)}>×</button>
      <div className="patient-qr-summary">
        <div className="patient-qr-patient-info">
          <div className="patient-qr-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
            </svg>
          </div>
          <div className="patient-qr-summary-copy">
            <span>PATIENT</span>
            <strong className="patient-qr-name">{qrPatient.name}</strong>
            <span className="patient-qr-id">ID: {patientQrDisplayId}</span>
          </div>
        </div>
        <div className="patient-qr-clinic-info">
          <svg className="patient-qr-clinic-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 21V9l5-3v15M8 21V4l8-2v19M16 21v-9l5-3v12M1 21h22" />
            <path d="M11 7h2m-2 4h2m-2 4h2M5 12h1m13 1h1" />
          </svg>
          <div className="patient-qr-summary-copy">
            <strong className="patient-qr-clinic-name">{patientQrClinicName}</strong>
            {/* <span>CLINIC ID</span> */}
            {/* <strong className="patient-qr-clinic-id">{clinicId}</strong> */}
          </div>
        </div>
      </div>

      <div className="patient-qr-qr-panel">
        {qrLoading && <p className="muted patient-qr-status">Loading QR code...</p>}
        {qrError && <div className="auth-error patient-qr-status">{qrError}</div>}
        {qrImageUrl && <div className="patient-qr-code-wrap">
          <img src={qrImageUrl} alt={`QR code for ${qrPatient.name}`} />
        </div>}
      </div>

      <div className="patient-qr-footer">
        <div className="patient-qr-phone-icon">📱</div>
        <div>
          <strong>Scan this QR code</strong>
          <span>to book your appointments and more.</span>
        </div>
      </div>
      {qrImageUrl && <div className="patient-qr-actions">
        <button type="button" className="btn btn-outline" onClick={handlePatientQrPrint} disabled={qrLoading}>Print</button>
        <button type="button" className="btn btn-primary" onClick={handlePatientQrShare} disabled={qrLoading || !qrTemplateBlob}>Share</button>
      </div>}
    </div>
  </div>}
  </>;
}

function ReceptionDesk({ clinicId, clinicName, token, search, openModal, showToast, onUpdatePatient }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  });
  const [activeTab, setActiveTab] = useState("ALL");
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [receptionDoctors, setReceptionDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [viewingAppointment, setViewingAppointment] = useState(null);
  const [viewingAppointmentDetails, setViewingAppointmentDetails] = useState(null);
  const [viewingAppointmentLoading, setViewingAppointmentLoading] = useState(false);
  const [viewingAppointmentError, setViewingAppointmentError] = useState("");
  const [viewingPaymentDetails, setViewingPaymentDetails] = useState(null);
  const [viewingPaymentLoading, setViewingPaymentLoading] = useState(false);
  const [viewingPaymentError, setViewingPaymentError] = useState("");
  const [followUpSchedule, setFollowUpSchedule] = useState(null);
  const [followUpSlots, setFollowUpSlots] = useState([]);
  const [followUpSlotsLoading, setFollowUpSlotsLoading] = useState(false);
  const [followUpScheduleError, setFollowUpScheduleError] = useState("");
  const [creatingFollowUpAppointment, setCreatingFollowUpAppointment] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrScanValue, setQrScanValue] = useState("");
  const [qrAppointment, setQrAppointment] = useState(null);
  const [qrScanLoading, setQrScanLoading] = useState(false);
  const [qrCheckInLoading, setQrCheckInLoading] = useState(false);
  const [qrScanError, setQrScanError] = useState("");
  const [qrCheckInResult, setQrCheckInResult] = useState(null);
  const [qrCameraActive, setQrCameraActive] = useState(false);
  const qrScanInputRef = useRef(null);
  const qrVideoRef = useRef(null);

  useEffect(() => {
    if (!viewingAppointment || !clinicId || !token) {
      setViewingAppointmentDetails(null);
      setViewingAppointmentLoading(false);
      setViewingAppointmentError("");
      return undefined;
    }

    let cancelled = false;
    setViewingAppointmentDetails(viewingAppointment);
    setViewingAppointmentLoading(true);
    setViewingAppointmentError("");

    async function loadViewingAppointment() {
      try {
        const result = await getClinicAppointments(clinicId, { appointmentId: viewingAppointment.id }, token);
        const details = Array.isArray(result) ? result[0] : result?.items?.[0] || result;
        if (!details) throw new Error("Appointment details were not returned.");
        if (!cancelled) setViewingAppointmentDetails(details);
      } catch (err) {
        if (!cancelled) setViewingAppointmentError(err.message || "Unable to load appointment details.");
      } finally {
        if (!cancelled) setViewingAppointmentLoading(false);
      }
    }

    loadViewingAppointment();
    return () => { cancelled = true; };
  }, [viewingAppointment?.id, clinicId, token]);

  useEffect(() => {
    if (!viewingAppointmentDetails?.id || !token) {
      setViewingPaymentDetails(null);
      setViewingPaymentLoading(false);
      setViewingPaymentError("");
      return undefined;
    }

    let cancelled = false;
    async function loadViewingPayment() {
      try {
        setViewingPaymentLoading(true);
        setViewingPaymentError("");
        const details = await getAppointmentPayment(viewingAppointmentDetails.id, token, clinicId);
        if (!cancelled) setViewingPaymentDetails(details);
      } catch (err) {
        if (!cancelled) setViewingPaymentError(err.message || "Unable to load payment information.");
      } finally {
        if (!cancelled) setViewingPaymentLoading(false);
      }
    }

    loadViewingPayment();
    return () => { cancelled = true; };
  }, [viewingAppointmentDetails?.id, clinicId, token]);

  useEffect(() => {
    const appointment = followUpSchedule?.appointment;
    const doctorId = appointment?.doctorId ?? appointment?.doctor?.id;
    const serviceId = appointment?.serviceId ?? appointment?.service?.id;
    if (!followUpSchedule || !token || !clinicId || !doctorId || !serviceId || !followUpSchedule.appointmentDate) {
      setFollowUpSlots([]);
      setFollowUpSlotsLoading(false);
      return undefined;
    }

    let cancelled = false;
    async function loadFollowUpSlots() {
      try {
        setFollowUpSlotsLoading(true);
        setFollowUpScheduleError("");
        const slots = await getClinicAvailableSlots(clinicId, doctorId, serviceId, followUpSchedule.appointmentDate, token);
        if (!cancelled) setFollowUpSlots(slots);
      } catch (err) {
        if (!cancelled) {
          setFollowUpSlots([]);
          setFollowUpScheduleError(err.message || "Unable to load available slots.");
        }
      } finally {
        if (!cancelled) setFollowUpSlotsLoading(false);
      }
    }

    loadFollowUpSlots();
    return () => { cancelled = true; };
  }, [followUpSchedule, clinicId, token]);

  useEffect(() => {
    if (qrScanOpen && !qrAppointment) qrScanInputRef.current?.focus();
  }, [qrScanOpen, qrAppointment]);

  useEffect(() => {
    if (!qrCameraActive || !qrScanOpen || qrAppointment) return undefined;

    let cancelled = false;
    let stream;
    let scanTimer;
    let scanning = false;

    async function startCameraScanner() {
      const BarcodeDetectorApi = window.BarcodeDetector;
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrScanError("Camera access is unavailable. Open this site over HTTPS or localhost, or paste the QR URL instead.");
        setQrCameraActive(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = qrVideoRef.current;
        if (!video) throw new Error("Camera preview is unavailable.");
        video.srcObject = stream;
        await video.play();

        const detector = typeof BarcodeDetectorApi === "function"
          ? new BarcodeDetectorApi({ formats: ["qr_code"] })
          : null;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Unable to initialize the QR camera scanner.");

        async function scanVideoFrame() {
          if (cancelled) return;
          if (scanning || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            scanTimer = window.setTimeout(scanVideoFrame, 200);
            return;
          }

          scanning = true;
          try {
            let decodedValue = "";
            if (detector) {
              const results = await detector.detect(video);
              decodedValue = results.find((result) => result.rawValue)?.rawValue || "";
            } else {
              const scale = Math.min(1, 640 / video.videoWidth);
              canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
              canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              decodedValue = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data || "";
            }
            if (decodedValue && !cancelled) {
              setQrScanValue(decodedValue);
              setQrCameraActive(false);
              await verifyAppointmentQr(decodedValue);
              return;
            }
          } catch (err) {
            if (!cancelled) {
              setQrScanError(err.message || "Unable to read the QR code from the camera.");
              setQrCameraActive(false);
            }
            return;
          } finally {
            scanning = false;
          }

          if (!cancelled) scanTimer = window.setTimeout(scanVideoFrame, 200);
        }

        scanVideoFrame();
      } catch (err) {
        if (!cancelled) {
          const message = err.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings or paste the QR URL instead."
            : err.name === "NotFoundError"
              ? "No camera was found. Connect a camera or paste the QR URL instead."
              : err.message || "Unable to start the camera scanner.";
          setQrScanError(message);
          setQrCameraActive(false);
        }
      }
    }

    startCameraScanner();
    return () => {
      cancelled = true;
      window.clearTimeout(scanTimer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (qrVideoRef.current) qrVideoRef.current.srcObject = null;
    };
  }, [qrCameraActive, qrScanOpen, qrAppointment, clinicId, token]);

  function closeQrScanner() {
    setQrScanOpen(false);
    setQrCameraActive(false);
    setQrScanValue("");
    setQrAppointment(null);
    setQrScanError("");
    setQrCheckInResult(null);
  }

  function extractAppointmentQrToken(value) {
    const scannedValue = String(value || "").trim();
    if (!scannedValue) return "";

    try {
      const parsedUrl = new URL(scannedValue);
      const tokenFromUrl = parsedUrl.searchParams.get("token");
      if (tokenFromUrl) return tokenFromUrl.trim();
    } catch {
      const query = scannedValue.startsWith("?") ? scannedValue.slice(1) : scannedValue;
      const tokenFromQuery = new URLSearchParams(query).get("token");
      if (tokenFromQuery) return tokenFromQuery.trim();
    }

    return scannedValue;
  }

  async function verifyAppointmentQr(value = qrScanValue) {
    const qrToken = extractAppointmentQrToken(value);
    if (!qrToken) {
      setQrScanError("Scan or enter a patient appointment QR code first.");
      return;
    }
    if (!clinicId || !token) {
      setQrScanError(!token ? "Please log in to verify appointment QR codes." : "Please select a clinic.");
      return;
    }

    try {
      setQrScanLoading(true);
      setQrScanError("");
      setQrAppointment(null);
      setQrCheckInResult(null);
      const details = await getAppointmentByQrToken(clinicId, qrToken, token);
      if (!details || (details.appointmentId == null && details.id == null)) {
        throw new Error("Appointment details were not returned for this QR code.");
      }
      setQrAppointment({ ...details, qrToken });
    } catch (err) {
      setQrScanError(err.message || "Unable to verify this appointment QR code.");
    } finally {
      setQrScanLoading(false);
    }
  }

  async function checkInScannedAppointment() {
    if (!qrAppointment || !qrAppointment.qrToken || qrCheckInLoading || qrCheckInResult) return;

    try {
      setQrCheckInLoading(true);
      setQrScanError("");
      const result = await checkInAppointmentByQrToken(clinicId, qrAppointment.qrToken, token);
      setQrCheckInResult(result);
      const checkedInAppointmentId = result?.appointmentId ?? qrAppointment.appointmentId ?? qrAppointment.id;
      setAppointments((items) => items.map((appointment) => String(appointment.id) === String(checkedInAppointmentId)
        ? {
            ...appointment,
            status: "CHECKED_IN",
            queueToken: result?.queueToken || appointment.queueToken,
            queueNumber: result?.queueNumber ?? appointment.queueNumber,
          }
        : appointment));
      showToast(`Appointment checked in${result?.queueToken ? ` · Queue ${result.queueToken}` : ""}`);
    } catch (err) {
      setQrScanError(err.message || "Unable to check in this appointment.");
    } finally {
      setQrCheckInLoading(false);
    }
  }

  async function handleQrScanSubmit() {
    if (qrAppointment) {
      await checkInScannedAppointment();
    } else {
      await verifyAppointmentQr();
    }
  }

  function resetQrVerification() {
    setQrCameraActive(false);
    setQrScanValue("");
    setQrAppointment(null);
    setQrScanError("");
    setQrCheckInResult(null);
  }

  function formatQrAppointmentDateTime(dateValue, timeValue) {
    if (!dateValue) return "-";
    const dateString = String(dateValue).slice(0, 10);
    const parsedDate = new Date(`${dateString}T00:00:00`);
    const dateLabel = Number.isNaN(parsedDate.getTime())
      ? dateString
      : parsedDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const timeLabel = timeValue ? formatTime(String(timeValue).slice(0, 5)) : "";
    return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReceptionDoctors() {
      if (!token || !clinicId) {
        setReceptionDoctors([]);
        setDoctorFilter("");
        return;
      }

      try {
        const doctors = await getClinicDoctors(clinicId, token);
        if (!cancelled) setReceptionDoctors(Array.isArray(doctors) ? doctors : []);
      } catch (err) {
        if (!cancelled) {
          setReceptionDoctors([]);
          showToast(err.message || "Unable to load doctors.");
        }
      }
    }

    setDoctorFilter("");
    loadReceptionDoctors();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadReceptionAppointments() {
      if (!token || !clinicId || !selectedDate) {
        setAppointments([]);
        setPagination(null);
        setLoading(false);
        setError(!token ? "Please log in to view appointments." : "Please select a clinic and date.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicAppointments(clinicId, {
          from: selectedDate,
          to: selectedDate,
          page: 0,
          size: 100,
        }, token);
        if (!cancelled) {
          setAppointments(Array.isArray(result) ? result : result?.items || []);
          setPagination(result?.pagination || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load reception appointments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReceptionAppointments();
    return () => { cancelled = true; };
  }, [clinicId, token, selectedDate, refreshKey]);

  const normalizedAppointments = appointments.map((appointment) => ({
    ...appointment,
    status: String(appointment.status || "").toUpperCase(),
    paymentStatus: String(appointment.paymentStatus || "-").toUpperCase(),
  }));
  const tabDefinitions = [
    { id: "ALL", label: "Today's Patients", filter: () => true },
    { id: "CHECKED_IN", label: "Checked In", filter: (item) => item.status === "CHECKED_IN" },
    { id: "WAITING", label: "Waiting", filter: (item) => item.status === "WAITING" },
    { id: "IN_CONSULTATION", label: "In Consultation", filter: (item) => item.status === "IN_CONSULTATION" },
    { id: "COMPLETED", label: "Completed", filter: (item) => item.status === "COMPLETED" },
  ];
  const counts = Object.fromEntries(tabDefinitions.map((tab) => [tab.id, normalizedAppointments.filter(tab.filter).length]));
  const query = `${search} ${patientQuery}`.trim().toLowerCase();
  const selectedDoctor = receptionDoctors.find((doctor) => String(doctor.id) === String(doctorFilter));
  const visibleAppointments = normalizedAppointments.filter((appointment) => {
    const selectedTab = tabDefinitions.find((tab) => tab.id === activeTab);
    const matchesTab = selectedTab ? selectedTab.filter(appointment) : true;
    const appointmentDoctorId = appointment.doctorId ?? appointment.doctor?.id;
    const appointmentDoctorName = appointment.doctorName || appointment.doctor?.name || appointment.doctor?.fullName || "";
    const matchesDoctor = !selectedDoctor
      || (appointmentDoctorId != null
        ? String(appointmentDoctorId) === String(selectedDoctor.id)
        : appointmentDoctorName.toLowerCase() === String(selectedDoctor.name || selectedDoctor.fullName || "").toLowerCase());
    const matchesQuery = !query || [appointment.patientName, appointment.phoneNo, appointment.patientPhone, appointment.appointmentCode, appointment.serviceName, appointment.doctorName]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesTab && matchesDoctor && matchesQuery;
  });
  const scannedQrStatus = String(qrAppointment?.qrStatus || "ACTIVE").toUpperCase();
  const scannedAppointmentStatus = String(qrAppointment?.appointmentStatus || qrAppointment?.status || "").toUpperCase();
  const scannedPatientProfileStatus = String(qrAppointment?.patientProfileStatus || qrAppointment?.patient?.patientProfileStatus || "").toUpperCase();
  const scannedPatientId = qrAppointment?.patient?.id ?? qrAppointment?.patientId ?? qrAppointment?.patient?.patientId;
  const scannedAppointmentAlreadyCheckedIn = ["CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED"].includes(scannedAppointmentStatus);
  const canCheckInScannedAppointment = scannedQrStatus === "ACTIVE" && !scannedAppointmentAlreadyCheckedIn;

  async function changeReceptionStatus(appointment, nextStatus) {
    try {
      setUpdatingAppointmentId(appointment.id);
      setError("");
      const updated = nextStatus === "CHECKED_IN"
        ? await checkInAppointment(appointment.id, token, clinicId)
        : await updateAppointmentStatus(appointment.id, nextStatus, token, clinicId);
      setAppointments((items) => items.map((item) => String(item.id) === String(appointment.id)
        ? { ...item, ...(updated || {}), status: updated?.status || nextStatus }
        : item));
      showToast(nextStatus === "CHECKED_IN"
        ? `Patient checked in${updated?.queueToken ? ` · Queue ${updated.queueToken}` : ""}`
        : `Appointment marked ${nextStatus.replaceAll("_", " ").toLowerCase()}`);
    } catch (err) {
      setError(err.message || "Unable to update appointment status.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  function getReceptionAction(status) {
    if (status === "CONFIRMED") return { label: "Check In", nextStatus: "CHECKED_IN" };
    if (status === "CHECKED_IN") return { label: "Add to Queue", nextStatus: "WAITING" };
    if (status === "WAITING") return { label: "Start Consultation", nextStatus: "IN_CONSULTATION" };
    return null;
  }

  function scheduleReceptionFollowUp() {
    const appointment = viewingAppointmentDetails;
    if (!appointment?.id || !appointment.suggestedFollowUpDate || appointment.followUpAppointmentId) return;
    if (!(appointment.doctorId ?? appointment.doctor?.id) || !(appointment.serviceId ?? appointment.service?.id)) {
      setViewingAppointmentError("Doctor or service information is missing, so a follow-up appointment cannot be scheduled.");
      return;
    }
    setFollowUpScheduleError("");
    setFollowUpSlots([]);
    setViewingAppointment(null);
    setFollowUpSchedule({
      appointment,
      appointmentDate: appointment.suggestedFollowUpDate,
      startTime: "",
      endTime: "",
    });
  }

  async function saveReceptionFollowUp() {
    if (!followUpSchedule?.startTime || !followUpSchedule.endTime) {
      setFollowUpScheduleError("Please select an available slot.");
      return;
    }

    const appointment = followUpSchedule.appointment;
    try {
      setCreatingFollowUpAppointment(true);
      setFollowUpScheduleError("");
      const nextAppointment = await createNextAppointment(clinicId, appointment.id, {
        appointmentDate: followUpSchedule.appointmentDate,
        startTime: followUpSchedule.startTime,
        endTime: followUpSchedule.endTime,
      }, token);
      setAppointments((items) => items.map((item) => String(item.id) === String(appointment.id)
        ? { ...item, followUpAppointmentId: nextAppointment?.id || item.followUpAppointmentId || "CREATED" }
        : item));
      setFollowUpSchedule(null);
      setRefreshKey((key) => key + 1);
      showToast("Follow-up appointment created");
    } catch (err) {
      setFollowUpScheduleError(err.message || "Unable to create the follow-up appointment.");
    } finally {
      setCreatingFollowUpAppointment(false);
    }
  }

  function getReceptionWhatsAppUrl(appointment) {
    const phone = String(appointment.phoneNo || appointment.patientPhone || appointment.patient?.phoneNo || "").replace(/\D/g, "");
    if (phone.length < 8 || phone.length > 15) return "";

    const patientName = appointment.patientName || appointment.patient?.name || "there";
    const clinic = clinicName || "the clinic";
    const appointmentTime = formatTime(appointment.startTime || appointment.time);
    const message = appointment.status === "CHECKED_IN"
      ? `Hello ${patientName}, this is ${clinic} reception. We noticed you checked in for your appointment at ${appointmentTime}, but have not yet joined the consultation. Are you still at the clinic? Please reply if you need any help.`
      : `Hello ${patientName}, this is ${clinic} reception regarding your appointment at ${appointmentTime}. Please reply if you need any assistance.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function handleReceptionPaymentCollected(payment) {
    setAppointments((items) => items.map((item) => String(item.id) === String(paymentAppointment.id)
      ? { ...item, paymentStatus: payment?.status || item.paymentStatus }
      : item));
  }

  return <>
    <section className="page active reception-page">
      <div className="card reception-card">
        <div className="card-header reception-header">
          <div><h3>Reception Desk</h3><p>Check in patients, collect payments, and manage the OPD queue.</p></div>
          <div className="reception-header-actions">
            <input className="control reception-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Reception date" />
            <button className="btn btn-outline reception-scan-qr" onClick={() => {
              resetQrVerification();
              setQrScanOpen(true);
            }}>Scan Patient QR</button>
            <button className="btn btn-primary" onClick={() => openModal("appointment")}>+ New Appointment</button>
          </div>
        </div>
        <div className="reception-toolbar">
          <div className="reception-tabs" role="tablist" aria-label="Appointment status">
            {tabDefinitions.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`reception-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label} <span>{counts[tab.id]}</span></button>)}
          </div>
          <div className="reception-filters">
            <select className="control reception-doctor-filter" aria-label="Filter by doctor" value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
              <option value="">All Doctors</option>
              {receptionDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name || doctor.fullName || `Doctor ${doctor.id}`}</option>)}
            </select>
            <input className="control reception-search" type="search" placeholder="Search by name, phone, or ID" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} />
          </div>
        </div>
        {error && <div className="auth-error reception-error">{error}</div>}
        {loading && <div className="card-body"><p className="muted">Loading today&apos;s patients...</p></div>}
        {!loading && !error && visibleAppointments.length === 0 && <div className="card-body"><p className="muted">No appointments found for this view.</p></div>}
        {!loading && !error && visibleAppointments.length > 0 && <div className="table-wrap reception-table-wrap">
          <table className="reception-table"><thead><tr><th>#</th><th>Time</th><th>Patient</th><th>Appointment Id</th><th>Doctor</th><th>Check-in</th><th>Payment</th><th>Queue</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visibleAppointments.map((appointment, index) => {
              const action = getReceptionAction(appointment.status);
              const paymentStatus = String(appointment.paymentStatus || "-").toUpperCase();
              const paymentClass = { UNPAID: "pending", PARTIAL: "in_progress", PAID: "completed", REFUNDED: "cancelled" }[paymentStatus] || "";
              const canCollect = appointment.status === "COMPLETED" && ["UNPAID", "PARTIAL"].includes(paymentStatus);
              const paymentDue = appointment.remainingAmount ?? appointment.amountDue;
              const isUpdating = String(updatingAppointmentId) === String(appointment.id);
              const whatsappUrl = getReceptionWhatsAppUrl(appointment);
              return <tr key={appointment.id}>
                <td>{index + 1}</td>
                <td>{formatTime(appointment.startTime || appointment.time)}</td>
                <td><div className="patient-cell"><div className="small-avatar">{initials({ firstName: appointment.patientName })}</div><div><strong>{appointment.patientName || "Unknown patient"}</strong><span className="reception-contact-line"><span>{appointment.phoneNo || appointment.patientPhone || appointment.patient?.phoneNo || "-"}</span>{whatsappUrl && <a className="reception-whatsapp-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Message this patient on WhatsApp" aria-label={`Message ${appointment.patientName || "patient"} on WhatsApp`}><img src={whatsAppIcon} alt="" /></a>}</span></div></div></td>
                <td>{appointment.id ?? "-"}</td>
                <td>{appointment.doctorName || appointment.doctor?.name || appointment.doctor?.fullName || "-"}</td>
                <td><span className={`reception-checkin ${appointment.status === "CHECKED_IN" || ["WAITING", "IN_CONSULTATION", "COMPLETED"].includes(appointment.status) ? "checked" : ""}`}>{["CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED"].includes(appointment.status) ? "Checked In" : "Not Arrived"}</span>{appointment.checkInTime && <small>{formatTime(appointment.checkInTime)}</small>}</td>
                <td>{canCollect ? <button className={`status ${paymentClass} reception-payment-button`} onClick={() => setPaymentAppointment(appointment)}>{paymentStatus}{paymentDue == null ? "" : ` · ${formatCurrency(paymentDue)}`}</button> : <span className={`status ${paymentClass}`}>{paymentStatus}</span>}</td>
                <td>{appointment.queueToken || appointment.queueNumber || appointment.queueCode || "-"}</td>
                <td><span className={`status ${appointment.status === "IN_CONSULTATION" ? "in_progress" : appointment.status.toLowerCase()}`}>{appointment.status || "-"}</span></td>
                <td><div className="reception-row-actions"><button className="btn btn-outline reception-action" onClick={() => setViewingAppointment(appointment)}>View</button>{action ? <button className="btn btn-light reception-action" disabled={isUpdating} onClick={() => changeReceptionStatus(appointment, action.nextStatus)}>{isUpdating ? "Updating..." : action.label}</button> : <span className="muted">-</span>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
        {!loading && pagination?.totalElements > 100 && <div className="pagination"><span>Showing the first 100 appointments for this date.</span><button className="btn btn-outline" onClick={() => setRefreshKey((key) => key + 1)}>Refresh</button></div>}
        {!loading && !pagination?.totalElements && appointments.length > 0 && <div className="pagination"><span>{appointments.length} appointment{appointments.length === 1 ? "" : "s"}</span><button className="btn btn-outline" onClick={() => setRefreshKey((key) => key + 1)}>Refresh</button></div>}
      </div>
    </section>
    {qrScanOpen && <Modal
      title="Verify Patient & Appointment"
      className="appointment-qr-modal"
      onClose={closeQrScanner}
      cancelLabel="Close"
      onSave={async () => {
        if (!qrAppointment) {
          await verifyAppointmentQr();
        } else if (qrCheckInResult) {
          closeQrScanner();
        } else if (canCheckInScannedAppointment) {
          await checkInScannedAppointment();
        } else {
          resetQrVerification();
        }
      }}
      saveLabel={qrScanLoading ? "Verifying..." : qrCheckInLoading ? "Checking In..." : qrCheckInResult ? "Done" : qrAppointment ? canCheckInScannedAppointment ? "Check In" : "Scan Another QR" : "Verify QR Code"}
      saveDisabled={qrScanLoading || qrCheckInLoading || (!qrAppointment && !qrScanValue.trim())}
    >
      <div className="appointment-qr-verification">
        {!qrAppointment && <>
          <label className="field">
            <span>Scan Patient Appointment QR</span>
            <input
              ref={qrScanInputRef}
              autoComplete="off"
              autoFocus
              value={qrScanValue}
              onChange={(event) => setQrScanValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  verifyAppointmentQr();
                }
              }}
              placeholder="Scan or paste the QR code URL"
              disabled={qrScanLoading}
            />
          </label>
          <div className="qr-scanner-options">
            <button
              type="button"
              className="btn btn-outline"
              disabled={qrScanLoading}
              onClick={() => {
                setQrScanError("");
                setQrCameraActive((active) => !active);
              }}
            >
              {qrCameraActive ? "Stop Camera" : "Use Camera Scanner"}
            </button>
            <span className="muted">Or use a connected QR scanner or paste the QR URL above.</span>
          </div>
          {qrCameraActive && <div className="qr-camera-preview">
            <video ref={qrVideoRef} autoPlay muted playsInline aria-label="Live QR code camera preview" />
            <span>Point the camera at the patient appointment QR code.</span>
          </div>}
        </>}

        {qrScanLoading && <div className="qr-verification-banner loading" role="status">Verifying appointment QR code...</div>}
        {qrScanError && <div className="auth-error qr-verification-error" role="alert">{qrScanError}</div>}

        {qrAppointment && <>
          <div className={`qr-verification-banner ${scannedQrStatus === "ACTIVE" ? "valid" : "invalid"}`} role="status">
            <span className="qr-verification-mark">{scannedQrStatus === "ACTIVE" ? "✓" : "!"}</span>
            <span>
              <strong>{scannedQrStatus === "ACTIVE" ? "Valid QR Code" : `${scannedQrStatus} QR Code`}</strong>
              <small>{scannedQrStatus === "ACTIVE" ? "Appointment found. Please verify the details." : "This QR code is not active and cannot be used to check in."}</small>
            </span>
          </div>
          <section className="qr-appointment-details" aria-label="Verified appointment details">
            <header className="qr-appointment-patient">
              <div className="appointment-overview-avatar">{initials({ firstName: qrAppointment.patientName })}</div>
              <div>
                <div className="qr-appointment-name-line">
                  <strong>{qrAppointment.patientName || "Unknown patient"}</strong>
                  {scannedPatientProfileStatus && <span className="qr-patient-type">{scannedPatientProfileStatus}</span>}
                </div>
                <span>Patient ID: {scannedPatientId || qrAppointment.patientCode || "-"}</span>
                <span>{qrAppointment.phoneNo || qrAppointment.patientPhone || qrAppointment.patient?.phoneNo || "-" }{(qrAppointment.email || qrAppointment.patient?.email) ? ` | ${qrAppointment.email || qrAppointment.patient.email}` : ""}</span>
                {scannedPatientProfileStatus === "INCOMPLETE" && scannedPatientId && <button type="button" className="btn btn-outline qr-update-patient" onClick={() => {
                  const patient = {
                    ...qrAppointment.patient,
                    id: scannedPatientId,
                    name: qrAppointment.patient?.name || qrAppointment.patientName,
                    whatsappNumber: qrAppointment.patient?.whatsappNumber || qrAppointment.phoneNo || qrAppointment.patientPhone || qrAppointment.patient?.phoneNo,
                    email: qrAppointment.patient?.email || qrAppointment.email,
                    dateOfBirth: qrAppointment.patient?.dateOfBirth || qrAppointment.dateOfBirth,
                    gender: qrAppointment.patient?.gender || qrAppointment.gender,
                  };
                  closeQrScanner();
                  onUpdatePatient(patient);
                }}>Update Patient</button>}
              </div>
            </header>
            <dl className="qr-appointment-fields">
              <div><dt>Appointment #</dt><dd>{qrAppointment.appointmentCode || qrAppointment.AppointmentCode || qrAppointment.appointmentNumber || qrAppointment.appointmentId}</dd></div>
              <div><dt>Clinic</dt><dd>{qrAppointment.clinicName || "-"}</dd></div>
              <div><dt>Doctor</dt><dd>{qrAppointment.doctorName || "-"}</dd></div>
              <div><dt>Date &amp; Time</dt><dd>{formatQrAppointmentDateTime(qrAppointment.appointmentDate, qrAppointment.appointmentTime || qrAppointment.startTime)}</dd></div>
              <div><dt>Service</dt><dd>{qrAppointment.serviceName || "-"}</dd></div>
              <div><dt>Appointment Status</dt><dd>{scannedAppointmentStatus || "-"}</dd></div>
            </dl>
          </section>
        </>}

        {qrCheckInResult && <div className="qr-checkin-success" role="status">
          <strong>Appointment has been checked in.</strong>
          {qrCheckInResult.queueToken && <span>Queue token: {qrCheckInResult.queueToken}</span>}
        </div>}
        {qrAppointment && !qrCheckInResult && !canCheckInScannedAppointment && <div className="qr-checkin-notice">
          {scannedQrStatus !== "ACTIVE" ? "Check-in is unavailable because this QR code is not active." : "This appointment has already been checked in or completed."}
        </div>}
        {qrAppointment && <button type="button" className="btn btn-outline qr-scan-another" onClick={resetQrVerification}>Scan Another QR</button>}
      </div>
    </Modal>}
    {viewingAppointment && <Modal
      title="Appointment Overview"
      className="appointment-overview-modal"
      onClose={() => setViewingAppointment(null)}
      onSave={() => setViewingAppointment(null)}
      saveLabel="Close"
      saveDisabled={viewingAppointmentLoading}
    >
      {viewingAppointmentLoading && <p className="muted">Loading appointment details...</p>}
      {viewingAppointmentError && <div className="auth-error">{viewingAppointmentError}</div>}
      {viewingAppointmentDetails && <AppointmentOverviewContent
        appointment={viewingAppointmentDetails}
        paymentDetails={viewingPaymentDetails}
        paymentLoading={viewingPaymentLoading}
        paymentError={viewingPaymentError}
        canScheduleFollowUp={String(viewingAppointmentDetails.status || "").toUpperCase() === "COMPLETED" && Boolean(viewingAppointmentDetails.suggestedFollowUpDate) && !viewingAppointmentDetails.followUpAppointmentId}
        onScheduleFollowUp={scheduleReceptionFollowUp}
      />}
    </Modal>}
    {followUpSchedule && <Modal
      title="Create Follow-up Appointment"
      onClose={() => setFollowUpSchedule(null)}
      onSave={saveReceptionFollowUp}
      saveLabel={creatingFollowUpAppointment ? "Creating..." : "Create Appointment"}
      saveDisabled={followUpSlotsLoading || creatingFollowUpAppointment || !followUpSchedule.startTime}
    >
      <div className="form-grid">
        <Field label="Patient" value={followUpSchedule.appointment.patientName || followUpSchedule.appointment.patient?.name || "-"} disabled />
        <Field label="Date *" type="date" value={followUpSchedule.appointmentDate} onChange={(event) => setFollowUpSchedule((current) => ({ ...current, appointmentDate: event.target.value, startTime: "", endTime: "" }))} />
        <div className="field">
          <label>Available Slot *</label>
          <select
            value={followUpSchedule.startTime}
            onChange={(event) => {
              const startTime = normalizeTime(event.target.value);
              const duration = Number(followUpSchedule.appointment.durationMinutes || followUpSchedule.appointment.service?.durationMinutes || 30);
              setFollowUpSchedule((current) => ({ ...current, startTime, endTime: addMinutesToTime(startTime, duration) }));
            }}
            disabled={followUpSlotsLoading || followUpSlots.length === 0}
          >
            <option value="">{followUpSlotsLoading ? "Loading available slots..." : followUpSlots.length === 0 ? "No slots available" : "Select available slot"}</option>
            {followUpSlots.map((slot) => <option key={slot} value={normalizeTime(slot)}>{formatTime(normalizeTime(slot))}</option>)}
          </select>
        </div>
        <Field label="End Time *" type="time" value={followUpSchedule.endTime} disabled />
      </div>
      {followUpScheduleError && <div className="auth-error" style={{ marginTop: 12 }}>{followUpScheduleError}</div>}
    </Modal>}
    {paymentAppointment && <AppointmentPaymentDialog
      appointment={paymentAppointment}
      clinicId={clinicId}
      token={token}
      onClose={() => setPaymentAppointment(null)}
      onPaymentCollected={handleReceptionPaymentCollected}
      showToast={showToast}
    />}
  </>;
}

function AppointmentQueue({ clinicId, token, userRole, userDoctorId, search, showToast }) {
  const today = new Date().toISOString().slice(0, 10);
  const [inProgressAppointments, setInProgressAppointments] = useState([]);
  const [waitingAppointments, setWaitingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [draggedWaitingAppointmentId, setDraggedWaitingAppointmentId] = useState(null);
  const [followUpSchedule, setFollowUpSchedule] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [followUpSlots, setFollowUpSlots] = useState([]);
  const [followUpSlotsLoading, setFollowUpSlotsLoading] = useState(false);
  const [followUpScheduleError, setFollowUpScheduleError] = useState("");
  const isDoctor = String(userRole).toUpperCase() === "DOCTOR";

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      if (!token || !clinicId) {
        setInProgressAppointments([]);
        setWaitingAppointments([]);
        setLoading(false);
        setError(!token ? "Please log in to view the appointment queue." : "Please select a clinic.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const filters = { from: today, to: today, doctorId: isDoctor ? userDoctorId : "" };
        const [inProgressResult, waitingResult] = await Promise.all([
          getClinicAppointments(clinicId, { ...filters, status: "IN_CONSULTATION" }, token),
          getClinicAppointments(clinicId, { ...filters, status: "WAITING" }, token),
        ]);
        if (!cancelled) {
          setInProgressAppointments(Array.isArray(inProgressResult) ? inProgressResult : []);
          setWaitingAppointments(Array.isArray(waitingResult) ? waitingResult : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load appointment queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQueue();
    return () => { cancelled = true; };
  }, [clinicId, token, today, isDoctor, userDoctorId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFollowUpSlots() {
      const appointment = followUpSchedule?.appointment;
      if (!followUpSchedule || !token || !clinicId || !appointment?.doctorId || !appointment?.serviceId || !followUpSchedule.date) {
        setFollowUpSlots([]);
        setFollowUpSlotsLoading(false);
        return;
      }

      try {
        setFollowUpSlotsLoading(true);
        setFollowUpScheduleError("");
        const slots = await getClinicAvailableSlots(clinicId, appointment.doctorId, appointment.serviceId, followUpSchedule.date, token);
        if (!cancelled) setFollowUpSlots(slots);
      } catch (err) {
        if (!cancelled) {
          setFollowUpSlots([]);
          setFollowUpScheduleError(err.message || "Unable to load available slots.");
        }
      } finally {
        if (!cancelled) setFollowUpSlotsLoading(false);
      }
    }

    loadFollowUpSlots();
    return () => { cancelled = true; };
  }, [followUpSchedule, clinicId, token]);

  const matchesSearch = (appointment) => {
    const query = search.trim().toLowerCase();
    return !query || [appointment.patientName, appointment.serviceName, appointment.doctorName]
      .some((value) => String(value || "").toLowerCase().includes(query));
  };

  const visibleInProgressAppointments = inProgressAppointments.filter(matchesSearch);
  const visibleWaitingAppointments = waitingAppointments.filter(matchesSearch);
  const totalInQueue = visibleInProgressAppointments.length + visibleWaitingAppointments.length;

  function reorderWaitingAppointments(draggedId, targetId) {
    if (!draggedId || !targetId || String(draggedId) === String(targetId)) return;

    setWaitingAppointments((items) => {
      const sourceIndex = items.findIndex((appointment) => String(appointment.id) === String(draggedId));
      const targetIndex = items.findIndex((appointment) => String(appointment.id) === String(targetId));
      if (sourceIndex < 0 || targetIndex < 0) return items;

      const reordered = [...items];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });

    showToast("Waiting list reordered");
  }

  async function handleFollowUp(appointmentId) {
    const appointment = inProgressAppointments.find((item) => String(item.id) === String(appointmentId));
    if (!appointment) return;

    setFollowUpScheduleError("");
    setFollowUpSlots([]);
    setFollowUpSchedule({
      appointment,
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      slot: "",
    });
  }

  async function saveFollowUpSchedule() {
    if (!followUpSchedule?.date || !followUpSchedule.slot) {
      setFollowUpScheduleError("Please select a date and available slot.");
      return;
    }

    const appointmentId = followUpSchedule.appointment.id;
    try {
      setUpdatingAppointmentId(appointmentId);
      setFollowUpScheduleError("");
      await followUpAppointment(Number(appointmentId), followUpSchedule.date, token, clinicId);
      setInProgressAppointments((items) => items.filter((appointment) => appointment.id !== appointmentId));
      setFollowUpSchedule(null);
      showToast(`Follow-up scheduled for ${followUpSchedule.date} at ${formatTime(followUpSchedule.slot)}`);
    } catch (err) {
      setFollowUpScheduleError(err.message || "Unable to schedule follow-up.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  function handleQueuePaymentCollected(result) {
    setInProgressAppointments((items) => items.map((appointment) => String(appointment.id) === String(paymentAppointment.id)
      ? { ...appointment, paymentStatus: result?.status || appointment.paymentStatus }
      : appointment));
  }

  async function changeStatus(appointmentId, nextStatus) {
    try {
      setUpdatingAppointmentId(appointmentId);
      setError("");
      const updated = await updateAppointmentStatus(appointmentId, nextStatus, token, clinicId);
      const currentAppointment = [...inProgressAppointments, ...waitingAppointments].find((appointment) => appointment.id === appointmentId);
      const changedAppointment = { ...currentAppointment, ...(updated || {}), status: updated?.status || nextStatus };
      setInProgressAppointments((items) => items.filter((appointment) => appointment.id !== appointmentId));
      setWaitingAppointments((items) => items.filter((appointment) => appointment.id !== appointmentId));
      if (changedAppointment.status === "IN_CONSULTATION") setInProgressAppointments((items) => [...items, changedAppointment]);
      if (changedAppointment.status === "WAITING") setWaitingAppointments((items) => [...items, changedAppointment]);
      showToast(`Appointment marked ${nextStatus.replaceAll("_", " ").toLowerCase()}`);
    } catch (err) {
      setError(err.message || "Unable to update appointment status.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  return <>
  <section className="page active queue-page">
    <div className="queue-hero"><div><span className="queue-eyebrow">LIVE CLINIC FLOW</span><h2>Today&apos;s Appointment Queue</h2><p>Patients currently checked in or waiting for care.</p></div><div className="queue-count"><strong>{totalInQueue}</strong><span>in queue</span></div></div>
    {error && <div className="auth-error">{error}</div>}
    {loading && <div className="card queue-empty"><span className="queue-pulse" /><p>Loading the queue...</p></div>}
    {!loading && !error && totalInQueue === 0 && <div className="card queue-empty"><div className="queue-empty-icon">✓</div><h3>Queue is clear</h3><p>No consultation or waiting patients need attention right now.</p></div>}
    {!loading && !error && totalInQueue > 0 && <div className="queue-columns"><QueueLane title="Start Consultation" subtitle="Consultation in progress" appointments={visibleInProgressAppointments} actionLabel="Follow Up" nextStatus="FOLLOW_UP" updatingAppointmentId={updatingAppointmentId} onStatusChange={handleFollowUp} onCollectPayment={(appointment) => setPaymentAppointment(appointment)} /><QueueLane title="Waiting" subtitle="Ready for the doctor" appointments={visibleWaitingAppointments} actionLabel="Start Consultation" nextStatus="IN_CONSULTATION" updatingAppointmentId={updatingAppointmentId} onStatusChange={changeStatus} isReorderable onReorder={reorderWaitingAppointments} draggedAppointmentId={draggedWaitingAppointmentId} setDraggedAppointmentId={setDraggedWaitingAppointmentId} /></div>}
  </section>
  {followUpSchedule && <Modal
    title="Schedule Follow-up"
    onClose={() => setFollowUpSchedule(null)}
    onSave={saveFollowUpSchedule}
    saveLabel="Schedule Follow-up"
    saveDisabled={followUpSlotsLoading || !followUpSchedule.slot || updatingAppointmentId === followUpSchedule.appointment.id}
  >
    <div className="form-grid">
      <Field label="Patient" value={followUpSchedule.appointment.patientName || "-"} disabled />
      <Field label="Doctor" value={followUpSchedule.appointment.doctorName || "-"} disabled />
      <Field label="Service" value={followUpSchedule.appointment.serviceName || "-"} disabled />
      <Field label="Follow-up Date *" type="date" value={followUpSchedule.date} onChange={(e) => setFollowUpSchedule((value) => ({ ...value, date: e.target.value, slot: "" }))} />
      <div className="field">
        <label>Available Slot *</label>
        <select value={followUpSchedule.slot} onChange={(e) => setFollowUpSchedule((value) => ({ ...value, slot: normalizeTime(e.target.value) }))} disabled={followUpSlotsLoading || followUpSlots.length === 0}>
          <option value="">{followUpSlotsLoading ? "Loading available slots..." : followUpSlots.length === 0 ? "No slots available" : "Select available slot"}</option>
          {followUpSlots.map((slot) => <option key={slot} value={normalizeTime(slot)}>{formatTime(normalizeTime(slot))}</option>)}
        </select>
      </div>
    </div>
    {followUpScheduleError && <div className="auth-error" style={{ marginTop: 12 }}>{followUpScheduleError}</div>}
  </Modal>}
  {paymentAppointment && <AppointmentPaymentDialog
    appointment={paymentAppointment}
    clinicId={clinicId}
    token={token}
    onClose={() => setPaymentAppointment(null)}
    onPaymentCollected={handleQueuePaymentCollected}
    showToast={showToast}
  />}
  </>;
}

function QueueLane({ title, subtitle, appointments, actionLabel, nextStatus, updatingAppointmentId, onStatusChange, onCollectPayment, isReorderable = false, onReorder, draggedAppointmentId, setDraggedAppointmentId }) {
  return <div className="queue-lane"><div className="queue-lane-header"><div><h3>{title}</h3><p>{subtitle}</p></div><span>{appointments.length}</span></div>{appointments.length === 0 ? <div className="lane-empty">No patients</div> : <div className="queue-list">{appointments.map((appointment, index) => <div className={`queue-item ${draggedAppointmentId === appointment.id ? "dragging" : ""}`} key={appointment.id} draggable={isReorderable} onDragStart={(event) => {
      if (!isReorderable) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(appointment.id));
      setDraggedAppointmentId?.(appointment.id);
    }} onDragOver={(event) => {
      if (!isReorderable) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }} onDrop={(event) => {
      if (!isReorderable || !draggedAppointmentId) return;
      event.preventDefault();
      onReorder?.(draggedAppointmentId, appointment.id);
      setDraggedAppointmentId?.(null);
    }} onDragEnd={() => {
      if (isReorderable) setDraggedAppointmentId?.(null);
    }}>
    <div className="queue-position">{String(index + 1).padStart(2, "0")}</div>
    <div className="queue-patient"><div className="queue-avatar">{initials({ firstName: appointment.patientName })}</div><div><h3>{appointment.patientName || "Unknown patient"}</h3><p>{appointment.serviceName || appointment.service?.name || "Consultation"}</p></div></div>
    <div className="queue-detail"><span>Doctor</span><strong>{appointment.doctorName || appointment.doctor?.name || "-"}</strong></div>
    <div className="queue-detail"><span>Time</span><strong>{formatTime(appointment.startTime || appointment.time)}</strong></div>
    <div className="queue-item-actions">
      <button className="btn btn-primary queue-action" disabled={updatingAppointmentId === appointment.id} onClick={() => onStatusChange(appointment.id, nextStatus)}>{updatingAppointmentId === appointment.id ? "Updating..." : actionLabel}</button>
      {onCollectPayment && ["UNPAID", "PARTIAL"].includes(String(appointment.paymentStatus || "UNPAID").toUpperCase()) && <button className="btn btn-light queue-action" onClick={() => onCollectPayment(appointment)}>Collect Payment</button>}
    </div>
  </div>)}</div>}</div>;
}

function Doctors({ openModal, showToast, clinicId, token, refreshKey, onEdit }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorServices, setDoctorServices] = useState([]);
  const [doctorServicesLoading, setDoctorServicesLoading] = useState(false);
  const [doctorProfileError, setDoctorProfileError] = useState("");
  const [deletingDoctorId, setDeletingDoctorId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDoctors() {
      if (!token) {
        setDoctors([]);
        setLoading(false);
        setError("Please log in to view doctors.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicDoctors(clinicId, token);
        if (!cancelled) setDoctors(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load doctors.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDoctors();
    return () => { cancelled = true; };
  }, [clinicId, token, refreshKey]);

  async function openDoctorProfile(doctor) {
    if (!doctor || !token || !clinicId) {
      setDoctorProfileError("Unable to load profile details.");
      return;
    }

    try {
      setSelectedDoctor(doctor);
      setDoctorProfileError("");
      setDoctorServicesLoading(true);
      const serviceResult = await getClinicServices(clinicId, token, String(doctor.id));
      setDoctorServices(Array.isArray(serviceResult) ? serviceResult : []);
    } catch (err) {
      setDoctorServices([]);
      setDoctorProfileError(err.message || "Unable to load doctor profile.");
    } finally {
      setDoctorServicesLoading(false);
    }
  }

  async function handleDeleteDoctor(doctorId) {
    if (!token || !clinicId) {
      setError("Unable to delete doctor.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this doctor?");
    if (!confirmed) return;

    try {
      setDeletingDoctorId(doctorId);
      setError("");
      await deleteClinicDoctor(clinicId, doctorId, token);
      setDoctors((items) => items.filter((doctor) => String(doctor.id) !== String(doctorId)));
      if (selectedDoctor && String(selectedDoctor.id) === String(doctorId)) {
        setSelectedDoctor(null);
      }
      showToast("Doctor deleted successfully");
    } catch (err) {
      setError(err.message || "Unable to delete doctor.");
    } finally {
      setDeletingDoctorId(null);
    }
  }

  return <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Doctors</h3><p>Doctors registered with this clinic</p></div><button className="btn btn-primary" onClick={() => { onEdit(null); openModal("doctor"); }}>+ Add Doctor</button></div>
    <div className="card-body">
      {loading && <p className="muted">Loading doctors...</p>}
      {!loading && error && <div className="auth-error">{error}</div>}
      {!loading && !error && doctors.length === 0 && <p className="muted">No doctors found for this clinic.</p>}
      {!loading && !error && <div className="grid-3">{doctors.map((doctor) => <div className="card profile-card" key={doctor.id}>
      <div className="doctor-head"><div className="doctor-avatar">{initials({ firstName: doctor.name })}</div><div><div className="doctor-name">{doctor.name}</div><div className="doctor-speciality">{doctor.specialization}</div></div></div>
      <InfoLine left="Status" right={doctor.isActive ? "Active" : "Inactive"} positive={doctor.isActive} />
      <div className="quick-actions"><button className="btn btn-light icon-btn" title="View profile" onClick={() => openDoctorProfile(doctor)} aria-label="View profile">👁</button><button className="btn btn-outline icon-btn" title="Edit doctor" onClick={() => onEdit(doctor)} aria-label="Edit doctor">✎</button><button className="btn btn-danger icon-btn" title="Delete doctor" disabled={deletingDoctorId === doctor.id} onClick={() => handleDeleteDoctor(doctor.id)} aria-label="Delete doctor">{deletingDoctorId === doctor.id ? "…" : "🗑"}</button></div>
    </div>)}</div>}
    </div>
    {selectedDoctor && (
      <div className="modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && setSelectedDoctor(null)}>
        <div className="modal" style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <h3>Doctor Profile</h3>
            <button className="close" onClick={() => setSelectedDoctor(null)}>×</button>
          </div>
          <div className="modal-body">
            <div className="card profile-card" style={{ padding: 18, marginBottom: 16 }}>
              <div className="doctor-head" style={{ marginBottom: 12 }}>
                <div className="doctor-avatar" style={{ width: 52, height: 52 }}>{initials({ firstName: selectedDoctor.name })}</div>
                <div>
                  <div className="doctor-name" style={{ fontSize: 22 }}>{selectedDoctor.name}</div>
                  <div className="doctor-speciality">{selectedDoctor.specialization || "Doctor"}</div>
                </div>
              </div>

              <div className="info-line" style={{ marginBottom: 10 }}><span>Doctor ID</span><strong>{selectedDoctor.id}</strong></div>
              <div className="info-line" style={{ marginBottom: 10 }}><span>Status</span><strong className={selectedDoctor.isActive ? "up" : ""}>{selectedDoctor.isActive ? "Active" : "Inactive"}</strong></div>
              <div className="info-line" style={{ marginBottom: 0 }}><span>Clinic ID</span><strong>{clinicId}</strong></div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 12px" }}>Assigned Services</h4>
              {doctorServicesLoading && <p className="muted">Loading services...</p>}
              {!doctorServicesLoading && doctorProfileError && <div className="auth-error">{doctorProfileError}</div>}
              {!doctorServicesLoading && !doctorProfileError && doctorServices.length === 0 && <p className="muted">No services assigned to this doctor.</p>}
              {!doctorServicesLoading && !doctorProfileError && doctorServices.length > 0 && (
                <div className="grid-2">
                  {doctorServices.map((service) => (
                    <div key={service.id} className="card profile-card" style={{ padding: 12 }}>
                      <div className="doctor-name" style={{ fontSize: 16, marginBottom: 6 }}>{service.name}</div>
                      <div className="doctor-speciality">{service.durationMinutes || "-"} minutes</div>
                      <div className="doctor-speciality">Price: ₹{Number(service.price || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setSelectedDoctor(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => { onEdit(selectedDoctor); setSelectedDoctor(null); }}>Edit Doctor</button>
          </div>
        </div>
      </div>
    )}
  </div></section>;
}

function Services({ openModal, showToast, clinicId, token, doctorId, refreshKey }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingServiceId, setDeletingServiceId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      if (!token) {
        setServices([]);
        setLoading(false);
        setError("Please log in to view services.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicServices(clinicId, token, String(doctorId || ""));
        if (!cancelled) setServices(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load services.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadServices();
    return () => { cancelled = true; };
  }, [clinicId, token, doctorId, refreshKey]);

  async function handleDeleteService(serviceId) {
    if (!token || !clinicId) {
      setError("Unable to delete service.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this service?");
    if (!confirmed) return;

    try {
      setDeletingServiceId(serviceId);
      setError("");
      await deleteClinicService(clinicId, serviceId, token);
      setServices((items) => items.filter((service) => String(service.id) !== String(serviceId)));
      showToast("Service deleted successfully");
    } catch (err) {
      setError(err.message || "Unable to delete service.");
    } finally {
      setDeletingServiceId(null);
    }
  }

  return <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Services</h3><p>Services offered by this clinic</p></div><button className="btn btn-primary" onClick={() => openModal("service")}>+ Add Service</button></div>
    <div className="card-body">
      {loading && <p className="muted">Loading services...</p>}
      {!loading && error && <div className="auth-error">{error}</div>}
      {!loading && !error && services.length === 0 && <p className="muted">No services found for this clinic.</p>}
      {!loading && !error && <div className="grid-3">{services.map((service) => <div className="card profile-card" key={service.id}>
      <div className="doctor-head"><div className="service-icon">✚</div><div><div className="doctor-name">{service.name}</div><div className="doctor-speciality">{service.durationMinutes} minutes</div></div></div>
      <InfoLine left="Price" right={`₹${Number(service.price).toFixed(2)}`} />
      <div className="quick-actions" style={{ marginTop: 12 }}>
        <button className="btn btn-light icon-btn" title="Manage service" onClick={() => showToast("Service details opened")}>⚙</button>
        <button className="btn btn-danger icon-btn" title="Delete service" disabled={deletingServiceId === service.id} onClick={() => handleDeleteService(service.id)}>{deletingServiceId === service.id ? "…" : "🗑"}</button>
      </div>
    </div>)}</div>}
    </div>
  </div></section>;
}

function Staff({ openModal, clinicId, token, refreshKey }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      if (!token) {
        setUsers([]);
        setLoading(false);
        setError("Please log in to view staff and users.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getClinicUsers(clinicId, token);
        if (!cancelled) setUsers(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load staff and users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => { cancelled = true; };
  }, [clinicId, token, refreshKey]);

  return <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Staff & Users</h3><p>Manage clinic dashboard access and roles</p></div><button className="btn btn-primary" onClick={() => openModal("staff")}>+ Add User</button></div>
    <div className="card-body">
      {loading && <p className="muted">Loading staff and users...</p>}
      {!loading && error && <div className="auth-error">{error}</div>}
      {!loading && !error && users.length === 0 && <p className="muted">No staff or users found for this clinic.</p>}
      {!loading && !error && <div className="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead><tbody>
        {users.map((clinicUser) => <tr key={clinicUser.clinicUserId}><td><div className="patient-cell"><div className="small-avatar">{clinicUser.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{clinicUser.name}</strong><span>Clinic user</span></div></div></td><td>{clinicUser.email}</td><td>{clinicUser.role}</td><td><span className={`status ${clinicUser.status ? "confirmed" : "cancelled"}`}>{clinicUser.status ? "ACTIVE" : "DISABLED"}</span></td><td>{clinicUser.lastLogin || "Never"}</td><td><button className="btn btn-light">Edit</button></td></tr>)}
      </tbody></table></div>}
    </div>
  </div></section>;
}

function AccountSecurity({ showToast }) {
  const { setupAuthenticator, enableAuthenticator, disableAuthenticator } = useAuth();
  const [setup, setSetup] = useState(null);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingEnable, setLoadingEnable] = useState(false);
  const [loadingDisable, setLoadingDisable] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);

  async function handleSetup() {
    setError("");
    setSetup(null);
    setQrCodeImage("");
    try {
      setLoadingSetup(true);
      const result = await setupAuthenticator();
      const data = result?.data || result;
      if (!data?.otpauthUri || !data?.secret) {
        throw new Error("Authenticator setup response did not include the secret and otpauth URI.");
      }
      const { default: QRCode } = await import("qrcode");
      const image = await QRCode.toDataURL(data.otpauthUri, { width: 240, margin: 2 });
      setSetup({ secret: data.secret, otpauthUri: data.otpauthUri });
      setQrCodeImage(image);
      setEnabled(false);
    } catch (err) {
      setError(err.message || "Unable to start authenticator setup.");
    } finally {
      setLoadingSetup(false);
    }
  }

  async function handleEnable(event) {
    event.preventDefault();
    setError("");
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setLoadingEnable(true);
      await enableAuthenticator(code);
      setEnabled(true);
      setVerificationCode("");
      showToast("Authenticator enabled for your account.");
    } catch (err) {
      setError(err.message || "Unable to enable the authenticator.");
    } finally {
      setLoadingEnable(false);
    }
  }

  async function handleDisable(event) {
    event.preventDefault();
    setError("");
    const code = disableCode.trim();
    if (!disablePassword) {
      setError("Enter your current password to disable the authenticator.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setLoadingDisable(true);
      await disableAuthenticator(disablePassword, code);
      setEnabled(false);
      setSetup(null);
      setQrCodeImage("");
      setDisablePassword("");
      setDisableCode("");
      setShowDisableForm(false);
      showToast("Authenticator disabled for your account.");
    } catch (err) {
      setError(err.message || "Unable to disable the authenticator.");
    } finally {
      setLoadingDisable(false);
    }
  }

  return <section className="page active">
    <div className="card">
      <div className="card-header"><div><h3>Authenticator app</h3><p>Use a time-based one-time password (TOTP) app to add a second sign-in step.</p></div></div>
      <div className="card-body">
        {error && <div className="auth-error">{error}</div>}
        {enabled && <div className="auth-success">Authenticator is enabled. You will be asked for a code at your next sign-in.</div>}
        {!setup && !enabled && <div>
          <p className="muted">Set up an authenticator app such as Google Authenticator, Microsoft Authenticator, or 1Password.</p>
          <button className="btn btn-primary" type="button" onClick={handleSetup} disabled={loadingSetup}>{loadingSetup ? "Preparing setup..." : "Set up authenticator"}</button>
        </div>}
        {setup && <div className="grid-2 mt" style={{ alignItems: "start" }}>
          <div>
            <h4>1. Scan this QR code</h4>
            <img src={qrCodeImage} alt="Authenticator setup QR code" width="240" height="240" style={{ display: "block", maxWidth: "100%", height: "auto", border: "1px solid var(--border)", borderRadius: 10, padding: 8, background: "#fff" }} />
            <p className="muted">If you cannot scan the QR, enter this setup key manually:</p>
            <code style={{ overflowWrap: "anywhere", userSelect: "all" }}>{setup.secret}</code>
          </div>
          <form onSubmit={handleEnable} className="auth-form">
            <h4>2. Verify and enable</h4>
            <p className="muted">Enter the current 6-digit code shown by your authenticator app.</p>
            <div className="field">
              <label htmlFor="setup-authenticator-code">Authenticator code</label>
              <input
                id="setup-authenticator-code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                pattern="[0-9]{6}"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loadingEnable}>{loadingEnable ? "Enabling..." : "Enable authenticator"}</button>
            <button className="btn btn-outline" type="button" onClick={handleSetup} disabled={loadingSetup || loadingEnable}>{loadingSetup ? "Refreshing..." : "Generate a new setup key"}</button>
          </form>
        </div>}
        <div className="mt">
          {!showDisableForm && <button className="btn btn-outline" type="button" onClick={() => { setShowDisableForm(true); setError(""); }}>Disable authenticator</button>}
          {showDisableForm && <form onSubmit={handleDisable} className="auth-form" style={{ maxWidth: 440 }}>
            <h4>Disable authenticator</h4>
            <p className="muted">Confirm your current password and enter a current code from your authenticator app.</p>
            <div className="field">
              <label htmlFor="disable-authenticator-password">Current password</label>
              <input id="disable-authenticator-password" type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} autoComplete="current-password" />
            </div>
            <div className="field">
              <label htmlFor="disable-authenticator-code">Authenticator code</label>
              <input id="disable-authenticator-code" value={disableCode} onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" pattern="[0-9]{6}" />
            </div>
            <div className="quick-actions">
              <button className="btn btn-danger" type="submit" disabled={loadingDisable}>{loadingDisable ? "Disabling..." : "Confirm disable"}</button>
              <button className="btn btn-outline" type="button" onClick={() => { setShowDisableForm(false); setDisablePassword(""); setDisableCode(""); setError(""); }} disabled={loadingDisable}>Keep enabled</button>
            </div>
          </form>}
        </div>
      </div>
    </div>
  </section>;
}

function Reports({ showToast }) {
  return <section className="page active"><div className="welcome"><h2>Reports</h2><p>Clinic performance and appointment analytics.</p></div>
    <div className="grid-4"><Kpi label="Appointments" value="412" footer="This month" /><Kpi label="Completed" value="371" footer="90.0% completion" /><Kpi label="Cancelled" value="17" footer="4.1% cancellation" /><Kpi label="New Patients" value="83" footer="↑ 11% vs last month" /></div>
    <div className="card mt"><div className="card-header"><div><h3>Monthly Appointment Report</h3><p>Export detailed data for the selected period.</p></div><button className="btn btn-primary" onClick={() => showToast("Report export started")}>Export CSV</button></div>
      <div className="card-body"><div className="chart report-chart">{[55,61,69,64,75,82,91,88].map((h,i)=><div className="bar-wrap" key={i}><div className="bar" style={{height:`${h}%`}}/><span className="bar-label">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"][i]}</span></div>)}</div></div>
    </div>
  </section>;
}

function Settings({ showToast, clinicId, clinicName, token, canViewClinicProfile }) {
  const clinicProfileFormRef = useRef(null);
  const [form, setForm] = useState({
    name: "Sunrise Multispeciality",
    whatsappNumber: "+91 98765 43210",
    timezone: "Asia/Kolkata",
    countryCode: "IN",
    state: "",
    city: "",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    latitude: "",
    longitude: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [editingClinicId, setEditingClinicId] = useState(null);
  const [workingHoursSaving, setWorkingHoursSaving] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({ phoneNumberId: "", wabaId: "", businessAccountId: "", displayPhoneNumber: "", accessToken: "", status: "ACTIVE" });
  const [whatsappConfigSaving, setWhatsappConfigSaving] = useState(false);
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);
  const [whatsappSdkReady, setWhatsappSdkReady] = useState(false);
  const [clinicQr, setClinicQr] = useState(null);
  const [clinicQrLoading, setClinicQrLoading] = useState(false);
  const [clinicQrError, setClinicQrError] = useState("");
  const [holidayForm, setHolidayForm] = useState({ holidayDate: new Date().toISOString().slice(0, 10), name: "" });
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayList, setHolidayList] = useState([]);
  const [holidayListLoading, setHolidayListLoading] = useState(true);
  const [deletingHolidayId, setDeletingHolidayId] = useState(null);
  const defaultDoctorAvailability = [
    { day: "MONDAY", active: true, start: "09:00", end: "15:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "TUESDAY", active: true, start: "13:00", end: "19:00", breakStart: "", breakEnd: "" },
    { day: "WEDNESDAY", active: true, start: "09:00", end: "15:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "THURSDAY", active: true, start: "13:00", end: "19:00", breakStart: "", breakEnd: "" },
    { day: "FRIDAY", active: true, start: "09:00", end: "15:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "SATURDAY", active: true, start: "09:00", end: "15:00", breakStart: "13:00", breakEnd: "18:00" },
    { day: "SUNDAY", active: false, start: "09:00", end: "15:00", breakStart: "13:00", breakEnd: "14:00" },
  ];
  const [doctorAvailabilitySaving, setDoctorAvailabilitySaving] = useState(false);
  const [doctorAvailabilityLoading, setDoctorAvailabilityLoading] = useState(false);
  const [doctorAvailabilityError, setDoctorAvailabilityError] = useState("");
  const [doctorAvailability, setDoctorAvailability] = useState(defaultDoctorAvailability);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [workingHours, setWorkingHours] = useState(DEFAULT_CLINIC_WORKING_HOURS);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  const clinicQrDisplayName = clinicName || clinicQr?.clinicName || clinicQr?.clinic?.name || form.name || "Clinic";

  useEffect(() => {
    let cancelled = false;

    async function loadWorkingHours() {
      if (!token || !clinicId) {
        setWorkingHours(DEFAULT_CLINIC_WORKING_HOURS);
        setWorkingHoursLoading(false);
        return;
      }

      try {
        setWorkingHoursLoading(true);
        const result = await getClinicWorkingHours(clinicId, token);
        if (!cancelled) setWorkingHours(mapClinicWorkingHours(result));
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load clinic working hours.");
      } finally {
        if (!cancelled) setWorkingHoursLoading(false);
      }
    }

    loadWorkingHours();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadClinics() {
      if (!token) {
        setClinics([]);
        setLoadingClinics(false);
        setError("Please log in to view clinic profiles.");
        return;
      }

      try {
        setLoadingClinics(true);
        const result = await getClinicProfiles(token, clinicId);
        const profiles = Array.isArray(result) ? result : [];
        const visibleProfiles = canViewClinicProfile
          ? profiles
          : profiles.filter((clinic) => String(clinic.id) === String(clinicId));
        if (!cancelled) setClinics(visibleProfiles);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load clinic profiles.");
      } finally {
        if (!cancelled) setLoadingClinics(false);
      }
    }

    loadClinics();
    return () => { cancelled = true; };
  }, [token, clinicId, canViewClinicProfile]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailableDoctors() {
      if (!token || !clinicId) {
        setAvailableDoctors([]);
        setSelectedDoctorId("");
        return;
      }

      try {
        const result = await getClinicDoctors(clinicId, token);
        const doctors = Array.isArray(result) ? result : [];
        if (!cancelled) {
          setAvailableDoctors(doctors);
          setSelectedDoctorId("");
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableDoctors([]);
          setSelectedDoctorId("");
        }
      }
    }

    loadAvailableDoctors();
    return () => { cancelled = true; };
  }, [clinicId, token]);
  const fbInitPromiseRef = useRef(null);
  useEffect(() => {
    const appId = import.meta.env.VITE_META_APP_ID;

    if (!appId) {
        console.error("Meta App ID is missing");
        return;
    }

    let cancelled = false;

    const initializeFacebookSdk = () => {
        if (!window.FB) {
            throw new Error("Facebook SDK loaded but window.FB is unavailable");
        }

        console.log("Calling FB.init()...");

        window.FB.init({
            appId: appId,
            cookie: true,
            xfbml: true,
            version: "v20.0",
        });

        console.log("FB.init() called successfully; waiting for SDK readiness");

        return new Promise((resolve) => {
          window.FB.getLoginStatus(() => {
            if (!cancelled) setWhatsappSdkReady(true);
            resolve(window.FB);
          });
        });
    };

    fbInitPromiseRef.current = new Promise((resolve, reject) => {

        // FB already exists
        if (window.FB) {
            try {
                initializeFacebookSdk().then(resolve).catch(reject);
            } catch (error) {
                console.error("FB initialization failed:", error);
                reject(error);
            }
            return;
        }

        // Facebook SDK callback
        window.fbAsyncInit = () => {
            try {
                console.log("fbAsyncInit fired");

                initializeFacebookSdk().then(resolve).catch(reject);

            } catch (error) {
                console.error("FB initialization failed:", error);
                reject(error);
            }
        };

        let script = document.getElementById("facebook-jssdk");

        if (!script) {
            console.log("Loading Facebook SDK...");

            script = document.createElement("script");
            script.id = "facebook-jssdk";
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";

            script.onerror = () => {
                reject(new Error("Failed to load Facebook SDK"));
            };

            document.body.appendChild(script);
        } else {
            console.log("Facebook SDK script already exists");
        }
    });

    return () => {
        cancelled = true;
    };

}, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHolidays() {
      if (!token || !clinicId) {
        setHolidayList([]);
        setHolidayListLoading(false);
        return;
      }

      try {
        setHolidayListLoading(true);
        const result = await getClinicHolidays(clinicId, token);
        const holidays = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.content)
              ? result.content
              : [];
        if (!cancelled) setHolidayList(holidays);
      } catch (err) {
        if (!cancelled) setHolidayList([]);
      } finally {
        if (!cancelled) setHolidayListLoading(false);
      }
    }

    loadHolidays();
    return () => { cancelled = true; };
  }, [clinicId, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadDoctorAvailabilitySchedule() {
      if (!token || !clinicId || !selectedDoctorId) {
        setDoctorAvailability(defaultDoctorAvailability);
        setDoctorAvailabilityLoading(false);
        setDoctorAvailabilityError("");
        return;
      }

      try {
        setDoctorAvailabilityLoading(true);
        setDoctorAvailabilityError("");
        const result = await getDoctorAvailability(clinicId, Number(selectedDoctorId), token);
        const items = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.content)
              ? result.content
              : [];

        if (cancelled) return;

        const mapped = defaultDoctorAvailability.map((slot) => {
          const match = items.find((item) => String(item.dayOfWeek || item.day || item.day_of_week) === String(slot.day));
          if (!match) return slot;

          return {
            ...slot,
            active: match.active ?? true,
            start: match.startTime || match.start || slot.start,
            end: match.endTime || match.end || slot.end,
            breakStart: match.breakStartTime || match.breakStart || "",
            breakEnd: match.breakEndTime || match.breakEnd || "",
          };
        });

        setDoctorAvailability(mapped);
      } catch (err) {
        if (!cancelled) {
          setDoctorAvailability(defaultDoctorAvailability);
          setDoctorAvailabilityError(err.message || "Unable to load doctor availability.");
        }
      } finally {
        if (!cancelled) setDoctorAvailabilityLoading(false);
      }
    }

    loadDoctorAvailabilitySchedule();
    return () => { cancelled = true; };
  }, [clinicId, selectedDoctorId, token]);

  async function handleSave() {
    if (!token) {
      setError("A clinic-admin login token is required.");
      return;
    }

    if (!form.name.trim() || !form.whatsappNumber.trim() || !form.timezone) {
      setError("Please fill all clinic profile fields.");
      return;
    }

    try {
      if (!canViewClinicProfile) return;
      setSaving(true);
      setError("");
      const payload = {
        name: form.name.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        timezone: form.timezone,
        countryCode: form.countryCode.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };
      let createdClinic = null;
      if (editingClinicId === null) {
        createdClinic = await saveClinicProfile(payload, token, clinicId);
      } else {
        await updateClinicProfile(editingClinicId, payload, token);
      }
      const result = await getClinicProfiles(token, clinicId);
      setClinics(Array.isArray(result) ? result : []);
      setEditingClinicId(null);
      const savedMessage = createdClinic?.message || (editingClinicId === null ? "Clinic profile saved" : "Clinic profile updated");
      showToast(savedMessage);
    } catch (err) {
      const code = err?.code || "UNKNOWN";
      const friendlyMessage = err.message || "Unable to save clinic profile.";
      setError(`${friendlyMessage}${code && code !== "UNKNOWN" ? ` (${code})` : ""}`);
      showToast(friendlyMessage);
    } finally {
      setSaving(false);
    }
  }

  function editClinic(clinic) {
    setActiveTab("profile");
    setEditingClinicId(clinic.id);
    setForm({
      name: clinic.name || "",
      whatsappNumber: clinic.whatsappNumber || "",
      timezone: clinic.timezone || "Asia/Kolkata",
      countryCode: clinic.countryCode || "",
      state: clinic.state || "",
      city: clinic.city || "",
      postalCode: clinic.postalCode || "",
      addressLine1: clinic.addressLine1 || "",
      addressLine2: clinic.addressLine2 || "",
      latitude: clinic.latitude ?? "",
      longitude: clinic.longitude ?? "",
    });
    setError("");
    clinicProfileFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingClinicId(null);
    setForm({ name: "", whatsappNumber: "", timezone: "Asia/Kolkata", countryCode: "", state: "", city: "", postalCode: "", addressLine1: "", addressLine2: "", latitude: "", longitude: "" });
    setError("");
  }

  async function handleHolidaySave() {
    if (!token) {
      setError("A clinic-admin login token is required.");
      return;
    }

    if (!clinicId) {
      setError("Please select a clinic first.");
      return;
    }

    if (!holidayForm.holidayDate || !holidayForm.name.trim()) {
      setError("Please enter both holiday date and holiday name.");
      return;
    }

    try {
      setHolidaySaving(true);
      setError("");
      await createClinicHoliday(clinicId, {
        holidayDate: holidayForm.holidayDate,
        name: holidayForm.name.trim(),
      }, token);

      const result = await getClinicHolidays(clinicId, token);
      const holidays = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.content)
            ? result.content
            : [];
      setHolidayList(holidays);
      setHolidayForm({ holidayDate: new Date().toISOString().slice(0, 10), name: "" });
      showToast("Clinic holiday saved");
    } catch (err) {
      setError(err.message || "Unable to save clinic holiday.");
    } finally {
      setHolidaySaving(false);
    }
  }

  async function handleHolidayDelete(holiday) {
    if (!token || !clinicId || !holiday?.id) {
      setError("Unable to delete this clinic holiday.");
      return;
    }

    const confirmed = window.confirm(`Delete the holiday "${holiday.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingHolidayId(holiday.id);
      setError("");
      await deleteClinicHoliday(clinicId, holiday.id, token);
      setHolidayList((items) => items.filter((item) => String(item.id) !== String(holiday.id)));
      showToast("Clinic holiday deleted successfully");
    } catch (err) {
      setError(err.message || "Unable to delete clinic holiday.");
    } finally {
      setDeletingHolidayId(null);
    }
  }

  async function handleDoctorAvailabilitySave() {
    if (!token) {
      setError("A clinic-admin login token is required.");
      return;
    }

    if (!clinicId) {
      setError("Please select a clinic first.");
      return;
    }

    const targetDoctorId = Number(selectedDoctorId);
    if (!targetDoctorId) {
      setError("Please select a valid doctor before saving availability.");
      return;
    }

    try {
      setDoctorAvailabilitySaving(true);
      setError("");
      const payload = doctorAvailability.filter((slot) => slot.active).map((slot) => ({
        dayOfWeek: slot.day,
        startTime: slot.start,
        endTime: slot.end,
        breakStartTime: slot.breakStart || null,
        breakEndTime: slot.breakEnd || null,
        active: slot.active,
      }));

      await saveDoctorAvailability(clinicId, targetDoctorId, payload, token);
      showToast("Doctor availability saved");
    } catch (err) {
      setError(err.message || "Unable to save doctor availability.");
    } finally {
      setDoctorAvailabilitySaving(false);
    }
  }
  
  async function handleWhatsAppConfigSave() {
    if (!token) {
      setError("A clinic-admin login token is required.");
      return;
    }

    if (!clinicId) {
      setError("Please select a clinic first.");
      return;
    }

    const requiredFields = ["phoneNumberId", "wabaId", "displayPhoneNumber", "accessToken"];
    if (requiredFields.some((field) => !whatsappConfig[field].trim())) {
      setError("Please fill all required WhatsApp configuration fields.");
      return;
    }

    try {
      setWhatsappConfigSaving(true);
      setError("");
      await saveClinicWhatsAppConfig(clinicId, {
        phoneNumberId: whatsappConfig.phoneNumberId.trim(),
        wabaId: whatsappConfig.wabaId.trim(),
        businessAccountId: whatsappConfig.businessAccountId.trim() || null,
        displayPhoneNumber: whatsappConfig.displayPhoneNumber.trim(),
        accessToken: whatsappConfig.accessToken.trim(),
        status: whatsappConfig.status,
      }, token);
      showToast("WhatsApp configuration saved");
    } catch (err) {
      const code = err?.code || "UNKNOWN";
      const friendlyMessage = err.message || "Unable to save WhatsApp configuration.";
      setError(`${friendlyMessage}${code && code !== "UNKNOWN" ? ` (${code})` : ""}`);
      showToast(friendlyMessage);
    } finally {
      setWhatsappConfigSaving(false);
    }
  }

  async function handleClinicQrGenerate() {
    if (!token) {
      setClinicQrError("A clinic-admin login token is required.");
      return;
    }
    if (!clinicId) {
      setClinicQrError("Please select a clinic first.");
      return;
    }

    try {
      setClinicQrLoading(true);
      setClinicQrError("");
      const response = await generateClinicQr(clinicId, token);
      const qrData = response?.data;
      if (!qrData?.qrImageBase64) throw new Error("The clinic QR image was not returned by the server.");
      setClinicQr({ ...qrData, image: `data:image/png;base64,${qrData.qrImageBase64}` });
    } catch (err) {
      setClinicQrError(err.message || "Unable to generate clinic QR code.");
    } finally {
      setClinicQrLoading(false);
    }
  }

  async function createClinicQrTemplateBlob() {
    if (!clinicQr?.image) throw new Error("Generate the clinic QR code before sharing it.");

    const loadImage = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load the clinic QR template images."));
      image.src = source;
    });
    const [logo, qrImage, whatsappImage] = await Promise.all([
      loadImage(holaMdLogo),
      loadImage(clinicQr.image),
      loadImage(whatsAppIcon),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1215;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create the clinic QR template image.");

    const roundedRect = (x, y, width, height, radius, fill, stroke, lineWidth = 1) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke) {
        context.lineWidth = lineWidth;
        context.strokeStyle = stroke;
        context.stroke();
      }
    };
    const drawCircleImage = (image, x, y, size) => {
      context.save();
      context.beginPath();
      context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, x, y, size, size);
      context.restore();
    };
    const fitText = (text, maxWidth, fontSize, weight = 700) => {
      let size = fontSize;
      context.font = `${weight} ${size}px Arial, sans-serif`;
      while (context.measureText(text).width > maxWidth && size > 22) {
        size -= 1;
        context.font = `${weight} ${size}px Arial, sans-serif`;
      }
      return size;
    };

    const background = context.createLinearGradient(0, 0, 1000, 1215);
    background.addColorStop(0, "#f8fbf8");
    background.addColorStop(1, "#eaf3ed");
    roundedRect(5, 5, 990, 1205, 50, background, "#d8e2dc", 8);

    drawCircleImage(logo, 42, 38, 116);
    context.fillStyle = "#214d44";
    context.font = "700 46px Arial, sans-serif";
    context.fillText("Hola MD", 180, 91);
    context.fillStyle = "#5d7c73";
    context.font = "24px Arial, sans-serif";
    context.fillText("Your Health, Our Care", 182, 123);

    roundedRect(650, 54, 308, 100, 42, "#e0eee6");
    context.fillStyle = "#214d44";
    context.font = "700 50px Arial, sans-serif";
    context.fillText("+", 682, 119);
    const clinicNameSize = fitText(clinicQrDisplayName, 224, 31);
    context.font = `700 ${clinicNameSize}px Arial, sans-serif`;
    context.fillText(clinicQrDisplayName, 737, 116);

    roundedRect(155, 190, 690, 690, 48, "#f8fbf8", "#dbe8e0", 7);
    roundedRect(185, 220, 630, 630, 32, "#ffffff");
    context.drawImage(qrImage, 208, 243, 584, 584);

    roundedRect(42, 927, 916, 244, 46, "#e0eee6");
    drawCircleImage(whatsappImage, 72, 971, 154);
    context.fillStyle = "#173c32";
    context.font = "700 38px Arial, sans-serif";
    context.fillText("Scan this QR code", 255, 1032);
    context.font = "24px Arial, sans-serif";
    const caption = `Book your first appointment with ${clinicQrDisplayName} on WhatsApp.`;
    const captionMaxWidth = 665;
    const words = caption.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      if (context.measureText(nextLine).width > captionMaxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = nextLine;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((captionLine, index) => {
      context.fillText(captionLine, 255, 1075 + index * 34);
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create the clinic QR template image."));
      }, "image/png");
    });
  }

  async function handleClinicQrPrint() {
    if (!clinicQr?.image) {
      setClinicQrError("Generate the clinic QR code before printing it.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setClinicQrError("Allow pop-ups to print the clinic QR code.");
      return;
    }

    const printDocument = printWindow.document;
    printDocument.title = `${clinicQrDisplayName} QR Code`;
    printDocument.body.innerHTML = "";
    const style = printDocument.createElement("style");
    style.textContent = "*,*:before,*:after{box-sizing:border-box}body{margin:0;padding:24px;font-family:Arial,sans-serif;color:#214d44;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.clinic-qr-card{width:min(100%,520px);margin:0 auto;overflow:hidden;border:2px solid #d8e2dc;border-radius:24px;background:linear-gradient(145deg,#f8fbf8,#eaf3ed);box-shadow:0 10px 28px rgba(35,68,60,.1)}.clinic-qr-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 10px}.clinic-qr-brand{display:flex;align-items:center;gap:10px;min-width:0}.clinic-qr-brand img{width:52px;height:52px;flex:0 0 52px;border-radius:50%;object-fit:cover;background:#fff}.clinic-qr-brand-copy{display:flex;flex-direction:column;line-height:1.15}.clinic-qr-brand-copy strong{font-size:20px;white-space:nowrap}.clinic-qr-brand-copy span{font-size:10px;color:#5d7c73;white-space:nowrap}.clinic-qr-name{display:flex;align-items:center;gap:8px;min-width:0;padding:11px 12px;border-radius:18px;background:#e0eee6}.clinic-qr-name-icon{font-size:24px;font-weight:800;line-height:1}.clinic-qr-name strong{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qr-panel{padding:12px 16px 16px}.qr-frame{width:min(100%,360px);margin:0 auto;padding:12px;border:3px solid #dbe8e0;border-radius:24px;background:#f8fbf8;box-shadow:0 5px 14px rgba(35,68,60,.08)}.qr-image{display:block;width:100%;padding:7px;border-radius:14px;background:#fff}.clinic-qr-footer{display:flex;align-items:center;gap:12px;margin:0 10px 10px;padding:12px 14px;border-radius:22px;background:#e0eee6;color:#173c32}.whatsapp-icon{width:60px;height:60px;flex:0 0 60px;display:block;object-fit:contain;border-radius:50%;box-shadow:0 2px 5px rgba(35,68,60,.18)}.footer-copy{display:flex;flex-direction:column;gap:4px;min-width:0}.footer-copy strong{font-size:18px}.footer-copy span{font-size:13px;line-height:1.4}@page{margin:12mm}@media print{body{padding:0}.clinic-qr-card{width:min(100%,150mm);box-shadow:none;break-inside:avoid}}";
    const card = printDocument.createElement("main");
    card.className = "clinic-qr-card";
    const header = printDocument.createElement("header");
    header.className = "clinic-qr-header";
    const brand = printDocument.createElement("div");
    brand.className = "clinic-qr-brand";
    const logo = printDocument.createElement("img");
    logo.alt = "";
    const brandCopy = printDocument.createElement("div");
    brandCopy.className = "clinic-qr-brand-copy";
    const brandName = printDocument.createElement("strong");
    brandName.textContent = "Hola MD";
    const tagline = printDocument.createElement("span");
    tagline.textContent = "Your Health, Our Care";
    brandCopy.append(brandName, tagline);
    brand.append(logo, brandCopy);
    const clinicNameBadge = printDocument.createElement("div");
    clinicNameBadge.className = "clinic-qr-name";
    const clinicIcon = printDocument.createElement("span");
    clinicIcon.className = "clinic-qr-name-icon";
    clinicIcon.setAttribute("aria-hidden", "true");
    clinicIcon.textContent = "✚";
    const clinicNameElement = printDocument.createElement("strong");
    clinicNameElement.textContent = clinicQrDisplayName;
    clinicNameBadge.append(clinicIcon, clinicNameElement);
    header.append(brand, clinicNameBadge);
    const qrPanel = printDocument.createElement("section");
    qrPanel.className = "qr-panel";
    const qrFrame = printDocument.createElement("div");
    qrFrame.className = "qr-frame";
    const image = printDocument.createElement("img");
    image.className = "qr-image";
    image.alt = `WhatsApp QR code for ${clinicQrDisplayName}`;
    qrFrame.appendChild(image);
    qrPanel.appendChild(qrFrame);
    const footer = printDocument.createElement("footer");
    footer.className = "clinic-qr-footer";
    const whatsappImage = printDocument.createElement("img");
    whatsappImage.className = "whatsapp-icon";
    whatsappImage.alt = "";
    const footerCopy = printDocument.createElement("div");
    footerCopy.className = "footer-copy";
    const prompt = printDocument.createElement("strong");
    prompt.textContent = "Scan this QR code";
    const caption = printDocument.createElement("span");
    caption.textContent = `Book your first appointment with ${clinicQrDisplayName} on WhatsApp.`;
    footerCopy.append(prompt, caption);
    footer.append(whatsappImage, footerCopy);
    card.append(header, qrPanel, footer);
    printDocument.head.appendChild(style);
    printDocument.body.appendChild(card);

    const imageSources = [
      [logo, holaMdLogo],
      [image, clinicQr.image],
      [whatsappImage, whatsAppIcon],
    ];
    const imageLoads = imageSources.map(([element, source]) => new Promise((resolve, reject) => {
      element.onload = resolve;
      element.onerror = () => reject(new Error("Unable to load the clinic QR template images for printing."));
      element.src = source;
    }));
    try {
      await Promise.all(imageLoads);
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      printWindow.close();
      setClinicQrError(err.message || "Unable to load the clinic QR template for printing.");
    }
  }

  async function handleClinicQrShare() {
    try {
      const templateBlob = await createClinicQrTemplateBlob();
      if (typeof File !== "undefined" && navigator.share) {
        const file = new File([templateBlob], `clinic-${clinicId}-qr-template.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${clinicQrDisplayName} WhatsApp QR Code`,
            text: `Scan this QR code to book an appointment with ${clinicQrDisplayName} on WhatsApp.`,
          });
          return;
        }
      }

      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": templateBlob })]);
        showToast("Clinic QR template copied. Paste it into a message to share.");
        return;
      }

      const downloadUrl = URL.createObjectURL(templateBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `clinic-${clinicId}-qr-template.png`;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
      showToast("Clinic QR template downloaded so you can share it.");
    } catch (err) {
      if (err.name !== "AbortError") {
        showToast(err.message || "Unable to share the clinic QR code.");
      }
    }
  }

function launchWhatsAppSignup() {
    const appId = import.meta.env.VITE_META_APP_ID;
    const configId = import.meta.env.VITE_META_WHATSAPP_CONFIG_ID;

    console.log(
        "Launching WhatsApp signup with appId:",
        appId,
        "and configId:",
        configId
    );

    if (!appId || !configId) {
        setError(
            "Meta App ID and WhatsApp Signup Config ID must be configured."
        );
        return;
    }

    console.log(
        "WhatsApp SDK ready:",
        whatsappSdkReady,
        "FB object:",
        window.FB
    );

    console.log("===== WhatsApp SDK CHECK =====");
    console.log("whatsappSdkReady:", whatsappSdkReady);
    console.log("window.FB:", window.FB);
    console.log("window.location.protocol:", window.location.protocol);
    console.log("window.location.href:", window.location.href);
    console.log("==============================");

    if (!clinicId) {
        setError("Please select a clinic first.");
        return;
    }

    setWhatsappConnecting(true);
    setError("");

    const startLogin = (fb) => {
      // Keep FB.login's callback synchronous; backend work is handled separately.
      fb.login(
        (response) => handleWhatsAppSignupResponse(response),
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
        }
      );
    };

    if (fbInitPromiseRef.current) {
      fbInitPromiseRef.current.then(startLogin).catch((err) => {
        setWhatsappConnecting(false);
        setError(err.message || "Unable to initialize WhatsApp signup.");
      });
    } else {
      setWhatsappConnecting(false);
      setError("WhatsApp signup is still loading. Please try again in a moment.");
    }
}

const handleWhatsAppSignupResponse = async (response) => {
    try {
        console.log("WhatsApp signup response:", response);

        const code = response?.authResponse?.code;

        if (!code) {
            setError(
                "WhatsApp authorization was cancelled or not granted."
            );
            setWhatsappConnecting(false);
            return;
        }

        console.log("WhatsApp authorization code received");

        await connectClinicWhatsApp(
            clinicId,
            code,
            token
        );

        console.log("WhatsApp connected to backend successfully");

        setWhatsappConfig((value) => ({
            ...value,
          status: "ACTIVE",
        }));

        showToast("WhatsApp connected successfully");

    } catch (err) {

        console.error(
            "WhatsApp signup failed:",
            err
        );

        const message =
            err?.message ||
            "Unable to connect WhatsApp.";

        setError(message);
        showToast(message);

    } finally {
        setWhatsappConnecting(false);
    }
};
  return <section className="page active"><div className="card"><div className="settings-grid">
    <div className="settings-nav">
      <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Clinic Profile</button>
      <button className={activeTab === "holidays" ? "active" : ""} onClick={() => setActiveTab("holidays")}>Clinic Holidays</button>
      <button className={activeTab === "doctor" ? "active" : ""} onClick={() => setActiveTab("doctor")}>Doctor Availability</button>
      <button className={activeTab === "hours" ? "active" : ""} onClick={() => setActiveTab("hours")}>Working Hours</button>
      <button className={activeTab === "whatsapp" ? "active" : ""} onClick={() => setActiveTab("whatsapp")}>WhatsApp Configuration</button>
      <button className={activeTab === "policy" ? "active" : ""} onClick={() => setActiveTab("policy")}>Clinic Policy</button>
    </div>
    <div className="settings-main">
      {error && <div className="auth-error">{error}</div>}
      {activeTab === "profile" && canViewClinicProfile && <div ref={clinicProfileFormRef} style={{ scrollMarginTop: 24 }}><h3>Clinic Profile</h3><p className="muted">Basic information displayed across your clinic dashboard.</p>
      {editingClinicId !== null && <div className="auth-warning">Editing clinic #{editingClinicId}</div>}
      <div className="form-grid mt">
        <Field label="Clinic Name" value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} />
        <Field label="Clinic ID" value={clinicId} disabled />
        <Field label="WhatsApp Number" value={form.whatsappNumber} onChange={(e) => setForm((value) => ({ ...value, whatsappNumber: e.target.value }))} />
        <Field label="Timezone" select options={["Asia/Kolkata"]} value={form.timezone} onChange={(e) => setForm((value) => ({ ...value, timezone: e.target.value }))} />
        <Field label="Country Code" value={form.countryCode} onChange={(e) => setForm((value) => ({ ...value, countryCode: e.target.value }))} placeholder="IN" />
        <Field label="State" value={form.state} onChange={(e) => setForm((value) => ({ ...value, state: e.target.value }))} />
        <Field label="City" value={form.city} onChange={(e) => setForm((value) => ({ ...value, city: e.target.value }))} />
        <Field label="Postal Code" value={form.postalCode} onChange={(e) => setForm((value) => ({ ...value, postalCode: e.target.value }))} />
        <Field label="Address Line 1" value={form.addressLine1} onChange={(e) => setForm((value) => ({ ...value, addressLine1: e.target.value }))} />
        <Field label="Address Line 2" value={form.addressLine2} onChange={(e) => setForm((value) => ({ ...value, addressLine2: e.target.value }))} />
        <Field label="Latitude" type="number" step="any" value={form.latitude} onChange={(e) => setForm((value) => ({ ...value, latitude: e.target.value }))} />
        <Field label="Longitude" type="number" step="any" value={form.longitude} onChange={(e) => setForm((value) => ({ ...value, longitude: e.target.value }))} />
      </div>
      <div className="quick-actions mt">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingClinicId === null ? "Save Changes" : "Update Clinic"}</button>
        {editingClinicId !== null && <button className="btn btn-outline" onClick={cancelEdit} disabled={saving}>Cancel Edit</button>}
      </div>
      </div>}
      {activeTab === "profile" && <div className="mt">
        <h3>Saved Clinic Profiles</h3>
        {loadingClinics && <p className="muted">Loading clinic profiles...</p>}
        {!loadingClinics && clinics.length === 0 && <p className="muted">No clinic profiles found.</p>}
        {!loadingClinics && clinics.length > 0 && <div className="table-wrap"><table><thead><tr><th>ID</th><th>Clinic Name</th><th>WhatsApp Number</th><th>Timezone</th><th>Status</th><th>Created</th>{canViewClinicProfile && <th>Action</th>}</tr></thead><tbody>
          {clinics.map((clinic) => <tr key={clinic.id}><td>{clinic.id}</td><td><strong>{clinic.name}</strong></td><td>{clinic.whatsappNumber}</td><td>{clinic.timezone}</td><td><span className={`status ${clinic.active ? "confirmed" : "cancelled"}`}>{clinic.active ? "ACTIVE" : "INACTIVE"}</span></td><td>{clinic.createdAt ? new Date(clinic.createdAt).toLocaleDateString() : "-"}</td>{canViewClinicProfile && <td><button className="btn btn-light" onClick={() => editClinic(clinic)}>Edit</button></td>}</tr>)}
        </tbody></table></div>}
      </div>}
      {activeTab === "holidays" && <div className="mt">
        <h3>Clinic Holidays</h3>
        <p className="muted">Create a holiday that will be marked for this clinic.</p>
        <div className="form-grid mt">
          <Field label="Holiday Date" type="date" value={holidayForm.holidayDate} onChange={(e) => setHolidayForm((value) => ({ ...value, holidayDate: e.target.value }))} />
          <Field label="Holiday Name" value={holidayForm.name} onChange={(e) => setHolidayForm((value) => ({ ...value, name: e.target.value }))} placeholder="e.g. Gandhi Jayanti" />
        </div>
        <div className="quick-actions mt">
          <button className="btn btn-primary" onClick={handleHolidaySave} disabled={holidaySaving}>{holidaySaving ? "Saving..." : "Save Holiday"}</button>
        </div>
        <div className="holiday-settings mt">
          {holidayListLoading && <p className="muted">Loading clinic holidays...</p>}
          {!holidayListLoading && holidayList.length === 0 && <p className="muted">No holidays saved for this clinic yet.</p>}
          {!holidayListLoading && holidayList.length > 0 && <div className="holiday-settings-list">{holidayList.filter((holiday) => holiday.active !== false).map((holiday) => {
            const holidayDate = holiday.holidayDate || holiday.holiday_date || holiday.date;
            const parsedDate = holidayDate ? new Date(`${holidayDate}T00:00:00`) : null;
            return <div className="holiday-settings-row" key={holiday.id || `${holidayDate}-${holiday.name}`}>
              <div className="holiday-settings-date">{parsedDate ? parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : holidayDate || "-"}</div>
              <div className="holiday-settings-name">{holiday.name}</div>
              <button className="btn btn-danger icon-btn" title="Delete holiday" aria-label={`Delete holiday ${holiday.name}`} disabled={deletingHolidayId === holiday.id} onClick={() => handleHolidayDelete(holiday)}>{deletingHolidayId === holiday.id ? "…" : "✕"}</button>
            </div>;
          })}</div>}
        </div>
      </div>}
      {activeTab === "doctor" && <div className="mt">
        <h3>Doctor Availability</h3>
        <p className="muted">Set the doctor’s schedule for each day of the week.</p>
        <div className="form-grid mt">
          <div className="field">
            <label>Doctor</label>
            <select value={selectedDoctorId} onChange={(e) => {
              setSelectedDoctorId(e.target.value);
              setDoctorAvailabilityError("");
            }} disabled={availableDoctors.length === 0}>
              <option value="">{availableDoctors.length === 0 ? "No doctors available" : "Select doctor"}</option>
              {availableDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          </div>
        </div>
        {!selectedDoctorId && <p className="muted">Select a doctor to view or edit availability.</p>}
        {selectedDoctorId && doctorAvailabilityLoading && <p className="muted" role="status">Loading doctor availability...</p>}
        {selectedDoctorId && doctorAvailabilityError && <div className="auth-error" role="alert">{doctorAvailabilityError}</div>}
        {selectedDoctorId && !doctorAvailabilityLoading && !doctorAvailabilityError && <><div className="working-hours-list">
          {doctorAvailability.map((slot, index) => <div className={`working-hour-row ${slot.active ? "" : "disabled"}`} key={slot.day}>
            <label className="day-toggle"><input type="checkbox" checked={slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, active: e.target.checked } : item))} /><strong>{slot.day}</strong></label>
            <div className="working-time"><label>Start<input type="time" value={slot.start} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, start: e.target.value } : item))} /></label><span>to</span><label>End<input type="time" value={slot.end} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, end: e.target.value } : item))} /></label></div>
            <div className="working-time"><label>Break from<input type="time" value={slot.breakStart || ""} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakStart: e.target.value } : item))} /></label><span>to</span><label>Break to<input type="time" value={slot.breakEnd || ""} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakEnd: e.target.value } : item))} /></label></div>
          </div>)}
        </div>
        <button className="btn btn-primary mt" onClick={handleDoctorAvailabilitySave} disabled={doctorAvailabilitySaving}>{doctorAvailabilitySaving ? "Saving..." : "Save Doctor Availability"}</button></>}
      </div>}
      {activeTab === "hours" && <div className="working-hours mt">
        <h3>Working Hours</h3>
        <p className="muted">Set the clinic schedule and daily break times.</p>
        {workingHoursLoading && <p className="muted">Loading saved working hours...</p>}
        <div className="working-hours-list">
          {workingHours.map((hours, index) => <div className={`working-hour-row ${hours.active ? "" : "disabled"}`} key={hours.day}>
            <label className="day-toggle"><input type="checkbox" checked={hours.active} onChange={(e) => setWorkingHours((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, active: e.target.checked } : item))} /><strong>{hours.day}</strong></label>
            <div className="working-time"><label>Open<input type="time" value={hours.start} disabled={!hours.active} onChange={(e) => setWorkingHours((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, start: e.target.value } : item))} /></label><span>to</span><label>Close<input type="time" value={hours.end} disabled={!hours.active} onChange={(e) => setWorkingHours((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, end: e.target.value } : item))} /></label></div>
            <div className="working-time"><label>Break from<input type="time" value={hours.breakStart} disabled={!hours.active} onChange={(e) => setWorkingHours((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakStart: e.target.value } : item))} /></label><span>to</span><label>Break to<input type="time" value={hours.breakEnd} disabled={!hours.active} onChange={(e) => setWorkingHours((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakEnd: e.target.value } : item))} /></label></div>
          </div>)}
        </div>
        <button className="btn btn-primary mt" onClick={async () => {
          if (!token) {
            setError("A clinic-admin login token is required.");
            return;
          }
          if (!clinicId) {
            setError("Please select a clinic first.");
            return;
          }
          try {
            setWorkingHoursSaving(true);
            setError("");
            const result = await upsertClinicWorkingHours(clinicId, workingHours.map((hours) => ({
              dayOfWeek: hours.day,
              startTime: hours.start,
              endTime: hours.end,
              breakStartTime: hours.breakStart,
              breakEndTime: hours.breakEnd,
              active: hours.active,
            })), token);
            const savedMessage = result?.message || "Working hours saved successfully";
            showToast(savedMessage);
          } catch (err) {
            const code = err?.code || "UNKNOWN";
            const friendlyMessage = err.message || "Unable to save working hours.";
            setError(`${friendlyMessage}${code && code !== "UNKNOWN" ? ` (${code})` : ""}`);
            showToast(friendlyMessage);
          } finally {
            setWorkingHoursSaving(false);
          }
        }} disabled={workingHoursSaving || workingHoursLoading}>{workingHoursSaving ? "Saving..." : "Save Working Hours"}</button>
        </div>}
      {activeTab === "whatsapp" && <div className="mt">
        {canViewClinicProfile && <>
        <h3>WhatsApp Configuration</h3>
        <p className="muted">Configure the WhatsApp Business connection for this clinic.</p>
        <div className="quick-actions mt">
          <button className="btn btn-primary" onClick={launchWhatsAppSignup} disabled={whatsappConnecting}>{whatsappConnecting ? "Connecting..." : "Connect WhatsApp to Hola MD"}</button>
          <span className={`status ${whatsappConfig.status === "ACTIVE" && whatsappConfig.phoneNumberId ? "confirmed" : "pending"}`}>{whatsappConfig.status === "ACTIVE" && whatsappConfig.phoneNumberId ? "CONNECTED" : "NOT CONNECTED"}</span>
        </div>
        <div className="form-grid mt">
          <Field label="Phone Number ID *" value={whatsappConfig.phoneNumberId} onChange={(e) => setWhatsappConfig((value) => ({ ...value, phoneNumberId: e.target.value }))} />
          <Field label="WABA ID *" value={whatsappConfig.wabaId} onChange={(e) => setWhatsappConfig((value) => ({ ...value, wabaId: e.target.value }))} />
          <Field label="Business Account ID" value={whatsappConfig.businessAccountId} onChange={(e) => setWhatsappConfig((value) => ({ ...value, businessAccountId: e.target.value }))} />
          <Field label="Display Phone Number *" value={whatsappConfig.displayPhoneNumber} onChange={(e) => setWhatsappConfig((value) => ({ ...value, displayPhoneNumber: e.target.value }))} placeholder="+91..." />
          <Field label="Access Token *" type="password" value={whatsappConfig.accessToken} onChange={(e) => setWhatsappConfig((value) => ({ ...value, accessToken: e.target.value }))} />
          <div className="field">
            <label>Status *</label>
            <select value={whatsappConfig.status} onChange={(e) => setWhatsappConfig((value) => ({ ...value, status: e.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DISCONNECTED">DISCONNECTED</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary mt" onClick={handleWhatsAppConfigSave} disabled={whatsappConfigSaving}>{whatsappConfigSaving ? "Saving..." : "Save WhatsApp Configuration"}</button>
        </>}
        <div className="holiday-settings mt">
          <h3>Clinic QR Code</h3>
          <p className="muted">Generate a WhatsApp QR code for this clinic.</p>
          <button className="btn btn-primary" onClick={handleClinicQrGenerate} disabled={clinicQrLoading}>{clinicQrLoading ? "Generating..." : "Generate Clinic QR Code"}</button>
          {clinicQrError && <div className="auth-error" style={{ marginTop: 12 }}>{clinicQrError}</div>}
          {clinicQr?.image && <div className="clinic-qr-preview">
            <div className="patient-qr-card clinic-qr-card">
              <div className="clinic-qr-header">
                <div className="clinic-qr-brand">
                  <img src={holaMdLogo} alt="" />
                  <div>
                    <strong>Hola MD</strong>
                    <span>Your Health, Our Care</span>
                  </div>
                </div>
                <div className="clinic-qr-name">
                  <span className="clinic-qr-name-icon" aria-hidden="true">✚</span>
                  <strong>{clinicQrDisplayName}</strong>
                </div>
              </div>
              <div className="patient-qr-qr-panel">
                <div className="patient-qr-code-wrap">
                  <img src={clinicQr.image} alt={`WhatsApp QR code for ${clinicQrDisplayName}`} />
                </div>
              </div>
              <div className="patient-qr-footer clinic-qr-footer">
                <img className="clinic-qr-whatsapp-icon" src={whatsAppIcon} alt="" />
                <div className="clinic-qr-footer-copy">
                  <strong>Scan this QR code</strong>
                  <span>Book your first appointment with {clinicQrDisplayName} on WhatsApp.</span>
                </div>
              </div>
            </div>
            <div className="quick-actions" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => window.open(clinicQr.image, "_blank", "noopener,noreferrer")}>Open QR Image</button>
              <a className="btn btn-primary" href={clinicQr.image} download={`clinic-${clinicId}-qr.png`}>Download QR</a>
              <button className="btn btn-outline" onClick={handleClinicQrPrint}>Print QR</button>
              <button className="btn btn-outline" onClick={handleClinicQrShare}>Share QR</button>
            </div>
          </div>}
        </div>
      </div>}
      {activeTab === "policy" && <ClinicPolicySettings clinicId={clinicId} token={token} showToast={showToast} />}
      </div></div></div></section>;
}
