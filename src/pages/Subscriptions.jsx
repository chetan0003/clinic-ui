import React, { useCallback, useEffect, useState } from "react";
import {
  getClinicSubscription,
  getPendingSubscriptionPayments,
  getSubscriptionPayment,
  getSubscriptionPlan,
  getSubscriptionPlans,
  submitClinicSubscriptionPayment,
  updateSubscriptionPlanStatus,
  verifySubscriptionPayment,
} from "../services/api";

function asList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.payments)) return value.payments;
  return [];
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusClass(status) {
  return `status ${String(status || "pending").toLowerCase()}`;
}

function PlanLimits({ plan }) {
  return <ul className="subscription-limits">
    <li><strong>{plan.maxDoctors ?? "—"}</strong> doctors</li>
    <li><strong>{plan.maxStaff ?? "—"}</strong> staff accounts</li>
    <li><strong>{plan.maxAppointmentsPerMonth ?? "—"}</strong> appointments / month</li>
    <li><strong>{plan.maxPatients ?? "—"}</strong> patients</li>
  </ul>;
}

export default function Subscriptions({ clinicId, clinicName, token, isSuperAdmin, showToast }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState(null);
  const [reviewingPaymentId, setReviewingPaymentId] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [reviewError, setReviewError] = useState("");

  const loadData = useCallback(async () => {
    if (!token || (!isSuperAdmin && !clinicId)) {
      setLoading(false);
      setError(!token ? "Please log in to view subscriptions." : "Select a clinic to view its subscription.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [plansResult, subscriptionResult, pendingResult] = await Promise.allSettled([
        getSubscriptionPlans(token),
        clinicId ? getClinicSubscription(clinicId, token) : Promise.resolve(null),
        isSuperAdmin ? getPendingSubscriptionPayments(token) : Promise.resolve([]),
      ]);
      if (plansResult.status === "rejected") throw plansResult.reason;
      setPlans(asList(plansResult.value));
      setSubscription(subscriptionResult.status === "fulfilled" ? subscriptionResult.value || null : null);
      setPendingPayments(pendingResult.status === "fulfilled" ? asList(pendingResult.value) : []);
    } catch (err) {
      setError(err.message || "Unable to load subscription information.");
    } finally {
      setLoading(false);
    }
  }, [clinicId, isSuperAdmin, token]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    if (!clinicId) {
      setError("Select a clinic before submitting a subscription payment.");
      return;
    }
    if (!selectedPlanId || !transactionId.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const payment = await submitClinicSubscriptionPayment(clinicId, selectedPlanId, transactionId.trim(), token);
      setLatestPayment(payment);
      setTransactionId("");
      showToast("Payment submitted for verification.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to submit payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePlan(plan) {
    setUpdatingPlanId(plan.id);
    try {
      await updateSubscriptionPlanStatus(plan.id, !plan.active, token);
      showToast(`Plan ${!plan.active ? "activated" : "deactivated"}.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update plan status.");
    } finally {
      setUpdatingPlanId(null);
    }
  }

  async function reviewPayment(paymentId, approved) {
    const reason = (rejectionReasons[paymentId] || "").trim();
    if (!approved && !reason) {
      setReviewError("Enter a rejection reason before rejecting a payment.");
      return;
    }

    setReviewingPaymentId(paymentId);
    setReviewError("");
    try {
      await verifySubscriptionPayment(paymentId, approved, reason, token);
      showToast(approved ? "Payment verified and subscription activated." : "Payment rejected.");
      setPaymentDetails(null);
      setRejectionReasons((current) => ({ ...current, [paymentId]: "" }));
      await loadData();
    } catch (err) {
      setReviewError(err.message || "Unable to review payment.");
    } finally {
      setReviewingPaymentId(null);
    }
  }

  async function openPayment(paymentId) {
    setReviewError("");
    try {
      const details = await getSubscriptionPayment(paymentId, token);
      setPaymentDetails(details);
    } catch (err) {
      setReviewError(err.message || "Unable to load payment details.");
    }
  }

  async function openPlanDetails(planId) {
    try {
      const details = await getSubscriptionPlan(planId, token);
      setPlanDetails(details);
    } catch (err) {
      setError(err.message || "Unable to load plan details.");
    }
  }

  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId));

  if (loading) return <section className="page active"><div className="page-loader"><div className="loader-spinner" /><span>Loading subscription details...</span></div></section>;

  return <section className="page active subscription-page">
    {error && <div className="auth-error">{error}</div>}
    <div className="subscription-hero">
      <div>
        <span className="subscription-eyebrow">{isSuperAdmin ? "SUBSCRIPTION CONTROL CENTER" : "CLINIC SUBSCRIPTION"}</span>
        <h2>{isSuperAdmin ? "Plans & payment approvals" : `${clinicName || "Clinic"} subscription`}</h2>
        <p>{isSuperAdmin ? "Manage plan availability and verify clinic payments." : "Review your current plan, compare options, and submit a payment reference."}</p>
      </div>
      {subscription && <div className="subscription-current-badge"><span className={statusClass(subscription.status)}>{subscription.status || "ACTIVE"}</span><strong>{subscription.planName || "Current plan"}</strong></div>}
    </div>

    {subscription && <div className="subscription-summary-grid">
      <article className="card subscription-summary"><span>Current plan</span><strong>{subscription.planName || "—"}</strong><small>{subscription.planCode || "Subscription"}</small></article>
      <article className="card subscription-summary"><span>Subscription period</span><strong>{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</strong><small>{subscription.autoRenew ? "Auto-renew enabled" : "Auto-renew disabled"}</small></article>
      <article className="card subscription-summary"><span>Appointments remaining</span><strong>{subscription.appointmentsRemaining ?? "—"}</strong><small>{subscription.appointmentsUsed ?? 0} used · {subscription.appointmentLimit ?? "—"} limit</small></article>
    </div>}

    <div className="subscription-section-heading"><div><h3>Available plans</h3><p>Compare the limits and features included with each plan.</p></div></div>
    {plans.length === 0 && <div className="card card-body"><p className="muted">No subscription plans are available.</p></div>}
    <div className="subscription-plans-grid">
      {plans.map((plan) => <article className={`card subscription-plan ${String(selectedPlanId) === String(plan.id) ? "selected" : ""} ${plan.active === false ? "inactive" : ""}`} key={plan.id}>
        <div className="subscription-plan-top"><div><span className="subscription-plan-code">{plan.code}</span><h3>{plan.name}</h3></div>{isSuperAdmin && <span className={`subscription-plan-state ${plan.active === false ? "off" : "on"}`}>{plan.active === false ? "Inactive" : "Active"}</span>}</div>
        <p className="subscription-plan-description">{plan.description || "Clinic management plan"}</p>
        <div className="subscription-price">{formatPrice(plan.monthlyPrice)}<span> / month</span></div>
        <div className="subscription-yearly">{formatPrice(plan.yearlyPrice)} / year</div>
        <PlanLimits plan={plan} />
        <div className="subscription-features">
          <span className={plan.aiReceptionistEnabled ? "enabled" : "disabled"}>AI receptionist {plan.aiReceptionistEnabled ? "included" : "not included"}</span>
          <span className={plan.whatsappEnabled ? "enabled" : "disabled"}>WhatsApp {plan.whatsappEnabled ? "included" : "not included"}</span>
          <span className={plan.analyticsEnabled ? "enabled" : "disabled"}>Analytics {plan.analyticsEnabled ? "included" : "not included"}</span>
        </div>
        <div className="subscription-plan-actions">
          <button className="btn btn-outline" onClick={() => openPlanDetails(plan.id)}>Plan details</button>
          {!isSuperAdmin && <button className="btn btn-primary" disabled={plan.active === false || !clinicId} onClick={() => setSelectedPlanId(String(plan.id))}>{String(selectedPlanId) === String(plan.id) ? "Selected" : "Choose plan"}</button>}
          {isSuperAdmin && <button className={plan.active === false ? "btn btn-primary" : "btn btn-outline"} disabled={updatingPlanId === plan.id} onClick={() => togglePlan(plan)}>{updatingPlanId === plan.id ? "Saving..." : plan.active === false ? "Activate plan" : "Deactivate plan"}</button>}
        </div>
      </article>)}
    </div>

    {!isSuperAdmin && <div className="subscription-lower-grid">
      <section className="card subscription-payment-card">
        <div className="card-header"><div><h3>Submit payment reference</h3><p>After paying through your clinic’s UPI process, enter its UTR / transaction ID.</p></div></div>
        <form className="card-body subscription-payment-form" onSubmit={handlePaymentSubmit}>
          <div className="field"><label htmlFor="subscription-plan-select">Selected plan</label><select id="subscription-plan-select" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} required><option value="">Choose a plan</option>{plans.filter((plan) => plan.active !== false).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatPrice(plan.monthlyPrice)} / month</option>)}</select></div>
          {selectedPlan && <p className="subscription-selected-cost">Payment amount: <strong>{formatPrice(selectedPlan.monthlyPrice)}</strong> monthly</p>}
          <div className="field"><label htmlFor="subscription-transaction-id">UPI UTR / transaction ID</label><input id="subscription-transaction-id" value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Enter transaction reference" required /></div>
          <button className="btn btn-primary" type="submit" disabled={submitting || !selectedPlanId || !transactionId.trim()}>{submitting ? "Submitting..." : "Submit for verification"}</button>
        </form>
      </section>
      <section className="card subscription-payment-card">
        <div className="card-header"><div><h3>Latest payment submission</h3><p>Payment references require super-admin verification before activation.</p></div></div>
        {latestPayment ? <div className="subscription-history-list"><div className="subscription-history-row"><div><strong>{latestPayment.planName || selectedPlan?.name || "Subscription plan"}</strong><span>{latestPayment.transactionId || "No transaction ID"} · {formatDate(latestPayment.paymentDate)}</span></div><span className={statusClass(latestPayment.status)}>{latestPayment.status || "PENDING"}</span><strong>{formatPrice(latestPayment.amount)}</strong></div></div> : <div className="card-body"><p className="muted">No payment has been submitted during this session.</p></div>}
      </section>
    </div>}

    {isSuperAdmin && <section className="card subscription-review-card">
      <div className="card-header"><div><h3>Pending payment approvals</h3><p>{pendingPayments.length} payment{pendingPayments.length === 1 ? "" : "s"} waiting for review across clinics.</p></div><button className="btn btn-outline" onClick={loadData}>Refresh</button></div>
      {reviewError && <div className="auth-error subscription-review-error">{reviewError}</div>}
      {pendingPayments.length === 0 ? <div className="card-body"><p className="muted">There are no pending subscription payments.</p></div> : <div className="subscription-review-list">{pendingPayments.map((payment) => {
        const id = payment.paymentId || payment.id;
        const isReviewing = reviewingPaymentId === id;
        return <article className="subscription-review-row" key={id}>
          <div className="subscription-review-main"><div className="subscription-review-avatar">{String(payment.clinicName || `C${payment.clinicId || ""}`).slice(0, 2).toUpperCase()}</div><div><strong>{payment.clinicName || `Clinic ${payment.clinicId || ""}`}</strong><span>{payment.planName || `Plan ${payment.planId || ""}`} · {formatDate(payment.paymentDate)}</span><small>Transaction: {payment.transactionId || "—"} · {formatPrice(payment.amount)}</small></div></div>
          <button className="btn btn-outline" onClick={() => openPayment(id)}>Details</button>
          <div className="subscription-review-actions"><input aria-label="Rejection reason" placeholder="Reason required to reject" value={rejectionReasons[id] || ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [id]: event.target.value }))} /><button className="btn btn-primary" disabled={isReviewing} onClick={() => reviewPayment(id, true)}>{isReviewing ? "Saving..." : "Approve"}</button><button className="btn btn-danger" disabled={isReviewing || !(rejectionReasons[id] || "").trim()} onClick={() => reviewPayment(id, false)}>Reject</button></div>
        </article>;
      })}</div>}
    </section>}

    {paymentDetails && <div className="modal-backdrop open" onMouseDown={(event) => event.target === event.currentTarget && setPaymentDetails(null)}><div className="modal subscription-detail-modal"><div className="modal-header"><h3>Payment details</h3><button className="close" onClick={() => setPaymentDetails(null)}>×</button></div><div className="modal-body"><div className="info-line"><span>Payment ID</span><strong>{paymentDetails.paymentId || paymentDetails.id || "—"}</strong></div><div className="info-line"><span>Clinic</span><strong>{paymentDetails.clinicName || paymentDetails.clinicId || "—"}</strong></div><div className="info-line"><span>Plan</span><strong>{paymentDetails.planName || "—"}</strong></div><div className="info-line"><span>Transaction ID</span><strong>{paymentDetails.transactionId || "—"}</strong></div><div className="info-line"><span>Amount</span><strong>{formatPrice(paymentDetails.amount)}</strong></div><div className="info-line"><span>Status</span><strong>{paymentDetails.status || "—"}</strong></div><div className="info-line"><span>Submitted</span><strong>{formatDate(paymentDetails.paymentDate)}</strong></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setPaymentDetails(null)}>Close</button></div></div></div>}
    {planDetails && <div className="modal-backdrop open" onMouseDown={(event) => event.target === event.currentTarget && setPlanDetails(null)}><div className="modal subscription-detail-modal"><div className="modal-header"><h3>{planDetails.name || "Subscription plan"}</h3><button className="close" onClick={() => setPlanDetails(null)}>×</button></div><div className="modal-body"><p className="muted">{planDetails.description || "Clinic subscription plan details."}</p><div className="info-line"><span>Plan code</span><strong>{planDetails.code || "—"}</strong></div><div className="info-line"><span>Monthly</span><strong>{formatPrice(planDetails.monthlyPrice)}</strong></div><div className="info-line"><span>Yearly</span><strong>{formatPrice(planDetails.yearlyPrice)}</strong></div><PlanLimits plan={planDetails} /><div className="subscription-features"><span>{planDetails.aiReceptionistEnabled ? "✓" : "—"} AI receptionist</span><span>{planDetails.whatsappEnabled ? "✓" : "—"} WhatsApp</span><span>{planDetails.analyticsEnabled ? "✓" : "—"} Analytics</span></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={() => setPlanDetails(null)}>Close</button></div></div></div>}
  </section>;
}
