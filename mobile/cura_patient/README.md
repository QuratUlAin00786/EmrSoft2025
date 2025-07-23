# Cura Patient Mobile App

A comprehensive Flutter mobile application for patients to access their medical records, book appointments, and communicate with healthcare providers.

## Features

- **Secure Authentication**: JWT-based login system
- **Dashboard**: Overview of appointments, prescriptions, and medical records
- **Appointments**: Book, view, and manage appointments with doctors
- **Medical Records**: Access complete medical history
- **Prescriptions**: Track medications and refill alerts
- **Doctor Directory**: Browse and view doctor profiles
- **Profile Management**: Update patient information
- **Notifications**: Real-time alerts and reminders

## Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK (2.17.0 or higher)
- Android Studio / VS Code
- iOS development tools (for iOS deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cura_patient
```

2. Install dependencies:
```bash
flutter pub get
```

3. Configure API endpoint:
Update `lib/services/api_service.dart` with your backend URL:
```dart
static const String baseUrl = 'YOUR_BACKEND_URL_HERE';
```

4. Run the app:
```bash
flutter run
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── config/
│   └── api_config.dart      # API configuration
├── providers/
│   └── auth_provider.dart   # Authentication state management
├── services/
│   ├── api_service.dart     # API service layer
│   └── auth_service.dart    # Authentication service
├── screens/
│   ├── auth/               # Authentication screens
│   ├── dashboard/          # Dashboard screens
│   ├── appointments/       # Appointment management
│   ├── medical_records/    # Medical records
│   ├── prescriptions/      # Prescription management
│   └── profile/           # Profile management
├── widgets/
│   ├── common/            # Reusable widgets
│   └── cards/             # Card components
└── theme/
    └── app_theme.dart     # App theming
```

## API Integration

The app integrates with the Cura EMR backend API. Required endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Token validation

### Patient Mobile APIs
- `GET /api/mobile/patient/dashboard` - Dashboard data
- `GET /api/mobile/patient/appointments` - Patient appointments
- `POST /api/mobile/patient/appointments` - Book appointment
- `DELETE /api/mobile/patient/appointments/:id` - Cancel appointment
- `GET /api/mobile/patient/medical-records` - Medical records
- `GET /api/mobile/patient/prescriptions` - Prescriptions
- `GET /api/mobile/patient/doctors` - Available doctors
- `GET /api/mobile/patient/doctors/:id` - Doctor details

## Demo Credentials

- **Email**: patient@gmail.com
- **Password**: patient123

## Building for Production

### Android
```bash
flutter build apk --release
```

### iOS
```bash
flutter build ios --release
```

## Dependencies

- `provider`: State management
- `http`: HTTP requests
- `flutter_secure_storage`: Secure token storage
- `shared_preferences`: User preferences
- `cached_network_image`: Image loading
- `intl`: Internationalization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Cura EMR system by Halo Group.

## Support

For technical support or questions, please contact the development team.