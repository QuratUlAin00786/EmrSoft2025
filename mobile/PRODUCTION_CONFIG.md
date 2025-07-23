# Cura Mobile Apps - Production Configuration

## Current Issues
1. **Hardcoded Development URLs**: Mobile apps use development server URLs instead of production
2. **Missing Tenant Headers**: Apps need proper tenant configuration for production
3. **Authentication Format**: Server expects specific request body format

## Production Configuration Steps

### 1. Update API Base URLs
Replace development URLs with production URLs in both apps:

**Patient App** (`mobile/cura_patient/lib/services/api_service.dart`):
```dart
static const String baseUrl = 'https://your-production-domain.replit.app';
```

**Doctor App** (`mobile/cura_doctor/lib/services/api_service.dart`):
```dart
static const String baseUrl = 'https://your-production-domain.replit.app/api';
```

### 2. Add Tenant Headers
Both apps need tenant headers for multi-tenant support:
```dart
static Future<Map<String, String>> _getHeaders() async {
  final token = await AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer $token',
    'X-Tenant-Subdomain': 'demo', // Add this line
  };
}
```

### 3. Fix Login Request Format
Ensure login requests send proper JSON body:
```dart
static Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('$apiUrl/auth/login'),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant-Subdomain': 'demo',
    },
    body: jsonEncode({
      'email': email,
      'password': password,
    }),
  );
  
  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    throw Exception('Login failed: ${response.body}');
  }
}
```

## Demo Credentials for Production
- **Patient**: patient@cura.com / patient123
- **Doctor**: doctor@cura.com / doctor123
- **Admin**: admin@cura.com / admin123

## Production Deployment URLs
- **Web App**: https://your-replit-app.replit.app
- **API Base**: https://your-replit-app.replit.app/api

## Testing Production
1. Update baseUrl in both mobile apps
2. Rebuild mobile apps with production configuration
3. Test login with demo credentials
4. Verify API calls work with production server