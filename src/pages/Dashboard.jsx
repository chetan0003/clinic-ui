import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cancelAppointment, createClinicAppointment, createClinicDoctor, createClinicHoliday, createClinicPatient, createClinicService, createClinicUser, createNextAppointment, deleteClinicDoctor, deleteClinicService, followUpAppointment, getClinicAppointments, getClinicAvailableSlots, getClinicDashboard, getClinicDoctors, getClinicHolidays, getClinicPatients, getClinicProfiles, getClinicServices, getClinicUsers, getClinicWeeklyAppointments, getDoctorAvailability, getDoctorServices, getPatientAppointmentHistory, getUserClinics, rescheduleAppointment, saveClinicProfile, saveDoctorAvailability, searchClinicPatientsByQuery, updateAppointmentStatus, updateClinicDoctor, updateClinicProfile, upsertClinicWorkingHours } from "../services/api";

const pageMeta = {
  dashboard: ["Dashboard", "Good morning. Here's today's clinic overview."],
  appointments: ["Appointments", "Manage and monitor clinic appointments."],
  queue: ["Appointment Queue", "Keep today's checked-in patients moving."],
  patients: ["Patients", "Patients associated with this clinic."],
  doctors: ["Doctors", "Doctors registered with this clinic."],
  services: ["Services", "Services offered by this clinic."],
  staff: ["Staff & Users", "Manage dashboard access and roles."],
  reports: ["Reports", "Clinic performance and appointment analytics."],
  settings: ["Settings", "Configure your clinic."],
};

