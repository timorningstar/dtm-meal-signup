import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_APP_ID = 'mealSignup'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_STATE_URL = apiUrl(`/api/state?app=${API_APP_ID}`)
const API_SIGNUP_URL = apiUrl(`/api/meal-signup?app=${API_APP_ID}`)
const ADMIN_TOKEN_KEY = 'mealSignupAdminToken'

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

function appUrl(path = '') {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav>
        <a href="https://www.downtownmin.org" rel="noreferrer" target="_blank">
          Downtown Ministries of Goshen
        </a>
        <span>|</span>
        <a href="https://www.downtownmin.org/privacy-policy" rel="noreferrer" target="_blank">
          Privacy Policy
        </a>
        <span>|</span>
        <a href="https://www.downtownmin.org/terms-of-service" rel="noreferrer" target="_blank">
          Terms of Service
        </a>
        <span>|</span>
        <a href={appUrl('admin')}>Admin</a>
      </nav>
    </footer>
  )
}

function currentAppPath() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const pathname = window.location.pathname
  if (basePath && basePath !== '/' && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || '/'
  }
  return pathname
}

const defaultLocations = [
  {
    id: 'goshen',
    name: 'Goshen Campus',
    address: '215 W. Clinton St.',
    note: 'Monday and Wednesday classes',
    days: [
      { date: '2026-08-03', time: '5:00 PM', day: 'Monday', className: 'DTM Goshen', expectedMealCount: 28 },
      { date: '2026-08-05', time: '5:00 PM', day: 'Wednesday', className: 'DTM Goshen', expectedMealCount: 28 },
      { date: '2026-08-10', time: '5:00 PM', day: 'Monday', className: 'DTM Goshen', expectedMealCount: 28 },
      { date: '2026-08-12', time: '5:00 PM', day: 'Wednesday', className: 'DTM Goshen', expectedMealCount: 28 },
      { date: '2026-08-17', time: '5:00 PM', day: 'Monday', className: 'DTM Goshen', expectedMealCount: 28 },
      { date: '2026-08-19', time: '5:00 PM', day: 'Wednesday', className: 'DTM Goshen', expectedMealCount: 28 },
    ],
  },
  {
    id: 'elkhart',
    name: 'Elkhart Campus',
    address: '300 W. High St., Elkhart',
    note: 'Tuesday and Thursday classes',
    days: [
      { date: '2026-08-04', time: '4:55 PM', day: 'Tuesday', className: 'DTM Elkhart', expectedMealCount: 34 },
      { date: '2026-08-06', time: '5:10 PM', day: 'Thursday', className: 'DTM Elkhart', expectedMealCount: 34 },
      { date: '2026-08-11', time: '4:55 PM', day: 'Tuesday', className: 'DTM Elkhart', expectedMealCount: 34 },
      { date: '2026-08-13', time: '5:10 PM', day: 'Thursday', className: 'DTM Elkhart', expectedMealCount: 34 },
      { date: '2026-08-18', time: '4:55 PM', day: 'Tuesday', className: 'DTM Elkhart', expectedMealCount: 34 },
      { date: '2026-08-20', time: '5:10 PM', day: 'Thursday', className: 'DTM Elkhart', expectedMealCount: 34 },
    ],
  },
  {
    id: 'middlebury',
    name: 'Middlebury Campus',
    address: 'TBD',
    note: 'Projected August launch',
    days: [
      { date: '2026-08-06', time: '5:00 PM', day: 'Thursday', className: 'DTM Middlebury', expectedMealCount: 22 },
      { date: '2026-08-13', time: '5:00 PM', day: 'Thursday', className: 'DTM Middlebury', expectedMealCount: 22 },
      { date: '2026-08-20', time: '5:00 PM', day: 'Thursday', className: 'DTM Middlebury', expectedMealCount: 22 },
      { date: '2026-08-27', time: '5:00 PM', day: 'Thursday', className: 'DTM Middlebury', expectedMealCount: 22 },
    ],
  },
]

const initialBookedKeys = ['goshen:2026-08-05', 'elkhart:2026-08-13']

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

const formatMonth = (monthKey) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthKey}-01T12:00:00`))

const monthKeyForDate = (date) => date.slice(0, 7)

const addMonths = (monthKey, offset) => {
  const cursor = new Date(`${monthKey}-01T12:00:00`)
  cursor.setMonth(cursor.getMonth() + offset)
  return cursor.toISOString().slice(0, 7)
}

const todayDateKey = () => {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

const isMealDateUpcoming = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayDateKey()

const mealCountForDay = (day, location) =>
  day?.expectedMealCount || day?.servingSize || location?.servingSize || ''

const weekdayForDate = (date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${date}T12:00:00`))
    : ''

