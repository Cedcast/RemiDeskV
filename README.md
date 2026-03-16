# B2B Appointment SaaS

A phone-based B2B appointment management platform designed for micro businesses in the UK, Canada, and Australia. Business owners take appointments by phone and manage them through this admin dashboard, while customers receive automated reminders by SMS, Email, and WhatsApp.

## Features

### For Business Owners
- **Business Management**: Create and manage business profiles with contact information
- **Service Management**: Define services with customizable duration and pricing
- **Availability Management**: Set weekly schedules and business hours
- **Appointment Management**: Manually enter and manage phone appointments; confirm, complete, or cancel
- **Dashboard Analytics**: Track appointments, revenue, and customer statistics
- **Automated Reminders**: Send SMS, Email, and WhatsApp reminders to clients automatically

### Integrations (Ready for Configuration)
- **Twilio**: SMS and WhatsApp notifications
- **SendGrid**: Email notifications
- **Stripe**: Payment processing

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLAlchemy ORM with SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Documentation**: OpenAPI/Swagger (auto-generated)

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## Project Structure

```
B2B-appointment-SaaS/
├── backend/
│   ├── src/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # Authentication utilities
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── businesses.py
│   │   │   ├── services.py
│   │   │   ├── availability.py
│   │   │   └── appointments.py
│   │   └── integrations/        # Third-party integrations
│   │       ├── twilio_service.py
│   │       ├── sendgrid_service.py
│   │       └── stripe_service.py
│   ├── tests/                   # Backend tests
│   ├── alembic/                 # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── common/          # Reusable UI components
│   │   │   ├── layout/          # Layout components
│   │   │   └── auth/            # Auth-related components
│   │   ├── pages/               # Page components
│   │   │   ├── auth/            # Login, Register
│   │   │   └── business/        # Business dashboard pages
│   │   ├── contexts/            # React contexts
│   │   └── services/            # API service layer
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (create `.env` file):
   ```env
   APP_ENV=development
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=sqlite:///./app.db
   
   # Optional integrations
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   
   SENDGRID_API_KEY=your-sendgrid-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   
   STRIPE_SECRET_KEY=your-stripe-secret
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the backend server:
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```

7. Access API documentation at: http://localhost:8000/docs

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the application at: http://localhost:3000

### Running Tests

#### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

#### Frontend Linting
```bash
cd frontend
npm run lint
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/token` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Businesses
- `POST /api/businesses` - Create new business
- `PUT /api/businesses/{id}` - Update business
- `GET /api/businesses/my` - Get user's businesses

### Services
- `GET /api/services/business/{business_id}` - Get services for a business
- `GET /api/services/{id}` - Get service details
- `POST /api/services` - Create new service
- `PUT /api/services/{id}` - Update service
- `DELETE /api/services/{id}` - Delete service

### Availability
- `GET /api/availability/schedules/{business_id}` - Get business schedules
- `POST /api/availability/schedules` - Create schedule
- `GET /api/availability/slots/{business_id}` - Get available time slots

### Appointments
- `GET /api/appointments` - List appointments
- `GET /api/appointments/{id}` - Get appointment details
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/{id}/status` - Update appointment status
- `DELETE /api/appointments/{id}` - Cancel appointment
- `GET /api/appointments/upcoming` - Get upcoming appointments
- `GET /api/appointments/dashboard/stats` - Get dashboard statistics

## Deployment

### Deploy to Render (Recommended)

This project includes a `render.yaml` Blueprint for easy deployment to [Render](https://render.com).

#### One-Click Deployment

1. Fork this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub account and select the forked repository
5. Render will automatically detect `render.yaml` and create:
   - **appointment-api**: Backend API service
   - **appointment-frontend**: Frontend static site
   - **appointment-db**: PostgreSQL database

#### Manual Deployment

If you prefer to deploy services manually:

**Backend API:**
1. Create a new "Web Service" on Render
2. Connect your repository
3. Set:
   - **Build Command**: `cd backend && pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `cd backend && gunicorn src.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Environment Variables**:
     - `APP_ENV=production`
     - `SECRET_KEY` (generate a secure key)
     - `DATABASE_URL` (from your PostgreSQL database)
     - `FRONTEND_URL` (your frontend URL for CORS)

**Frontend:**
1. Create a new "Static Site" on Render
2. Connect your repository
3. Set:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL` (your backend API URL, e.g., `https://appointment-api.onrender.com/api`)
   - Add a rewrite rule: `/* → /index.html` (for SPA routing)

**Database:**
1. Create a new PostgreSQL database on Render
2. Copy the Internal Database URL
3. Add it as `DATABASE_URL` to your backend service

#### Post-Deployment Configuration

After deployment, configure optional integrations in Render dashboard:

1. **Twilio** (SMS notifications):
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

2. **SendGrid** (Email notifications):
   - `SENDGRID_API_KEY`
   - `FROM_EMAIL`

3. **Stripe** (Payments):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

## Development

### Database Migrations

Create a new migration after model changes:
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Code Style

- Backend: Follow PEP 8 guidelines
- Frontend: ESLint with React recommended rules

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
