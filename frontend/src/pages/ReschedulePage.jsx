/**
 * ReschedulePage — Public multi-step reschedule portal for clients.
 * Accessed via /reschedule/:token (no authentication required).
 * Includes "Powered by RemiDesk" branding.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, addHours } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── Step constants ────────────────────────────────────────────────────────────
const STEP_LOADING = 'loading';
const STEP_VIEW    = 'view';       // Step 1: show current appointment
const STEP_PICK    = 'pick';       // Step 2: pick new date/time
const STEP_CONFIRM = 'confirm';    // Step 3: confirmation summary
const STEP_DONE    = 'done';       // Step 4: success
const STEP_ERROR   = 'error';      // Token invalid / expired

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(dt) {
  try {
    return format(typeof dt === 'string' ? parseISO(dt) : dt, 'EEEE d MMMM yyyy \'at\' HH:mm');
  } catch {
    return String(dt);
  }
}

function toLocalInput(dt) {
  try {
    const d = typeof dt === 'string' ? parseISO(dt) : dt;
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PoweredBy() {
  return (
    <div className="mt-8 text-center">
      <a
        href="https://remidesk.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5 text-indigo-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 3a1 1 0 011 1v4.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 0111 13V8a1 1 0 011-1z" />
        </svg>
        Powered by <span className="font-semibold text-indigo-500">RemiDesk</span>
      </a>
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = ['Details', 'New time', 'Confirm'];
  const stepKeys = [STEP_VIEW, STEP_PICK, STEP_CONFIRM];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => {
        const isActive  = stepKeys[i] === current;
        const isPast    = stepKeys.indexOf(current) > i;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isPast
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {isPast ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                isActive ? 'text-indigo-700' : isPast ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${isPast ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AppointmentCard({ appt }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-0.5">
            Business
          </p>
          <p className="text-gray-800 font-semibold">{appt.business_name}</p>
        </div>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">
          {appt.status}
        </span>
      </div>
      {appt.service_name && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-0.5">
            Service
          </p>
          <p className="text-gray-800">{appt.service_name}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-0.5">
          Date & Time
        </p>
        <p className="text-gray-800">{formatDateTime(appt.start_time)}</p>
      </div>
      {appt.client_name && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-0.5">
            Client
          </p>
          <p className="text-gray-800">{appt.client_name}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReschedulePage() {
  const { token } = useParams();

  const [step, setStep]           = useState(STEP_LOADING);
  const [appt, setAppt]           = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New times chosen by the client
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd]     = useState('');
  const [timeError, setTimeError] = useState('');

  // Load appointment info on mount
  useEffect(() => {
    if (!token) {
      setErrorMsg('No reschedule token provided.');
      setStep(STEP_ERROR);
      return;
    }
    axios
      .get(`${API_BASE_URL}/reschedule/${token}`)
      .then((res) => {
        setAppt(res.data);
        // Pre-fill new time inputs with current times as a starting point
        setNewStart(toLocalInput(res.data.start_time));
        setNewEnd(toLocalInput(res.data.end_time));
        setStep(STEP_VIEW);
      })
      .catch((err) => {
        const detail =
          err.response?.data?.detail || 'This reschedule link is invalid or has expired.';
        setErrorMsg(detail);
        setStep(STEP_ERROR);
      });
  }, [token]);

  // Auto-update end time when start changes (maintain same duration)
  function handleStartChange(val) {
    setNewStart(val);
    setTimeError('');
    if (appt && val) {
      try {
        const origDuration =
          (parseISO(appt.end_time) - parseISO(appt.start_time)) / 3600000; // hours
        const newEndDate = addHours(parseISO(val), origDuration);
        setNewEnd(toLocalInput(newEndDate));
      } catch {
        // ignore parse errors
      }
    }
  }

  function validateTimes() {
    if (!newStart || !newEnd) {
      setTimeError('Please select both start and end times.');
      return false;
    }
    if (new Date(newStart) >= new Date(newEnd)) {
      setTimeError('End time must be after start time.');
      return false;
    }
    if (new Date(newStart) <= new Date()) {
      setTimeError('New appointment time must be in the future.');
      return false;
    }
    setTimeError('');
    return true;
  }

  function handlePickNext() {
    if (validateTimes()) setStep(STEP_CONFIRM);
  }

  async function handleConfirmSubmit() {
    if (!validateTimes()) {
      setStep(STEP_PICK);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/reschedule/${token}`, {
        new_start_time: new Date(newStart).toISOString(),
        new_end_time: new Date(newEnd).toISOString(),
      });
      setStep(STEP_DONE);
    } catch (err) {
      const detail =
        err.response?.data?.detail || 'Failed to reschedule. Please try again.';
      setErrorMsg(detail);
      setStep(STEP_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointment</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a new date and time that works for you.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">

          {/* ── Loading ── */}
          {step === STEP_LOADING && (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
              <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Loading appointment details…</span>
            </div>
          )}

          {/* ── Error ── */}
          {step === STEP_ERROR && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">Unable to reschedule</p>
                <p className="text-sm text-gray-500">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* ── Step 1: View current appointment ── */}
          {step === STEP_VIEW && appt && (
            <>
              <StepIndicator current={STEP_VIEW} />
              <p className="text-sm text-gray-600 mb-4 text-center">
                Here are your current appointment details:
              </p>
              <AppointmentCard appt={appt} />
              <button
                onClick={() => setStep(STEP_PICK)}
                className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Choose a new time →
              </button>
            </>
          )}

          {/* ── Step 2: Pick new time ── */}
          {step === STEP_PICK && appt && (
            <>
              <StepIndicator current={STEP_PICK} />
              <p className="text-sm text-gray-600 mb-5 text-center">
                Select your preferred new date and time:
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New start time
                  </label>
                  <input
                    type="datetime-local"
                    value={newStart}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New end time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEnd}
                    onChange={(e) => { setNewEnd(e.target.value); setTimeError(''); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {timeError && (
                  <p className="text-xs text-red-600">{timeError}</p>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setStep(STEP_VIEW)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handlePickNext}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Review →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === STEP_CONFIRM && appt && (
            <>
              <StepIndicator current={STEP_CONFIRM} />
              <p className="text-sm text-gray-600 mb-4 text-center">
                Please confirm your new appointment time:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Business</span>
                  <span className="font-medium text-gray-800">{appt.business_name}</span>
                </div>
                {appt.service_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="font-medium text-gray-800">{appt.service_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">New start</span>
                  <span className="font-medium text-gray-800">
                    {newStart ? format(new Date(newStart), 'EEE d MMM yyyy, HH:mm') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">New end</span>
                  <span className="font-medium text-gray-800">
                    {newEnd ? format(new Date(newEnd), 'EEE d MMM yyyy, HH:mm') : '—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(STEP_PICK)}
                  disabled={submitting}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                >
                  ← Edit
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? 'Confirming…' : 'Confirm reschedule'}
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === STEP_DONE && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-1">Appointment rescheduled!</p>
                <p className="text-sm text-gray-500">
                  Your appointment has been updated. You will receive a confirmation shortly.
                </p>
              </div>
              {appt && (
                <div className="text-sm text-gray-600 bg-green-50 border border-green-100 rounded-xl p-4 w-full text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">New time</span>
                    <span className="font-medium">
                      {newStart ? format(new Date(newStart), 'EEE d MMM yyyy, HH:mm') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Business</span>
                    <span className="font-medium">{appt.business_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <PoweredBy />
      </div>
    </div>
  );
}