function MealSignupApp() {
  const [locations, setLocations] = useState(defaultLocations)
  const [selectedLocationId, setSelectedLocationId] = useState('goshen')
  const [selectedDates, setSelectedDates] = useState([])
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(monthKeyForDate(todayDateKey()))
  const [mealFrequency, setMealFrequency] = useState('one-time')
  const [mealFrequencyCount, setMealFrequencyCount] = useState('4')
  const [bookedKeys, setBookedKeys] = useState(initialBookedKeys)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [usingLiveData, setUsingLiveData] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    churchGroup: '',
    meal: '',
    notes: '',
    textReminders: false,
  })

  useEffect(() => {
    let active = true

    async function loadRemoteState() {
      try {
        const response = await fetch(API_STATE_URL, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`State API returned ${response.status}`)
        const payload = await response.json()
        if (!active || !payload.state) return
        if (Array.isArray(payload.state.locations) && payload.state.locations.length) {
          setLocations(payload.state.locations)
        }
        setBookedKeys(bookedKeysFromState(payload.state))
        setUsingLiveData(true)
      } catch (error) {
        console.warn('Using local prototype data because Firebase is unavailable.', error)
        if (active) setUsingLiveData(false)
      }
    }

    loadRemoteState()
    return () => {
      active = false
    }
  }, [])

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) ||
    locations[0] ||
    defaultLocations[0]
  const availableDays = useMemo(
    () => (selectedLocation.days || []).filter((day) => isMealDateUpcoming(day.date)),
    [selectedLocation],
  )
  const availableMonths = useMemo(
    () => [...new Set(availableDays.map((day) => monthKeyForDate(day.date)))],
    [availableDays],
  )
  const displayMonth =
    availableMonths.length && !availableMonths.includes(visibleMonth)
      ? availableMonths[0]
      : visibleMonth
  const visibleDays = useMemo(
    () => availableDays.filter((day) => monthKeyForDate(day.date) === displayMonth),
    [availableDays, displayMonth],
  )

  const selectedMeals = useMemo(
    () =>
      selectedDates
        .map((date) => selectedLocation.days.find((day) => day.date === date))
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [selectedDates, selectedLocation],
  )

  const handleLocationSelect = (locationId) => {
    setSelectedLocationId(locationId)
    setSelectedDates([])
    setSelectedStartDate('')
    setSubmitted(false)
  }

  const openDaysFrom = (date) =>
    availableDays.filter((day) =>
      day.date >= date && !day.filled && !bookedKeys.includes(`${selectedLocation.id}:${day.date}`),
    )

  const recurringCount = Math.max(1, Number.parseInt(mealFrequencyCount, 10) || 1)

  const frequencyDatesFrom = (day, frequency = mealFrequency, count = recurringCount) => {
    const openDays = openDaysFrom(day.date)
    if (frequency === 'weekly') {
      return openDays
        .filter((candidate) => candidate.day === day.day && candidate.className === day.className)
        .slice(0, count)
        .map((candidate) => candidate.date)
    }
    if (frequency === 'biweekly') {
      const startTime = new Date(`${day.date}T12:00:00`).getTime()
      return openDays
        .filter((candidate) => candidate.day === day.day && candidate.className === day.className)
        .filter((candidate) => {
          const diffDays = Math.round((new Date(`${candidate.date}T12:00:00`).getTime() - startTime) / 86400000)
          return diffDays % 14 === 0
        })
        .slice(0, count)
        .map((candidate) => candidate.date)
    }
    if (frequency === 'monthly') {
      const datesByMonth = new Map()
      openDays
        .filter((candidate) => candidate.day === day.day && candidate.className === day.className)
        .forEach((candidate) => {
          const month = monthKeyForDate(candidate.date)
          if (!datesByMonth.has(month)) datesByMonth.set(month, candidate.date)
        })
      return [...datesByMonth.values()].slice(0, count)
    }
    return [day.date]
  }

  const updateMealFrequency = (frequency) => {
    setMealFrequency(frequency)
    setSubmitted(false)
    if (!selectedStartDate) return
    const startDay = availableDays.find((day) => day.date === selectedStartDate)
    if (!startDay || bookedKeys.includes(`${selectedLocation.id}:${startDay.date}`)) return
    setSelectedDates(frequencyDatesFrom(startDay, frequency))
  }

  const updateMealFrequencyCount = (countValue) => {
    setMealFrequencyCount(countValue)
    setSubmitted(false)
    if (mealFrequency === 'one-time' || !selectedStartDate) return
    const startDay = availableDays.find((day) => day.date === selectedStartDate)
    if (!startDay || bookedKeys.includes(`${selectedLocation.id}:${startDay.date}`)) return
    const count = Math.max(1, Number.parseInt(countValue, 10) || 1)
    setSelectedDates(frequencyDatesFrom(startDay, mealFrequency, count))
  }

  const toggleDate = (date) => {
    if (bookedKeys.includes(`${selectedLocation.id}:${date}`)) return
    const day = availableDays.find((candidate) => candidate.date === date)
    if (!day) return
    setSubmitted(false)
    setSelectedStartDate(day.date)
    if (mealFrequency !== 'one-time') {
      const datesToSelect = frequencyDatesFrom(day)
      setSelectedDates(datesToSelect)
      return
    }
    if (selectedDates.includes(date) && selectedDates.length === 1) {
      setSelectedStartDate('')
    }
    setSelectedDates((dates) =>
      dates.includes(date)
        ? dates.filter((selectedDate) => selectedDate !== date)
        : [...dates, date],
    )
  }

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target
    setSubmitted(false)
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedDates.length) return
    setSubmitting(true)
    setStatusMessage('')

    const payload = {
      locationId: selectedLocation.id,
      dates: selectedDates,
      ...form,
    }

    try {
      const response = await fetch(API_SIGNUP_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'The signup could not be saved.')
      }
      setBookedKeys(bookedKeysFromState(result.state))
      setUsingLiveData(true)
      setSelectedDates([])
      setSelectedStartDate('')
      setSubmitted(true)
      setStatusMessage(
        'Signup saved. Confirmation messages and reminders are queued.',
      )
    } catch (error) {
      if (usingLiveData) {
        setStatusMessage(error.message)
      } else {
        setBookedKeys((keys) => [
          ...new Set([
            ...keys,
            ...selectedDates.map((date) => `${selectedLocation.id}:${date}`),
          ]),
        ])
        setSelectedDates([])
        setSelectedStartDate('')
        setSubmitted(true)
        setStatusMessage(
          'Local prototype signup saved. Deploy to Firebase to queue messages.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main>
      <header className="site-header">
        <img src={appUrl('downtown-ministries-logo.png')} alt="Downtown Ministries logo" />
        <div>
          <p className="eyebrow">Provide a Meal for DTM Classes</p>
          <h1>Meals Make Ministry Possible</h1>
          <p className="intro">
            Help create a welcoming environment for our participants by
            providing a meal for one of our weekly classes. Meals remove
            barriers after work, school, and long days while creating community,
            hospitality, and focus for class time.
          </p>
          <div className="header-actions">
            <a href={appUrl('reimbursement')}>Request reimbursement</a>
          </div>
        </div>
      </header>

      <section className="section-band">
        <div className="section-heading">
          <p className="eyebrow">Step 1</p>
          <h2>Choose a Location</h2>
        </div>
        <div className="location-grid">
          {locations.map((location) => (
            <button
              className={`location-card ${
                selectedLocationId === location.id ? 'selected' : ''
              }`}
              key={location.id}
              onClick={() => handleLocationSelect(location.id)}
              type="button"
            >
              <strong>{location.name}</strong>
              <small>{location.address}</small>
              <p>{location.note}</p>
            </button>
          ))}
        </div>
      </section>

      <form className="signup-layout" onSubmit={handleSubmit}>
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 2</p>
            <h2>Pick Available Meal Dates</h2>
            <p>
              Claimed dates are marked unavailable.
            </p>
          </div>

          <div className="month-picker">
            <button
              aria-label="Previous month"
              onClick={() => setVisibleMonth(addMonths(displayMonth, -1))}
              type="button"
            >
              &lt;
            </button>
            <strong>{formatMonth(displayMonth)}</strong>
            <button
              aria-label="Next month"
              onClick={() => setVisibleMonth(addMonths(displayMonth, 1))}
              type="button"
            >
              &gt;
            </button>
          </div>

          <fieldset className="frequency-picker">
            <legend>How often would you like to provide a meal?</legend>
            {[
              ['one-time', 'One-time'],
              ['weekly', 'Weekly'],
              ['biweekly', 'Biweekly'],
              ['monthly', 'Monthly'],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  checked={mealFrequency === value}
                  name="mealFrequency"
                  onChange={(event) => updateMealFrequency(event.target.value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
            {mealFrequency !== 'one-time' && (
              <label className="frequency-count">
                How many?
                <input
                  min="1"
                  onChange={(event) => updateMealFrequencyCount(event.target.value)}
                  type="number"
                  value={mealFrequencyCount}
                />
              </label>
            )}
          </fieldset>

          <div className="date-grid">
            {visibleDays.map((day) => {
              const isBooked = day.filled || bookedKeys.includes(
                `${selectedLocation.id}:${day.date}`,
              )
              const isSelected = selectedDates.includes(day.date)
              return (
                <button
                  className={`date-card ${isSelected ? 'selected' : ''}`}
                  disabled={isBooked}
                  key={day.date}
                  onClick={() => toggleDate(day.date)}
                  type="button"
                >
                  <span>{day.day}</span>
                  <strong>{formatDate(day.date)}</strong>
                  <small>{day.className || selectedLocation.name}</small>
                  <small>{isBooked ? 'Already taken' : `Meal time ${day.time}`}</small>
                </button>
              )
            })}
          </div>
          {!availableDays.length && (
            <p className="empty-note">
              No upcoming meal dates are currently open for this location.
            </p>
          )}
          {availableDays.length > 0 && !visibleDays.length && (
            <p className="empty-note">
              No available meal dates are set up for {formatMonth(displayMonth)}.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 3</p>
            <h2>Tell Us About You and the Meal</h2>
          </div>

          <div className="field-grid">
            <label>
              Full name
              <input
                name="fullName"
                onChange={updateForm}
                required
                type="text"
                value={form.fullName}
              />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                onChange={updateForm}
                placeholder="xxx-xxx-xxxx"
                required
                type="tel"
                value={form.phone}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                onChange={updateForm}
                placeholder="name@example.com"
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="full-span-field">
              Mailing address
              <input
                name="addressLine1"
                onChange={updateForm}
                placeholder="PO Box or street address"
                required
                type="text"
                value={form.addressLine1}
              />
              <input
                name="addressLine2"
                onChange={updateForm}
                placeholder="City, State Zip"
                required
                type="text"
                value={form.addressLine2}
              />
            </label>
            <label>
              Church or group
              <input
                name="churchGroup"
                onChange={updateForm}
                type="text"
                value={form.churchGroup}
              />
            </label>
            <label>
              Meal being provided
              <input
                name="meal"
                onChange={updateForm}
                placeholder="Example: pasta, salad, bread, dessert"
                required
                type="text"
                value={form.meal}
              />
            </label>
          </div>

          <div className="sms-consent">
            <input
              checked={form.textReminders}
              id="text-reminders"
              name="textReminders"
              onChange={updateForm}
              type="checkbox"
            />
            <label htmlFor="text-reminders">
              I agree to receive SMS text messages from Downtown Ministries of
              Goshen regarding volunteer assignment confirmations and reminders.
              Message frequency varies. Message and data rates may apply. Reply
              STOP to opt out or HELP for help. View our{' '}
              <a
                href="https://www.downtownmin.org/privacy-policy"
                rel="noreferrer"
                target="_blank"
              >
                Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="https://www.downtownmin.org/terms-of-service"
                rel="noreferrer"
                target="_blank"
              >
                Terms of Service
              </a>
              .
            </label>
          </div>

          <label>
            Notes
            <textarea
              name="notes"
              onChange={updateForm}
              rows="4"
              value={form.notes}
            />
          </label>
        </section>

        <aside className="summary">
          <div className="section-heading">
            <p className="eyebrow">Review</p>
            <h2>Signup Summary</h2>
          </div>

          <dl>
            <div>
              <dt>Location</dt>
              <dd>{selectedLocation.name}</dd>
            </div>
            <div>
              <dt>Drop-off address</dt>
              <dd>{selectedLocation.address}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>
                {selectedMeals.length
                  ? selectedMeals
                      .map((meal) => `${formatDate(meal.date)} at ${meal.time}`)
                      .join(', ')
                  : 'Select one or more dates'}
              </dd>
            </div>
            <div>
              <dt>Expected meal count</dt>
              <dd>
                {selectedMeals.length
                  ? selectedMeals
                      .map((meal) => mealCountForDay(meal, selectedLocation) || 'TBD')
                      .join(', ')
                  : 'Select a date'}
              </dd>
            </div>
            <div>
              <dt>Meal</dt>
              <dd>{form.meal || 'Meal details not entered yet'}</dd>
            </div>
            <div>
              <dt>Reminder plan</dt>
              <dd>
                Email confirmation and one-week email reminder
                {form.textReminders ? ', plus one-week and day-before texts' : ''}
              </dd>
            </div>
          </dl>

          <button className="primary-action" disabled={submitting} type="submit">
            {submitting ? 'Saving signup...' : 'Submit meal signup'}
          </button>

          {submitted && (
            <p className="success-message">
              {statusMessage}
            </p>
          )}
          {!submitted && statusMessage && (
            <p className="error-message">{statusMessage}</p>
          )}
        </aside>
      </form>
      <SiteFooter />
    </main>
  )
}

function ReimbursementApp() {
  const initialReimbursementToken = new URLSearchParams(window.location.search).get('token') || ''
  const [reimbursementToken] = useState(initialReimbursementToken)
  const [emailRequest, setEmailRequest] = useState('')
  const [emailLinkSent, setEmailLinkSent] = useState(false)
  const [requestingLink, setRequestingLink] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(Boolean(initialReimbursementToken))
  const [tokenReady, setTokenReady] = useState(false)
  const [form, setForm] = useState({
    signupId: '',
    fullName: '',
    providerAddress: '',
    className: '',
    classDate: '',
    notes: '',
  })
  const [availableMeals, setAvailableMeals] = useState([])
  const [receipts, setReceipts] = useState([emptyReceipt()])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const total = receipts.reduce(
    (sum, receipt) => sum + (Number.parseFloat(receipt.amount) || 0),
    0,
  )

  const updateForm = (event) => {
    const { name, value } = event.target
    setResult(null)
    setError('')
    setForm((current) => ({ ...current, [name]: value }))
  }

  useEffect(() => {
    if (!reimbursementToken) return undefined
    let active = true

    async function authenticateLink() {
      setTokenLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl(`/api/authenticate-reimbursement-link?app=${API_APP_ID}`), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: reimbursementToken }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!active) return
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'This reimbursement link could not be opened.')
        }
        setAvailableMeals(providedMealOptions(payload.meals || []))
        setTokenReady(true)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setTokenLoading(false)
      }
    }

    authenticateLink()
    return () => {
      active = false
    }
  }, [reimbursementToken])

  const selectedMeal = availableMeals.find((meal) => meal.id === form.signupId)

  const requestReimbursementLink = async (event) => {
    event.preventDefault()
    if (!emailRequest) {
      setError('Enter the email address used for the meal signup.')
      return
    }
    setRequestingLink(true)
    setEmailLinkSent(false)
    setError('')
    setResult(null)
    try {
      const response = await fetch(apiUrl(`/api/request-reimbursement-link?app=${API_APP_ID}`), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailRequest }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'The reimbursement link could not be sent.')
      }
      setEmailLinkSent(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setRequestingLink(false)
    }
  }

  const chooseProvidedMeal = (event) => {
    const signupId = event.target.value
    const meal = availableMeals.find((item) => item.id === signupId)
    setResult(null)
    setError('')
    setForm((current) => ({
      ...current,
      signupId,
      fullName: '',
      providerAddress: '',
      className: meal?.className || '',
      classDate: meal?.date || '',
    }))
  }

  const updateReceipt = (id, updates) => {
    setResult(null)
    setError('')
    setReceipts((current) =>
      current.map((receipt) =>
        receipt.id === id ? { ...receipt, ...updates } : receipt,
      ),
    )
  }

  const addReceipt = () => {
    setReceipts((current) => [...current, emptyReceipt()])
  }

  const removeReceipt = (id) => {
    setReceipts((current) =>
      current.length === 1
        ? current.map((receipt) =>
            receipt.id === id ? { ...emptyReceipt(), id } : receipt,
          )
        : current.filter((receipt) => receipt.id !== id),
    )
  }

  const handleReceiptFile = async (id, file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Receipt photos need to be JPG or PNG images.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Each receipt photo must be smaller than 8 MB.')
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    updateReceipt(id, {
      name: file.name,
      contentType: file.type,
      data: dataUrl.split(',')[1],
      previewUrl: dataUrl,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setResult(null)

    const receiptPayload = receipts
      .filter((receipt) => receipt.amount || receipt.data)
      .map(({ amount, name, contentType, data }) => ({
        amount,
        name,
        contentType,
        data,
      }))

    try {
      const response = await fetch(apiUrl(`/api/reimbursement?app=${API_APP_ID}`), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, reimbursementToken, receipts: receiptPayload }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'The reimbursement request was not saved.')
      }
      setResult(payload)
      setAvailableMeals((current) => current.filter((meal) => meal.id !== form.signupId))
      setForm({ signupId: '', fullName: '', providerAddress: '', className: '', classDate: '', notes: '' })
      setReceipts([emptyReceipt()])
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main>
      <header className="site-header reimbursement-header">
        <img src={appUrl('downtown-ministries-logo.png')} alt="Downtown Ministries logo" />
        <div>
          <p className="eyebrow">Meal Supplies</p>
          <h1>Reimbursement Request</h1>
          <p className="intro">
            Submit meal supply receipts from your phone. The app creates a PDF
            packet with the reimbursement details and receipt photos for review.
          </p>
          <div className="header-actions">
            <a href={appUrl()}>Meal signup</a>
          </div>
        </div>
      </header>

      <form
        className="reimbursement-layout"
        onSubmit={tokenReady ? handleSubmit : requestReimbursementLink}
      >
        {!tokenReady && (
        <section className="panel reimbursement-access-panel">
          <div className="section-heading">
            <p className="eyebrow">Step 1</p>
            <h2>Find Your Meals</h2>
          </div>

          {tokenLoading ? (
            <p className="empty-note">Opening your reimbursement link...</p>
          ) : (
            <>
              <p className="empty-note">
                Enter the email address you used when signing up to provide a meal.
                We will send a private link showing only your meals.
              </p>
              <div className="inline-request-form">
                <label>
                  Email address
                  <input
                    onChange={(event) => {
                      setEmailRequest(event.target.value)
                      setEmailLinkSent(false)
                      setError('')
                    }}
                    required
                    type="email"
                    value={emailRequest}
                  />
                </label>
                <button
                  className="primary-action"
                  disabled={requestingLink}
                  onClick={requestReimbursementLink}
                  type="button"
                >
                  {requestingLink ? 'Sending link...' : 'Send reimbursement link'}
                </button>
              </div>
              {emailLinkSent && (
                <p className="success-message">
                  If that email matches a meal signup, a reimbursement link has been sent.
                </p>
              )}
            </>
          )}
          {error && <p className="error-message">{error}</p>}
        </section>
        )}

        {tokenReady && (
        <>
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Step 1</p>
            <h2>Choose Your Provided Meal</h2>
          </div>

          {!result && availableMeals.length > 0 && (
            <label>
              Provided meal
              <select
                name="signupId"
                onChange={chooseProvidedMeal}
                required
                value={form.signupId}
              >
                <option value="">Choose a meal</option>
                {availableMeals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!result && availableMeals.length === 0 && (
            <p className="empty-note">
              No unreimbursed meal dates were found for this reimbursement link.
            </p>
          )}

          {selectedMeal && (
            <dl className="selected-meal-details">
              <div>
                <dt>Location</dt>
                <dd>{selectedMeal.locationName}</dd>
              </div>
              <div>
                <dt>Class and date</dt>
                <dd>{selectedMeal.className} - {formatDate(selectedMeal.date)}</dd>
              </div>
              <div>
                <dt>Meal time</dt>
                <dd>{selectedMeal.time || 'TBD'}</dd>
              </div>
            </dl>
          )}

          <label>
            Notes
            <textarea
              name="notes"
              onChange={updateForm}
              rows="3"
              value={form.notes}
            />
          </label>
        </section>

        <section className="panel">
          <div className="section-heading receipt-heading">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Upload Receipts</h2>
            </div>
            <button className="secondary-action" onClick={addReceipt} type="button">
              Add receipt
            </button>
          </div>

          <div className="receipt-list">
            {receipts.map((receipt, index) => (
              <div className="receipt-card" key={receipt.id}>
                <div className="receipt-card-header">
                  <strong>Receipt {index + 1}</strong>
                  <button
                    className="text-action"
                    onClick={() => removeReceipt(receipt.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
                <div className="field-grid">
                  <label>
                    Amount
                    <input
                      min="0.01"
                      onChange={(event) =>
                        updateReceipt(receipt.id, { amount: event.target.value })
                      }
                      required
                      step="0.01"
                      type="number"
                      value={receipt.amount}
                    />
                  </label>
                  <label className="camera-upload-label">
                    Take or upload receipt photo
                    <input
                      accept="image/jpeg,image/png"
                      capture="environment"
                      className="camera-upload-input"
                      onChange={(event) =>
                        handleReceiptFile(receipt.id, event.target.files?.[0])
                      }
                      required={!receipt.data}
                      type="file"
                    />
                    <span className="camera-upload-button">
                      {receipt.name ? 'Replace receipt photo' : 'Open camera or photos'}
                    </span>
                    {receipt.name && (
                      <small className="selected-file-name">{receipt.name}</small>
                    )}
                  </label>
                </div>
                {receipt.previewUrl && (
                  <img
                    alt={`Receipt ${index + 1} preview`}
                    className="receipt-preview"
                    src={receipt.previewUrl}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <aside className="summary reimbursement-summary">
          <div className="section-heading">
            <p className="eyebrow">Review</p>
            <h2>PDF Packet</h2>
          </div>
          <dl>
            <div>
              <dt>Provided meal</dt>
              <dd>{selectedMeal ? selectedMeal.label : 'Not selected yet'}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{form.className || 'Not entered yet'}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{form.classDate || 'Not selected yet'}</dd>
            </div>
            <div>
              <dt>Receipts</dt>
              <dd>{receipts.filter((receipt) => receipt.amount || receipt.data).length}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>

          <button className="primary-action" disabled={submitting} type="submit">
            {submitting ? 'Creating PDF...' : 'Submit reimbursement'}
          </button>

          {result && (
            <p className="success-message">
              Reimbursement request saved. PDF packet is waiting for review.
              Request ID: {result.requestId}
            </p>
          )}
          {result && (
            <a className="primary-action link-action" href={appUrl()}>
              Meal Signup
            </a>
          )}
          {error && <p className="error-message">{error}</p>}
        </aside>
        </>
        )}
      </form>
      <SiteFooter />
    </main>
  )
}

function emptyReceipt() {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    amount: '',
    name: '',
    contentType: '',
    data: '',
    previewUrl: '',
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('The receipt photo could not be read.'))
    reader.readAsDataURL(file)
  })
}

function providedMealOptions(meals) {
  return (Array.isArray(meals) ? meals : [])
    .map((meal) => ({
      ...meal,
      label: [
        formatDate(meal.date),
        meal.locationName,
        meal.className,
        meal.time,
      ].filter(Boolean).join(' - '),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.locationName.localeCompare(b.locationName))
}

function dateIsChosen(locationId, date, signups = []) {
  return signups.some((signup) =>
    signup.locationId === locationId && (signup.dates || []).includes(date),
  )
}

function locationHasChosenMeals(locationId, signups = []) {
  return signups.some((signup) => signup.locationId === locationId)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0)
}

function AdminApp() {
  const [token, setToken] = useState('')
  const [login, setLogin] = useState({ username: '', password: '' })
  const [adminData, setAdminData] = useState(null)
  const [activeAdminView, setActiveAdminView] = useState('schedule')
  const [locations, setLocations] = useState([])
  const [filters, setFilters] = useState({ locationId: 'all', month: '', className: 'all' })
  const [accountForm, setAccountForm] = useState({ username: '', password: '' })
  const [passwordForm, setPasswordForm] = useState({ password: '' })
  const [allowChosenDateOverride, setAllowChosenDateOverride] = useState(false)
  const [bulkDateForms, setBulkDateForms] = useState({})
  const [reminderForms, setReminderForms] = useState({ emailTemplates: {}, smsTemplates: {} })
  const [regularForm, setRegularForm] = useState({
    username: '',
    password: '',
    accessLevel: 'schedule',
  })
  const [reimbursementFilter, setReimbursementFilter] = useState('pending')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const authHeaders = (activeToken = token) => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${activeToken}`,
  })

  const loadAdminState = async (activeToken = token) => {
    try {
      const response = await fetch(apiUrl(`/api/admin-state?app=${API_APP_ID}`), {
        headers: authHeaders(activeToken),
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Admin session expired.')
      setAdminData(payload)
      setLocations(payload.locations || [])
      setAccountForm({ username: payload.mainAdminUsername || '', password: '' })
      setReminderForms({
        emailTemplates: payload.emailTemplates || {},
        smsTemplates: payload.smsTemplates || {},
      })
      if (payload.role === 'recovery') setActiveAdminView('adminAccounts')
      if (payload.role === 'accounting') setActiveAdminView('accounting')
      setError('')
    } catch (loadError) {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      setToken('')
      setAdminData(null)
      setError(loadError.message)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-login?app=${API_APP_ID}`), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Invalid admin login.')
      }
      sessionStorage.setItem(ADMIN_TOKEN_KEY, payload.token)
      setToken(payload.token)
      setLogin({ username: '', password: '' })
      await loadAdminState(payload.token)
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  const updateLocation = (id, updates) => {
    setLocations((current) =>
      current.map((location) =>
        location.id === id ? { ...location, ...updates } : location,
      ),
    )
  }

  const addLocation = () => {
    const nextId = `location-${Date.now()}`
    setLocations((current) => [
      ...current,
      {
        id: nextId,
        name: 'New Location',
        address: '',
        note: '',
        days: [],
      },
    ])
  }

  const removeLocation = (id) => {
    const location = locations.find((item) => item.id === id)
    if (locationHasChosenMeals(id, adminData?.signups || [])) {
      if (!isFull) {
        setError('This location has signup history and can only be deleted by a full admin.')
        return
      }
      if (
        !window.confirm(
          `${location?.name || 'This location'} has signup history. Delete it anyway using the full-admin override?`,
        ) ||
        !window.confirm('Please confirm again. This will remove the location from meal setup, but past signup records will remain in history.')
      ) {
        return
      }
      setAllowChosenDateOverride(true)
    } else if (
      !window.confirm(`Delete ${location?.name || 'this location'} and all open meal dates?`) ||
      !window.confirm('Please confirm again. This will permanently remove the location and its open dates.')
    ) {
      return
    }
    setLocations((current) => current.filter((location) => location.id !== id))
  }

  const updateDate = (locationId, index, updates) => {
    const location = locations.find((item) => item.id === locationId)
    const day = location?.days?.[index]
    if (
      updates.date &&
      location?.days?.some((mealDate, dayIndex) => dayIndex !== index && mealDate.date === updates.date) &&
      !window.confirm('That date is already set up - do you want to add another on the same day?')
    ) {
      return
    }
    if (day && dateIsChosen(locationId, day.date, adminData?.signups || [])) {
      setError('Chosen meal dates cannot be modified. Remove or change the meal preparer first.')
      return
    }
    setLocations((current) =>
      current.map((location) =>
        location.id === locationId
          ? {
              ...location,
              days: location.days.map((day, dayIndex) =>
                dayIndex === index ? { ...day, ...updates } : day,
              ),
            }
          : location,
      ),
    )
  }

  const addDate = (locationId) => {
    setLocations((current) =>
      current.map((location) =>
        location.id === locationId
          ? {
              ...location,
              days: [
                ...location.days,
                {
                  date: '',
                  time: '5:00 PM',
                  day: '',
                  className: '',
                  expectedMealCount: '',
                  filled: false,
                },
              ],
            }
          : location,
      ),
    )
  }

  const updateBulkDateForm = (locationId, updates) => {
    setBulkDateForms((current) => ({
      ...current,
      [locationId]: {
        startDate: '',
        recurrence: 'weekly',
        count: '4',
        time: '5:00 PM',
        className: '',
        expectedMealCount: '',
        ...(current[locationId] || {}),
        ...updates,
      },
    }))
  }

  const addRecurringDates = (locationId) => {
    const form = {
      startDate: '',
      recurrence: 'weekly',
      count: '4',
      time: '5:00 PM',
      className: '',
      expectedMealCount: '',
      ...(bulkDateForms[locationId] || {}),
    }
    const count = Number.parseInt(form.count, 10)
    if (!form.startDate || !count || count < 1) {
      setError('Enter a start date and number of dates to add.')
      return
    }
    const dates = buildRecurringMealDates(form)
    const location = locations.find((item) => item.id === locationId)
    const duplicateDates = dates.filter((date) =>
      location?.days?.some((day) => day.date === date.date),
    )
    if (
      duplicateDates.length &&
      !window.confirm('That date is already set up - do you want to add another on the same day?')
    ) {
      return
    }
    setLocations((current) =>
      current.map((location) =>
        location.id === locationId
          ? {
              ...location,
              days: [...location.days, ...dates].sort((a, b) => a.date.localeCompare(b.date)),
            }
          : location,
      ),
    )
    setError('')
  }

  const removeDate = (locationId, index) => {
    const location = locations.find((item) => item.id === locationId)
    const day = location?.days?.[index]
    if (day && dateIsChosen(locationId, day.date, adminData?.signups || [])) {
      if (!isFull) {
        setError('Chosen meal dates cannot be removed. Remove or change the meal preparer first.')
        return
      }
      if (
        !window.confirm('This meal date already has a meal preparer. Remove it anyway?') ||
        !window.confirm('Please confirm again. This will remove the chosen meal date from setup.')
      ) {
        return
      }
      setAllowChosenDateOverride(true)
    }
    setLocations((current) =>
      current.map((location) =>
        location.id === locationId
          ? {
              ...location,
              days: location.days.filter((_, dayIndex) => dayIndex !== index),
            }
          : location,
      ),
    )
  }

  const saveLocations = async () => {
    setError('')
    setMessage('')
    if (
      !window.confirm('Save changes to meal locations and dates?') ||
      !window.confirm('Please confirm again before modifying the meal setup.')
    ) {
      return
    }
    try {
      const response = await fetch(apiUrl(`/api/admin-locations?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ locations, allowChosenDateOverride }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Locations could not be saved.')
      }
      setLocations(payload.locations)
      setAdminData((current) => ({ ...current, ...payload }))
      setAllowChosenDateOverride(false)
      setMessage('Locations and meal dates saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const updateEmailTemplate = (templateKey, updates) => {
    setReminderForms((current) => ({
      ...current,
      emailTemplates: {
        ...current.emailTemplates,
        [templateKey]: {
          ...(current.emailTemplates?.[templateKey] || {}),
          ...updates,
        },
      },
    }))
  }

  const updateSmsTemplate = (templateKey, value) => {
    setReminderForms((current) => ({
      ...current,
      smsTemplates: {
        ...current.smsTemplates,
        [templateKey]: value,
      },
    }))
  }

  const saveReminderTemplates = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-reminders?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(reminderForms),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Reminder setup could not be saved.')
      }
      setReminderForms({
        emailTemplates: payload.emailTemplates || {},
        smsTemplates: payload.smsTemplates || {},
      })
      setAdminData((current) => ({ ...current, ...payload }))
      setMessage('Reminder setup saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const saveMainAccount = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-main-account?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(accountForm),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Admin account could not be updated.')
      }
      setMessage('Main full-admin account updated.')
      setAccountForm((current) => ({ ...current, password: '' }))
      await loadAdminState()
    } catch (accountError) {
      setError(accountError.message)
    }
  }

  const changeOwnPassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-change-own-password?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(passwordForm),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Password could not be changed.')
      }
      setPasswordForm({ password: '' })
      setAdminData(payload)
      setLocations(payload.locations || [])
      setMessage('Password changed.')
    } catch (passwordError) {
      setError(passwordError.message)
    }
  }

  const addRegularAdmin = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-regular-admins?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(regularForm),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Regular admin could not be added.')
      }
      setAdminData(payload)
      setRegularForm({ username: '', password: '', accessLevel: 'schedule' })
      setMessage('Admin account added.')
    } catch (regularError) {
      setError(regularError.message)
    }
  }

  const deleteRegularAdmin = async (id) => {
    setError('')
    setMessage('')
    try {
      const response = await fetch(
        `/api/admin-delete-regular-admin?app=${API_APP_ID}`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id }),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Regular admin could not be deleted.')
      }
      setAdminData(payload)
      setMessage('Regular admin deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const removeMealPreparer = async (row) => {
    if (
      !window.confirm(`Remove ${row.preparerName || 'this meal preparer'} from ${formatDate(row.date)} and make the date available again?`) ||
      !window.confirm('Please confirm again. This will reopen the meal date for public signup.')
    ) {
      return
    }
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-remove-meal-preparer?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ locationId: row.locationId, date: row.date }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Meal preparer could not be removed.')
      }
      setAdminData(payload)
      setLocations(payload.locations || [])
      setMessage('Meal preparer removed. The date is available again.')
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  const deleteReimbursementRequest = async (request) => {
    if (
      !window.confirm(`Delete reimbursement request for ${request.fullName || 'this provider'} on ${request.classDate || 'this date'}?`) ||
      !window.confirm('Please confirm again. This removes the request and clears the meal reimbursement marker.')
    ) {
      return
    }
    setError('')
    setMessage('')
    try {
      const response = await fetch(apiUrl(`/api/admin-delete-reimbursement?app=${API_APP_ID}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id: request.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Reimbursement request could not be deleted.')
      }
      setAdminData(payload)
      setLocations(payload.locations || [])
      setMessage('Reimbursement request deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    setToken('')
    setAdminData(null)
  }

  if (!adminData) {
    return (
      <main>
        <header className="site-header admin-header">
          <img src={appUrl('downtown-ministries-logo.png')} alt="Downtown Ministries logo" />
          <div>
            <p className="eyebrow">Meal Signup Admin</p>
            <h1>Admin Login</h1>
            <p className="intro">
              Manage meal locations, class dates, and the printable meal
              schedule.
            </p>
            <div className="header-actions">
              <a href={appUrl()}>Meal signup</a>
              <a href={appUrl('reimbursement')}>Reimbursement</a>
            </div>
          </div>
        </header>
        <section className="admin-shell single-panel">
          <form className="panel admin-login-panel" onSubmit={handleLogin}>
            <label>
              Login
              <input
                onChange={(event) =>
                  setLogin((current) => ({ ...current, username: event.target.value }))
                }
                required
                type="text"
                value={login.username}
              />
            </label>
            <label>
              Password
              <input
                onChange={(event) =>
                  setLogin((current) => ({ ...current, password: event.target.value }))
                }
                required
                type="password"
                value={login.password}
              />
            </label>
            <button className="primary-action" type="submit">Log in</button>
            {error && <p className="error-message">{error}</p>}
          </form>
        </section>
      </main>
    )
  }

  if (adminData.forcePasswordChange) {
    return (
      <main>
        <header className="site-header admin-header">
          <img src={appUrl('downtown-ministries-logo.png')} alt="Downtown Ministries logo" />
          <div>
            <p className="eyebrow">Meal Signup Admin</p>
            <h1>Change Temporary Password</h1>
            <p className="intro">
              Signed in as {adminData.username}. Create a new password before
              continuing to the admin dashboard.
            </p>
          </div>
        </header>
        <section className="admin-shell single-panel">
          <form className="panel admin-login-panel" onSubmit={changeOwnPassword}>
            <label>
              New password
              <input
                minLength="6"
                onChange={(event) => setPasswordForm({ password: event.target.value })}
                required
                type="password"
                value={passwordForm.password}
              />
            </label>
            <button className="primary-action" type="submit">Change password</button>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </form>
        </section>
      </main>
    )
  }

  const isRecovery = adminData.role === 'recovery'
  const isFull = adminData.role === 'full'
  const canManageSchedule = ['full', 'schedule'].includes(adminData.role)
  const canViewAccounting = ['full', 'accounting'].includes(adminData.role)
  const canViewSchedule = !isRecovery && (canManageSchedule || isFull)
  const canViewSetup = !isRecovery && canManageSchedule
  const canViewAdminAccounts = isFull || isRecovery
  const allDates = scheduleRows(locations, adminData.signups || [])
  const classFilterOptions = [
    ...new Set(allDates.map((row) => row.className).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b))
  const filteredRows = allDates.filter((row) => {
    const locationMatches =
      filters.locationId === 'all' || row.locationId === filters.locationId
    const monthMatches = !filters.month || row.date.startsWith(filters.month)
    const classMatches = filters.className === 'all' || row.className === filters.className
    return locationMatches && monthMatches && classMatches
  })
  const reimbursementRows = (adminData.reimbursements || []).filter((request) =>
    reimbursementFilter === 'completed'
      ? request.status === 'completed'
      : request.status !== 'completed',
  )

  return (
    <main>
      <header className="site-header admin-header">
        <img src={appUrl('downtown-ministries-logo.png')} alt="Downtown Ministries logo" />
        <div>
          <p className="eyebrow">Meal Signup Admin</p>
          <h1>Admin Dashboard</h1>
          <p className="intro">
            Signed in as {adminData.username} ({adminData.role}). Access is
            limited by admin role.
          </p>
          <div className="header-actions">
            <a href={appUrl()}>Meal signup</a>
            <a href={appUrl('reimbursement')}>Reimbursement</a>
            <button className="secondary-action" onClick={logout} type="button">
              Log out
            </button>
          </div>
          <nav className="top-menu">
            {canViewSchedule && (
              <button
                className={activeAdminView === 'schedule' ? 'active' : ''}
                onClick={() => setActiveAdminView('schedule')}
                type="button"
              >
                Schedule
              </button>
            )}
            {canViewSetup && (
              <button
                className={activeAdminView === 'setup' ? 'active' : ''}
                onClick={() => setActiveAdminView('setup')}
                type="button"
              >
                Setup
              </button>
            )}
            {canManageSchedule && (
              <button
                className={activeAdminView === 'reminders' ? 'active' : ''}
                onClick={() => setActiveAdminView('reminders')}
                type="button"
              >
                Reminders Setup
              </button>
            )}
            {canViewAccounting && (
              <button
                className={activeAdminView === 'accounting' ? 'active' : ''}
                onClick={() => setActiveAdminView('accounting')}
                type="button"
              >
                Accounting
              </button>
            )}
            {canViewAdminAccounts && (
              <button
                className={activeAdminView === 'adminAccounts' ? 'active' : ''}
                onClick={() => setActiveAdminView('adminAccounts')}
                type="button"
              >
                Admin Accounts
              </button>
            )}
          </nav>
        </div>
      </header>

      <section className="admin-shell">
        {canManageSchedule && activeAdminView === 'setup' && (
          <section className="panel admin-editor">
            <div className="section-heading admin-heading-row">
              <div>
                <p className="eyebrow">Locations</p>
                <h2>Meal Dates by Location</h2>
              </div>
              <button className="secondary-action" onClick={addLocation} type="button">
                Add location
              </button>
            </div>

            <div className="admin-location-list">
              {locations.map((location) => (
                <div className="admin-location-card" key={location.id}>
                  <div className="admin-location-title">
                    <strong>{location.name}</strong>
                    <button
                      className="text-action"
                      onClick={() => removeLocation(location.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="field-grid">
                    <label>
                      Location name
                      <input
                        onChange={(event) =>
                          updateLocation(location.id, { name: event.target.value })
                        }
                        value={location.name}
                      />
                    </label>
                    <label>
                      Address
                      <input
                        onChange={(event) =>
                          updateLocation(location.id, { address: event.target.value })
                        }
                        value={location.address}
                      />
                    </label>
                  </div>
                  <label>
                    Note
                    <input
                      onChange={(event) =>
                        updateLocation(location.id, { note: event.target.value })
                      }
                      value={location.note}
                    />
                  </label>
                  <div className="date-editor-header">
                    <strong>Meal dates</strong>
                    <button
                      className="secondary-action"
                      onClick={() => addDate(location.id)}
                      type="button"
                    >
                      Add single date
                    </button>
                  </div>
                  <div className="bulk-date-row">
                    <label>
                      Start date
                      <input
                        onChange={(event) => updateBulkDateForm(location.id, { startDate: event.target.value })}
                        type="date"
                        value={bulkDateForms[location.id]?.startDate || ''}
                      />
                    </label>
                    <label>
                      Recurrence
                      <select
                        onChange={(event) => updateBulkDateForm(location.id, { recurrence: event.target.value })}
                        value={bulkDateForms[location.id]?.recurrence || 'weekly'}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    <label>
                      Number of dates
                      <input
                        min="1"
                        onChange={(event) => updateBulkDateForm(location.id, { count: event.target.value })}
                        type="number"
                        value={bulkDateForms[location.id]?.count || '4'}
                      />
                    </label>
                    <label>
                      Meal time
                      <input
                        onChange={(event) => updateBulkDateForm(location.id, { time: event.target.value })}
                        value={bulkDateForms[location.id]?.time || '5:00 PM'}
                      />
                    </label>
                    <label>
                      Class name
                      <input
                        onChange={(event) => updateBulkDateForm(location.id, { className: event.target.value })}
                        value={bulkDateForms[location.id]?.className || ''}
                      />
                    </label>
                    <label>
                      Expected meal #
                      <input
                        min="1"
                        onChange={(event) => updateBulkDateForm(location.id, { expectedMealCount: event.target.value })}
                        type="number"
                        value={bulkDateForms[location.id]?.expectedMealCount || ''}
                      />
                    </label>
                    <button className="secondary-action" onClick={() => addRecurringDates(location.id)} type="button">
                      Add recurring dates
                    </button>
                  </div>
                  <div className="admin-date-list">
                    {location.days.map((day, index) => (
                      <div className="admin-date-row" key={`${location.id}-${index}`}>
                        <label>
                          Date
                          <input
                            onChange={(event) =>
                              updateDate(location.id, index, {
                                date: event.target.value,
                                day: weekdayForDate(event.target.value),
                              })
                            }
                            type="date"
                            value={day.date}
                          />
                        </label>
                        <label>
                          Day
                          <input readOnly value={day.day || ''} />
                        </label>
                        <label>
                          Meal time
                          <input
                            onChange={(event) =>
                              updateDate(location.id, index, { time: event.target.value })
                            }
                            placeholder="5:00 PM"
                            value={day.time}
                          />
                        </label>
                        <label>
                          Class name
                          <input
                            onChange={(event) =>
                              updateDate(location.id, index, { className: event.target.value })
                            }
                            placeholder="DTM class name"
                            value={day.className || ''}
                          />
                        </label>
                        <label>
                          Expected meal #
                          <input
                            min="1"
                            onChange={(event) =>
                              updateDate(location.id, index, { expectedMealCount: event.target.value })
                            }
                            type="number"
                            value={day.expectedMealCount || ''}
                          />
                        </label>
                        <label className="admin-filled-field">
                          Filled
                          <input
                            checked={day.filled === true}
                            onChange={(event) =>
                              updateDate(location.id, index, { filled: event.target.checked })
                            }
                            type="checkbox"
                          />
                        </label>
                        <button
                          className="text-action"
                          onClick={() => removeDate(location.id, index)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="primary-action admin-save" onClick={saveLocations} type="button">
              Save locations and dates
            </button>
          </section>
        )}

        {!isRecovery && activeAdminView === 'schedule' && (
          <section className="panel printable-schedule">
            <div className="section-heading admin-heading-row no-print">
              <div>
                <p className="eyebrow">Schedule</p>
                <h2>View or Print Schedule</h2>
              </div>
              <button className="secondary-action" onClick={() => window.print()} type="button">
                Print
              </button>
            </div>
            <div className="schedule-filters no-print">
              <label>
                Location
                <select
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, locationId: event.target.value }))
                  }
                  value={filters.locationId}
                >
                  <option value="all">All locations</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Month
                <input
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, month: event.target.value }))
                  }
                  type="month"
                  value={filters.month}
                />
              </label>
              <label>
                Class
                <select
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, className: event.target.value }))
                  }
                  value={filters.className}
                >
                  <option value="all">All classes</option>
                  {classFilterOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Location</th>
                  <th>Meal time</th>
                  <th>Class</th>
                  <th>Expected #</th>
                  <th>Meal preparer</th>
                  <th>Address</th>
                  {canManageSchedule && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.locationId}-${row.date}-${row.time}`}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.day}</td>
                    <td>{row.locationName}</td>
                    <td>{row.time}</td>
                    <td>{row.className}</td>
                    <td>{row.expectedMealCount || ''}</td>
                    <td>{row.preparer || 'Open'}</td>
                    <td>{row.address}</td>
                    {canManageSchedule && (
                      <td>
                        {row.signupId ? (
                          <button
                            className="text-action"
                            onClick={() => removeMealPreparer(row)}
                            type="button"
                          >
                            Remove preparer
                          </button>
                        ) : (
                          ''
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {canManageSchedule && activeAdminView === 'reminders' && (
          <form className="panel admin-editor" onSubmit={saveReminderTemplates}>
            <div className="section-heading">
              <p className="eyebrow">Reminders Setup</p>
              <h2>Email and Text Reminder Setup</h2>
              <p>
                Available placeholders include {'{name}'}, {'{location}'}, {'{date}'}, {'{time}'}, {'{servingSize}'}, and {'{meal}'}.
              </p>
            </div>
            <div className="reminder-template-grid">
              {Object.entries(reminderForms.emailTemplates || {}).map(([templateKey, template]) => (
                <section className="reminder-template-card" key={`email-${templateKey}`}>
                  <p className="eyebrow">Email</p>
                  <h3>{reminderLabel(templateKey)}</h3>
                  <label>
                    Subject
                    <input
                      onChange={(event) => updateEmailTemplate(templateKey, { subject: event.target.value })}
                      value={template.subject || ''}
                    />
                  </label>
                  <label>
                    Body
                    <textarea
                      onChange={(event) => updateEmailTemplate(templateKey, { body: event.target.value })}
                      rows="5"
                      value={template.body || ''}
                    />
                  </label>
                </section>
              ))}
              {Object.entries(reminderForms.smsTemplates || {}).map(([templateKey, template]) => (
                <section className="reminder-template-card" key={`sms-${templateKey}`}>
                  <p className="eyebrow">Text</p>
                  <h3>{reminderLabel(templateKey)}</h3>
                  <label>
                    Message
                    <textarea
                      onChange={(event) => updateSmsTemplate(templateKey, event.target.value)}
                      rows="5"
                      value={template || ''}
                    />
                  </label>
                </section>
              ))}
            </div>
            <button className="primary-action admin-save" type="submit">
              Save reminder setup
            </button>
          </form>
        )}

        {canViewAccounting && activeAdminView === 'accounting' && (
          <section className="panel printable-schedule">
            <div className="section-heading admin-heading-row no-print">
              <div>
                <p className="eyebrow">Accounting</p>
                <h2>{reimbursementFilter === 'completed' ? 'Completed Requests' : 'Reimbursement Requests'}</h2>
              </div>
              <div className="admin-heading-actions">
                <button
                  className="text-action"
                  onClick={() =>
                    setReimbursementFilter((current) =>
                      current === 'completed' ? 'pending' : 'completed',
                    )
                  }
                  type="button"
                >
                  {reimbursementFilter === 'completed' ? 'Pending Requests' : 'Completed Requests'}
                </button>
                <button className="secondary-action" onClick={() => window.print()} type="button">
                  Print
                </button>
              </div>
            </div>
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="no-print">Files</th>
                  {isFull && <th className="no-print">Action</th>}
                </tr>
              </thead>
              <tbody>
                {reimbursementRows.map((request) => (
                  <tr key={request.id}>
                    <td>{formatDateTimeText(request.createdAt)}</td>
                    <td>{request.fullName}</td>
                    <td>{request.className}</td>
                    <td>{request.classDate}</td>
                    <td>{formatCurrency(request.totalAmount)}</td>
                    <td>{request.status}</td>
                    <td className="no-print">
                      {(request.files || []).map((file) => (
                        <a href={file.url || '#'} key={file.path} rel="noreferrer" target="_blank">
                          {file.label}
                        </a>
                      ))}
                    </td>
                    {isFull && (
                      <td className="no-print">
                        <button
                          className="text-action"
                          onClick={() => deleteReimbursementRequest(request)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {(isFull || isRecovery) && activeAdminView === 'adminAccounts' && (
        <section className="panel admin-account-panel">
          <div className="section-heading">
            <p className="eyebrow">Admin account</p>
            <h2>Main Full-Admin Account</h2>
          </div>
          <form onSubmit={saveMainAccount}>
            <div className="field-grid">
              <label>
                Login name
                <input
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                  value={accountForm.username}
                />
              </label>
              <label>
                New password
                <input
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                  type="password"
                  value={accountForm.password}
                />
              </label>
            </div>
            <button className="primary-action" type="submit">
              Save main admin account
            </button>
          </form>

          {isFull && (
            <div className="regular-admins">
              <h2>Admin Accounts</h2>
              <form className="field-grid" onSubmit={addRegularAdmin}>
                <label>
                  Login
                  <input
                    onChange={(event) =>
                      setRegularForm((current) => ({ ...current, username: event.target.value }))
                    }
                    value={regularForm.username}
                  />
                </label>
                <label>
                  Temporary password
                  <input
                    onChange={(event) =>
                      setRegularForm((current) => ({ ...current, password: event.target.value }))
                    }
                    type="password"
                    value={regularForm.password}
                  />
                </label>
                <label>
                  Access level
                  <select
                    onChange={(event) =>
                      setRegularForm((current) => ({ ...current, accessLevel: event.target.value }))
                    }
                    value={regularForm.accessLevel}
                  >
                    <option value="schedule">Schedule</option>
                    <option value="accounting">Accounting</option>
                    <option value="full">Full admin</option>
                  </select>
                </label>
                <button className="secondary-action" type="submit">Add admin</button>
              </form>
              <div className="regular-admin-list">
                {(adminData.regularAdmins || []).map((regularAdmin) => (
                  <div className="regular-admin-row" key={regularAdmin.id}>
                    <span>
                      <strong>{regularAdmin.username}</strong><br />
                      {regularAdmin.accessLevel || 'schedule'}
                    </span>
                    <button
                      className="text-action"
                      onClick={() => deleteRegularAdmin(regularAdmin.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        )}

        {message && <p className="success-message admin-message">{message}</p>}
        {error && <p className="error-message admin-message">{error}</p>}

        {activeAdminView === 'adminAccounts' && (
        <section className="panel change-log">
          <div className="section-heading">
            <p className="eyebrow">Change log</p>
            <h2>Recent Admin Changes</h2>
          </div>
          {(adminData.adminLog || []).map((entry) => (
            <div className="log-row" key={entry.id}>
              <strong>{entry.action}</strong>
              <span>{entry.actor} - {formatDateTimeText(entry.createdAt)}</span>
              <p>{entry.details}</p>
            </div>
          ))}
        </section>
        )}
      </section>
    </main>
  )
}

function scheduleRows(locations, signups = []) {
  return locations
    .flatMap((location) =>
      (location.days || []).map((day) => {
        const signup = signups.find((item) =>
          item.locationId === location.id && (item.dates || []).includes(day.date),
        )
        return {
          ...day,
          locationId: location.id,
          locationName: location.name,
          address: location.address,
          signupId: signup?.id || '',
          preparerName: signup?.fullName || '',
          expectedMealCount: mealCountForDay(day, location),
          preparer: signup
            ? [signup.fullName, signup.meal].filter(Boolean).join(' - ')
            : day.filled ? 'Filled offline' : '',
        }
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.locationName.localeCompare(b.locationName))
}

function buildRecurringMealDates(form) {
  const count = Number.parseInt(form.count, 10)
  const dates = []
  const cursor = new Date(`${form.startDate}T12:00:00`)
  for (let index = 0; index < count; index += 1) {
    const date = cursor.toISOString().slice(0, 10)
    dates.push({
      date,
      time: form.time || '5:00 PM',
      day: weekdayForDate(date),
      className: form.className || '',
      expectedMealCount: form.expectedMealCount || '',
    })
    if (form.recurrence === 'monthly') {
      cursor.setMonth(cursor.getMonth() + 1)
    } else {
      cursor.setDate(cursor.getDate() + (form.recurrence === 'biweekly' ? 14 : 7))
    }
  }
  return dates
}

function reminderLabel(key) {
  return String(key || '')
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

function formatDateTimeText(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
function bookedKeysFromState(state) {
  const signups = Array.isArray(state?.signups) ? state.signups : []
  return signups.flatMap((signup) =>
    (signup.dates || []).map((date) => `${signup.locationId}:${date}`),
  )
}

function App() {
  const path = currentAppPath()
  if (path.startsWith('/reimbursement')) return <ReimbursementApp />
  if (path.startsWith('/admin')) return <AdminApp />
  return <MealSignupApp />
}

export default App