const appointments = [
  ["Ankita Sharma", "AS", "Dental Consultation", "Dr Patel", "24 Aug 2026", "09:00 AM", "CONFIRMED"],
  ["Neeta Deshmukh", "ND", "Health Consultation", "Dr Nikhil", "24 Aug 2026", "10:30 AM", "CONFIRMED"],
  ["Rahul Joshi", "RJ", "Teeth Cleaning", "Dr Sharma", "24 Aug 2026", "12:00 PM", "PENDING"],
  ["Priya Patil", "PP", "Dental Consultation", "Dr Patel", "24 Aug 2026", "03:30 PM", "CONFIRMED"],
  ["Amit Kulkarni", "AK", "Health Consultation", "Dr Nikhil", "24 Aug 2026", "06:00 PM", "CONFIRMED"],
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

function Modal({ title, children, onClose, onSave, saveLabel = "Save", saveDisabled = false, saveClassName = "btn btn-primary" }) {
  return (
    <div className="modal-backdrop open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className={saveClassName} onClick={onSave} disabled={saveDisabled}>{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
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

  const displayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "Chetan Admin";
  const role = user?.role || "CLINIC ADMIN";
  const avatar = initials(user);
  const isDoctor = String(role).toUpperCase() === "DOCTOR";
  const isSuperAdmin = String(role).toUpperCase() === "SUPER_ADMIN";
  const canViewAppointmentQueue = isDoctor || isSuperAdmin;
  const canManageStaff = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(String(role).toUpperCase());
  const canManageSettings = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(String(role).toUpperCase());
  const canViewClinicProfile = String(role).toUpperCase() === "SUPER_ADMIN";
  const selectedClinicName = clinics.find((clinic) => String(clinic.id) === String(selectedClinicId))?.name || "your clinic";

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

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">+</div>
          <div className="brand-name">hola.MD</div>
        </div>

        <div className="clinic-switcher">
          <small>Current clinic</small>
          <select value={selectedClinicId} onChange={(e) => setSelectedClinicId(e.target.value)} disabled={clinics.length <= 1}>
            {clinics.length === 0 && <option value="">Loading clinic...</option>}
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </select>
        </div>

        <div className="nav-section">Overview</div>
        <NavButton active={page === "dashboard"} onClick={() => go("dashboard")} icon="▣">Dashboard</NavButton>

        <div className="nav-section">Clinic Operations</div>
        <NavButton active={page === "appointments"} onClick={() => go("appointments")} icon="◷">Appointments</NavButton>
        {canViewAppointmentQueue && <NavButton active={page === "queue"} onClick={() => go("queue")} icon="☷">Appointment Queue</NavButton>}
        <NavButton active={page === "patients"} onClick={() => go("patients")} icon="♙">Patients</NavButton>
        <NavButton active={page === "doctors"} onClick={() => go("doctors")} icon="♧">Doctors</NavButton>
        <NavButton active={page === "services"} onClick={() => go("services")} icon="▤">Services</NavButton>

        <div className="nav-section">Administration</div>
        {canManageStaff && <NavButton active={page === "staff"} onClick={() => go("staff")} icon="♙">Staff & Users</NavButton>}
        <NavButton active={page === "reports"} onClick={() => go("reports")} icon="▥">Reports</NavButton>
        {canManageSettings && <NavButton active={page === "settings"} onClick={() => go("settings")} icon="⚙">Settings</NavButton>}

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{avatar}</div>
            <div>
              <div className="u-name">{displayName}</div>
              <div className="u-role">{String(role).replaceAll("_", " ")}</div>
            </div>
            <button className="logout-side" onClick={logout} title="Logout">↪</button>
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
            <button className="icon-btn" onClick={() => showToast("No new notifications")}>♢</button>
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
            <Patients openModal={setModal} showToast={showToast} clinicId={selectedClinicId} token={token} />
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

          {page === "settings" && canManageSettings && <Settings showToast={showToast} clinicId={selectedClinicId} doctorId={userDoctorId || 1} token={token} canViewClinicProfile={canViewClinicProfile} />}
          </>}
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
          title="Add Patient"
          onClose={() => { setModal(null); setPatientError(""); setPatientForm({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" }); }}
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
              await createClinicPatient(selectedClinicId, {
                name: patientForm.name.trim(),
                whatsappNumber: patientForm.whatsappNumber.trim(),
                email: patientForm.email.trim(),
                dateOfBirth: patientForm.dateOfBirth,
                gender: patientForm.gender,
              }, token);
              setModal(null);
              setPatientForm({ name: "", whatsappNumber: "", email: "", dateOfBirth: "", gender: "" });
              showToast("Patient added successfully");
            } catch (err) {
              setPatientError(err.message || "Unable to add patient.");
            } finally {
              setPatientLoading(false);
            }
          }}
          saveLabel={patientLoading ? "Adding..." : "Add Patient"}
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

function Appointments({ clinicId, token, userRole, userDoctorId, search, openModal, showToast }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState(null);
  const [cancelConfirmationId, setCancelConfirmationId] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [creatingNextAppointmentId, setCreatingNextAppointmentId] = useState(null);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState(null);
  const isDoctor = String(userRole).toUpperCase() === "DOCTOR";

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

  async function loadAppointmentsForPage(nextPage) {
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
        size: pageSize,
      }, token);

      const items = Array.isArray(result) ? result : result?.items || [];
      const nextPagination = result?.pagination || null;
      setRows(items);
      setPagination(nextPagination);
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(direction) {
    const nextPage = Math.max(0, page + direction);
    if (nextPage === page) return;
    setPage(nextPage);
    loadAppointmentsForPage(nextPage);
  }

  function handlePageSizeChange(nextSize) {
    setPage(0);
    setPageSize(Number(nextSize) || 5);
    loadAppointmentsForPage(0);
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
  }, [clinicId, token, from, to, doctorId, serviceId, status, isDoctor, userDoctorId, page, pageSize]);

  const filteredRows = rows.filter((appointment) => {
    const query = search.trim().toLowerCase();
    return !query || [appointment.patientName, appointment.serviceName, appointment.doctorName]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  async function handleStatusUpdate(appointmentId, nextStatus) {
    if (!token) {
      setError("Please log in to update appointments.");
      return;
    }

    try {
      setUpdatingAppointmentId(appointmentId);
      setError("");
      const updatedAppointment = await updateAppointmentStatus(appointmentId, nextStatus, token);
      setRows((items) => items.map((appointment) => appointment.id === appointmentId
        ? { ...appointment, ...(updatedAppointment || {}), status: updatedAppointment?.status || nextStatus }
        : appointment));
      showToast(`Appointment marked ${nextStatus.replaceAll("_", " ").toLowerCase()}`);
    } catch (err) {
      setError(err.message || "Unable to update appointment status.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  function handleCancelAppointment(appointmentId) {
    if (!token) {
      setError("Please log in to cancel appointments.");
      return;
    }

    setCancelError("");
    setCancelConfirmationId(appointmentId);
  }

  async function confirmCancelAppointment() {
    const appointmentId = cancelConfirmationId;
    if (!appointmentId) return;

    try {
      setCancelingAppointmentId(appointmentId);
      setCancelError("");
      const updatedAppointment = await cancelAppointment(appointmentId, token);
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
        const nextAppointment = await createNextAppointment(appointmentId, {
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
        }, token);
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

  function getAppointmentAction(appointment) {
    const appointmentStatus = String(appointment.status || "").toUpperCase();
    if (appointmentStatus === "CONFIRMED") {
      return { label: "Check In", nextStatus: "CHECKED_IN" };
    }
    if (appointmentStatus === "CHECKED_IN") {
      return { label: "Mark Waiting", nextStatus: "WAITING" };
    }
    if (appointmentStatus === "WAITING") {
      return { label: "Start Consultation", nextStatus: "IN_CONSULTATION" };
    }
    if (appointmentStatus === "IN_CONSULTATION") {
      return { label: "Mark Completed", nextStatus: "COMPLETED" };
    }
    return null;
  }

  const canCancelAppointment = (appointment) => String(appointment.status || "").toUpperCase() !== "CANCELLED";
  const canMarkNoShow = (appointment) => String(appointment.status || "").toUpperCase() === "CHECKED_IN";
  const canCreateNextAppointment = (appointment) => String(appointment.status || "").toUpperCase() === "COMPLETED" && !appointment.followUpAppointmentId;

  return <>
  <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Appointments</h3><p>Manage and monitor clinic appointments</p></div><button className="btn btn-primary" onClick={() => openModal("appointment")}>+ New Appointment</button></div>
    <div className="filters">
      <input className="control" type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} />
      <input className="control" type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} />
      {!isDoctor && <input className="control" type="number" min="1" placeholder="Doctor ID" value={doctorId} onChange={(e) => { setPage(0); setDoctorId(e.target.value); }} />}
      <input className="control" type="number" min="1" placeholder="Service ID" value={serviceId} onChange={(e) => { setPage(0); setServiceId(e.target.value); }} />
      <select className="control" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}><option value="">All Status</option><option value="CONFIRMED">Confirmed</option><option value="CHECKED_IN">Checked In</option><option value="WAITING">Waiting</option><option value="IN_CONSULTATION">In Consultation</option><option value="COMPLETED">Completed</option><option value="NO_SHOW">No Show</option><option value="CANCELLED">Cancelled</option></select>
    </div>
    {error && <div className="auth-error">{error}</div>}
    {loading && <div className="card-body"><p className="muted">Loading appointments...</p></div>}
    {!loading && !error && filteredRows.length === 0 && <div className="card-body"><p className="muted">No appointments found.</p></div>}
    {!loading && !error && filteredRows.length > 0 && <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Service</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Suggested Follow-Up</th><th>Action</th></tr></thead><tbody>
      {filteredRows.map((appointment) => { const action = getAppointmentAction(appointment); const isUpdating = updatingAppointmentId === appointment.id; const isCancelling = cancelingAppointmentId === appointment.id; const isCreatingNext = creatingNextAppointmentId === appointment.id; const isRescheduling = reschedulingAppointmentId === appointment.id; const appointmentStatus = String(appointment.status || "").toUpperCase(); const statusClass = appointmentStatus === "IN_CONSULTATION" ? "in_progress" : appointmentStatus.toLowerCase(); return <tr key={appointment.id}><td><div className="patient-cell"><div className="small-avatar">{initials({ firstName: appointment.patientName })}</div><div><strong>{appointment.patientName || "-"}</strong><span>{appointment.phoneNo || appointment.patientPhone || "-"}</span></div></div></td><td>{appointment.serviceName || appointment.service?.name || "-"}</td><td>{appointment.doctorName || appointment.doctor?.name || "-"}</td><td>{appointment.appointmentDate || appointment.date || "-"}</td><td>{formatTime(appointment.startTime || appointment.time)}</td><td><span className={`status ${statusClass}`}>{appointment.status || "-"}</span></td><td>{appointment.suggestedFollowUpDate || "-"}</td><td><div className="row-actions">{action && <button className="btn btn-light icon-btn" title={isUpdating ? "Updating..." : action.label} disabled={isUpdating} onClick={() => handleStatusUpdate(appointment.id, action.nextStatus)} aria-label={isUpdating ? "Updating..." : action.label}>{isUpdating ? "…" : action.label === "Mark Completed" ? "✓" : "→"}</button>}{canCreateNextAppointment(appointment) && <button className="btn btn-light icon-btn" title={isCreatingNext ? "Creating..." : "Next Visit"} disabled={isCreatingNext} onClick={() => handleCreateNextAppointment(appointment)} aria-label={isCreatingNext ? "Creating..." : "Next Visit"}>{isCreatingNext ? "…" : "+"}</button>}<button className="btn btn-light icon-btn" title={isRescheduling ? "Rescheduling..." : "Reschedule"} disabled={isRescheduling} onClick={() => handleRescheduleAppointment(appointment)} aria-label={isRescheduling ? "Rescheduling..." : "Reschedule"}>{isRescheduling ? "…" : "↺"}</button>{canCancelAppointment(appointment) && <button className="btn btn-danger icon-btn" title={isCancelling ? "Cancelling..." : "Cancel"} disabled={isCancelling} onClick={() => handleCancelAppointment(appointment.id)} aria-label={isCancelling ? "Cancelling..." : "Cancel"}>{isCancelling ? "…" : "✕"}</button>}</div></td></tr>; })}
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
  </>;
}

function Patients({ openModal, showToast, clinicId, token }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [pagination, setPagination] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

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

  return <>
  <section className="page active"><div className="card">
    <div className="card-header"><div><h3>Patients</h3><p>Patients associated with this clinic</p></div><button className="btn btn-primary" onClick={() => openModal("patient")}>+ Add Patient</button></div>
    <div className="filters"><input className="control" style={{minWidth:240}} placeholder="Search by name or WhatsApp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><button className="btn btn-outline" onClick={() => showToast(`${filteredPatients.length} patients found`)}>Search</button></div>
    <div className="card-body">
      {loading && <p className="muted">Loading patients...</p>}
      {!loading && error && <div className="auth-error">{error}</div>}
      {!loading && !error && filteredPatients.length === 0 && <p className="muted">No patients found for this clinic.</p>}
    </div>
    {!loading && !error && filteredPatients.length > 0 && <div className="table-wrap"><table><thead><tr><th>ID</th><th>Patient</th><th>WhatsApp</th><th>Gender</th><th>Clinic ID</th><th>Action</th></tr></thead><tbody>
      {filteredPatients.map((patient) => <tr key={patient.id}><td>{patient.id}</td><td><div className="patient-cell"><div className="small-avatar">{initials({ firstName: patient.name })}</div><div><strong>{patient.name}</strong><span>Patient</span></div></div></td><td>{patient.phoneNo}</td><td>{patient.gender || "-"}</td><td>{patient.clinicId}</td><td><button className="btn btn-light icon-btn" title="View patient history" aria-label="View patient history" onClick={() => { setSelectedPatient(patient); setHistoryPage(0); setHistory([]); setHistoryPagination(null); setHistoryError(""); }}>👁</button></td></tr>)}
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
      await followUpAppointment(Number(appointmentId), followUpSchedule.date, token);
      setInProgressAppointments((items) => items.filter((appointment) => appointment.id !== appointmentId));
      setFollowUpSchedule(null);
      showToast(`Follow-up scheduled for ${followUpSchedule.date} at ${formatTime(followUpSchedule.slot)}`);
    } catch (err) {
      setFollowUpScheduleError(err.message || "Unable to schedule follow-up.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  async function changeStatus(appointmentId, nextStatus) {
    try {
      setUpdatingAppointmentId(appointmentId);
      setError("");
      const updated = await updateAppointmentStatus(appointmentId, nextStatus, token);
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
    {!loading && !error && totalInQueue > 0 && <div className="queue-columns"><QueueLane title="Start Consultation" subtitle="Consultation in progress" appointments={visibleInProgressAppointments} actionLabel="Follow Up" nextStatus="FOLLOW_UP" updatingAppointmentId={updatingAppointmentId} onStatusChange={handleFollowUp} /><QueueLane title="Waiting" subtitle="Ready for the doctor" appointments={visibleWaitingAppointments} actionLabel="Start Consultation" nextStatus="IN_CONSULTATION" updatingAppointmentId={updatingAppointmentId} onStatusChange={changeStatus} isReorderable onReorder={reorderWaitingAppointments} draggedAppointmentId={draggedWaitingAppointmentId} setDraggedAppointmentId={setDraggedWaitingAppointmentId} /></div>}
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
  </>;
}

function QueueLane({ title, subtitle, appointments, actionLabel, nextStatus, updatingAppointmentId, onStatusChange, isReorderable = false, onReorder, draggedAppointmentId, setDraggedAppointmentId }) {
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
    <button className="btn btn-primary queue-action" disabled={updatingAppointmentId === appointment.id} onClick={() => onStatusChange(appointment.id, nextStatus)}>{updatingAppointmentId === appointment.id ? "Updating..." : actionLabel}</button>
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

function Reports({ showToast }) {
  return <section className="page active"><div className="welcome"><h2>Reports</h2><p>Clinic performance and appointment analytics.</p></div>
    <div className="grid-4"><Kpi label="Appointments" value="412" footer="This month" /><Kpi label="Completed" value="371" footer="90.0% completion" /><Kpi label="Cancelled" value="17" footer="4.1% cancellation" /><Kpi label="New Patients" value="83" footer="↑ 11% vs last month" /></div>
    <div className="card mt"><div className="card-header"><div><h3>Monthly Appointment Report</h3><p>Export detailed data for the selected period.</p></div><button className="btn btn-primary" onClick={() => showToast("Report export started")}>Export CSV</button></div>
      <div className="card-body"><div className="chart report-chart">{[55,61,69,64,75,82,91,88].map((h,i)=><div className="bar-wrap" key={i}><div className="bar" style={{height:`${h}%`}}/><span className="bar-label">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"][i]}</span></div>)}</div></div>
    </div>
  </section>;
}

function Settings({ showToast, clinicId, token, canViewClinicProfile, doctorId }) {
  const [form, setForm] = useState({
    name: "Sunrise Multispeciality",
    whatsappNumber: "+91 98765 43210",
    timezone: "Asia/Kolkata",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [editingClinicId, setEditingClinicId] = useState(null);
  const [workingHoursSaving, setWorkingHoursSaving] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ holidayDate: new Date().toISOString().slice(0, 10), name: "" });
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayList, setHolidayList] = useState([]);
  const [holidayListLoading, setHolidayListLoading] = useState(true);
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
  const [doctorAvailability, setDoctorAvailability] = useState(defaultDoctorAvailability);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(String(doctorId || ""));
  const [activeTab, setActiveTab] = useState("profile");
  const [workingHours, setWorkingHours] = useState([
    { day: "MONDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "TUESDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "WEDNESDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "THURSDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "FRIDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "SATURDAY", active: true, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
    { day: "SUNDAY", active: false, start: "09:00", end: "19:00", breakStart: "13:00", breakEnd: "14:00" },
  ]);

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
        const result = await getClinicProfiles(token);
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
  }, [token, canViewClinicProfile]);

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
          setSelectedDoctorId((currentId) => doctors.some((doctor) => String(doctor.id) === String(currentId))
            ? currentId
            : String(doctors[0]?.id || ""));
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
      if (!token || !clinicId || !doctorId) {
        setDoctorAvailability(defaultDoctorAvailability);
        return;
      }

      try {
        const result = await getDoctorAvailability(clinicId, Number(doctorId), token);
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
        if (!cancelled) setDoctorAvailability(defaultDoctorAvailability);
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
      };
      let createdClinic = null;
      if (editingClinicId === null) {
        createdClinic = await saveClinicProfile(payload, token);
      } else {
        await updateClinicProfile(editingClinicId, payload, token);
      }
      const result = await getClinicProfiles(token);
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
    setEditingClinicId(clinic.id);
    setForm({
      name: clinic.name || "",
      whatsappNumber: clinic.whatsappNumber || "",
      timezone: clinic.timezone || "Asia/Kolkata",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingClinicId(null);
    setForm({ name: "", whatsappNumber: "", timezone: "Asia/Kolkata" });
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

  return <section className="page active"><div className="card"><div className="settings-grid">
    <div className="settings-nav">
      <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Clinic Profile</button>
      <button className={activeTab === "holidays" ? "active" : ""} onClick={() => setActiveTab("holidays")}>Clinic Holidays</button>
      <button className={activeTab === "doctor" ? "active" : ""} onClick={() => setActiveTab("doctor")}>Doctor Availability</button>
      <button className={activeTab === "hours" ? "active" : ""} onClick={() => setActiveTab("hours")}>Working Hours</button>
    </div>
    <div className="settings-main">
      {error && <div className="auth-error">{error}</div>}
      {activeTab === "profile" && canViewClinicProfile && <><h3>Clinic Profile</h3><p className="muted">Basic information displayed across your clinic dashboard.</p>
      {editingClinicId !== null && <div className="auth-warning">Editing clinic #{editingClinicId}</div>}
      <div className="form-grid mt">
        <Field label="Clinic Name" value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} />
        <Field label="Clinic ID" value={clinicId} disabled />
        <Field label="WhatsApp Number" value={form.whatsappNumber} onChange={(e) => setForm((value) => ({ ...value, whatsappNumber: e.target.value }))} />
        <Field label="Timezone" select options={["Asia/Kolkata"]} value={form.timezone} onChange={(e) => setForm((value) => ({ ...value, timezone: e.target.value }))} />
      </div>
      <div className="quick-actions mt">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingClinicId === null ? "Save Changes" : "Update Clinic"}</button>
        {editingClinicId !== null && <button className="btn btn-outline" onClick={cancelEdit} disabled={saving}>Cancel Edit</button>}
      </div>
      </>}
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
            <select value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)} disabled={availableDoctors.length === 0}>
              <option value="">{availableDoctors.length === 0 ? "No doctors available" : "Select doctor"}</option>
              {availableDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          </div>
        </div>
        <div className="working-hours-list">
          {doctorAvailability.map((slot, index) => <div className={`working-hour-row ${slot.active ? "" : "disabled"}`} key={slot.day}>
            <label className="day-toggle"><input type="checkbox" checked={slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, active: e.target.checked } : item))} /><strong>{slot.day}</strong></label>
            <div className="working-time"><label>Start<input type="time" value={slot.start} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, start: e.target.value } : item))} /></label><span>to</span><label>End<input type="time" value={slot.end} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, end: e.target.value } : item))} /></label></div>
            <div className="working-time"><label>Break from<input type="time" value={slot.breakStart || ""} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakStart: e.target.value } : item))} /></label><span>to</span><label>Break to<input type="time" value={slot.breakEnd || ""} disabled={!slot.active} onChange={(e) => setDoctorAvailability((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, breakEnd: e.target.value } : item))} /></label></div>
          </div>)}
        </div>
        <button className="btn btn-primary mt" onClick={handleDoctorAvailabilitySave} disabled={doctorAvailabilitySaving}>{doctorAvailabilitySaving ? "Saving..." : "Save Doctor Availability"}</button>
      </div>}
      {activeTab === "hours" && <div className="working-hours mt">
        <h3>Working Hours</h3>
        <p className="muted">Set the clinic schedule and daily break times.</p>
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
        }} disabled={workingHoursSaving}>{workingHoursSaving ? "Saving..." : "Save Working Hours"}</button>
        </div>}
      </div></div></div></section>;
}
