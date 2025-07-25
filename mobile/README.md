# Cura Mobile Applications

This directory contains Flutter mobile applications for the Cura EMR system, providing native mobile access for both patients and healthcare providers.

## Applications

### 1. Cura Patient App (`cura_patient/`)
Mobile application for patients to access their healthcare information and services.

**Key Features:**
- **Medical History**: View complete medical records, lab results, and imaging reports
- **Prescriptions**: Access current medications, refill requests, and medication tracking
- **Appointments**: Book new appointments, view upcoming visits, and manage schedule
- **Notifications**: Receive medication reminders, appointment alerts, and health updates
- **Voice Documentation**: Record and playback voice notes related to health concerns

**Demo Credentials:**
- Email: `patient@gmail.com`
- Password: `patient123`

### 2. Cura Doctor App (`cura_doctor/`)
Professional mobile application for healthcare providers to manage patient care.

**Key Features:**
- **Dashboard**: Overview of daily appointments, patient statistics, and alerts
- **Appointments**: Manage appointment schedule, mark appointments as complete/cancelled
- **Patient Records**: Access comprehensive patient information, medical history, and prescriptions
- **Medication Alerts**: Handle refill requests, drug interactions, and adherence monitoring
- **Clinical Decision Support**: AI-powered insights and recommendations

**Demo Credentials:**
- Email: `doctor@gmail.com`
- Password: `doctor123`

## Architecture

Both applications follow Flutter best practices with clean architecture:

```
lib/
├── main.dart                 # Application entry point
├── screens/                  # UI screens and pages
├── services/                 # API and business logic services
├── utils/                    # Utilities and constants
└── widgets/                  # Reusable UI components
```

### Key Services

- **AuthService**: Handles authentication, token management, and API headers
- **API Integration**: RESTful communication with Cura backend using JWT authentication
- **Local Storage**: Secure storage for authentication tokens and user preferences

### Design System

Both apps use the consistent Cura design system:
- **Primary**: Cura BlueWave (#2563EB)
- **Secondary**: Electric Lilac (#8B5CF6)
- **Accent**: Success Green (#10B981)
- **Typography**: Inter font family with proper weight hierarchy
- **Components**: Material Design 3 with custom Cura theming

## Backend Integration

### API Endpoints
The mobile apps integrate with the following Cura API endpoints:

**Authentication:**
- `POST /api/auth/login` - User authentication
- `GET /api/auth/user` - Get current user data

**Patient App Endpoints:**
- `GET /api/patients/{id}/medical-records` - Medical history
- `GET /api/patients/{id}/prescriptions` - Prescriptions
- `GET /api/appointments` - Patient appointments
- `POST /api/appointments` - Book new appointments
- `GET /api/notifications` - Patient notifications

**Doctor App Endpoints:**
- `GET /api/appointments/doctor` - Doctor's appointments
- `GET /api/patients` - Patient list
- `GET /api/medication-alerts` - Medication alerts
- `GET /api/dashboard/doctor-stats` - Dashboard statistics

### Authentication
- JWT-based authentication with 7-day token expiration
- Secure token storage using `flutter_secure_storage`
- Automatic token refresh and error handling
- Multi-tenant support with `X-Tenant-Subdomain` header

## Development Setup

### Prerequisites
- Flutter SDK 3.10.0 or later
- Dart SDK 3.0.0 or later
- Android Studio / VS Code with Flutter extensions
- iOS development requires Xcode (macOS only)

### Installation

1. **Clone the repository** (if not already done)
2. **Navigate to the desired app directory:**
   ```bash
   cd mobile/cura_patient  # For patient app
   # OR
   cd mobile/cura_doctor   # For doctor app
   ```

3. **Install dependencies:**
   ```bash
   flutter pub get
   ```

4. **Update API URL** in `lib/services/auth_service.dart`:
   ```dart
   static const String _baseUrl = 'https://halo.averox.com/api';
   ```

5. **Run the application:**
   ```bash
   flutter run
   ```

### Build for Production

**Android APK:**
```bash
flutter build apk --release
```

**iOS (requires macOS and Xcode):**
```bash
flutter build ios --release
```

## Key Dependencies

### Core Dependencies
- `flutter`: Flutter SDK
- `http`: HTTP client for API requests
- `shared_preferences`: Local data persistence
- `flutter_secure_storage`: Secure token storage
- `intl`: Internationalization and date formatting

### UI Dependencies
- `table_calendar`: Calendar widget for appointments
- `flutter_local_notifications`: Push notifications support

### Development Dependencies
- `flutter_test`: Testing framework
- `flutter_lints`: Dart linting rules

## Features in Detail

### Patient App Features

**Medical History Screen:**
- Chronological list of medical records
- Filter by record type (consultation, lab, imaging)
- Detailed record view with notes and attachments
- Export functionality for sharing with providers

**Prescriptions Management:**
- Current active medications
- Prescription history and refill tracking
- Medication reminders and adherence monitoring
- Direct refill requests to pharmacy

**Appointment Booking:**
- Calendar view with available time slots
- Provider selection and specialty filtering
- Virtual appointment options
- Appointment reminders and notifications

**Voice Documentation:**
- Record voice notes about symptoms or concerns
- Playback and manage voice recordings
- Integration with medical records
- Speech-to-text transcription

### Doctor App Features

**Patient Management:**
- Comprehensive patient search and filtering
- Patient detail views with complete medical history
- Quick access to recent patients and frequent contacts
- Risk stratification and priority indicators

**Appointment Management:**
- Calendar view with daily, weekly, and monthly views
- Appointment status management (complete, cancel, reschedule)
- Patient preparation notes and visit summaries
- Virtual consultation support

**Medication Alerts:**
- Real-time alerts for refill requests
- Drug interaction warnings
- Dosage change notifications
- Patient adherence monitoring

**Clinical Dashboard:**
- Daily appointment summary
- Patient statistics and metrics
- Urgent alerts and notifications
- Quick action buttons for common tasks

## Security Features

### Data Protection
- End-to-end encryption for sensitive data
- Secure token storage with biometric protection
- HIPAA-compliant data handling
- Automatic session timeout

### Authentication Security
- Multi-factor authentication support
- Biometric login (fingerprint, face recognition)
- Secure password requirements
- Account lockout protection

### Network Security
- TLS/SSL encryption for all API communications
- Certificate pinning for enhanced security
- Request signing and validation
- Rate limiting and abuse protection

## Testing

### Unit Testing
```bash
flutter test
```

### Integration Testing
```bash
flutter test integration_test/
```

### Test Coverage
Run tests with coverage reporting:
```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

## Deployment

### App Store Distribution

**iOS App Store:**
1. Configure app signing in Xcode
2. Build release version: `flutter build ios --release`
3. Archive and upload via Xcode or Application Loader
4. Submit for App Store review

**Google Play Store:**
1. Build release APK: `flutter build apk --release`
2. Sign APK with release keystore
3. Upload to Google Play Console
4. Complete store listing and submit for review

### Enterprise Distribution
- Internal distribution via MDM systems
- Custom app distribution for healthcare organizations
- White-label branding options available

## Troubleshooting

### Common Issues

**Build Errors:**
- Ensure Flutter SDK is up to date
- Run `flutter clean` and `flutter pub get`
- Check for dependency conflicts

**API Connection Issues:**
- Verify backend URL in AuthService
- Check network connectivity
- Validate API credentials

**Authentication Problems:**
- Clear stored tokens: `flutter clean`
- Verify login credentials
- Check JWT token expiration

### Support
For technical support or feature requests, contact the Cura development team or refer to the main project documentation.

## License
Copyright © 2025 Halo Group. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.