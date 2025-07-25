# Cura Mobile Apps - Deployment Checklist

## 🎯 Quick Fix for Current 500 Error

### Immediate Actions Required:

1. **Update API Base URLs** in both mobile apps:
   ```dart
   // Replace development URL with your Averox production URL
   static const String baseUrl = 'https://halo.averox.com';
   ```

2. **Add Tenant Headers** to all API requests:
   ```dart
   'X-Tenant-Subdomain': 'demo'
   ```

3. **Fix Login Request Format** - ensure JSON body is properly sent:
   ```dart
   body: jsonEncode({
     'email': email,     // Must be non-empty string
     'password': password // Must be non-empty string  
   })
   ```

## 📋 Pre-Deployment Checklist

### ✅ Server Configuration
- [ ] Averox app deployed to production environment
- [ ] Environment variables configured (DATABASE_URL, JWT_SECRET, etc.)
- [ ] API endpoints responding (test with `/api/status`)
- [ ] CORS headers configured for mobile apps
- [ ] Tenant middleware properly configured

### ✅ Mobile App Configuration  
- [ ] Production URLs updated in API services
- [ ] Tenant headers added to all requests
- [ ] Authentication properly implemented
- [ ] Error handling for network failures
- [ ] Debug logging disabled for production builds

### ✅ Authentication Setup
- [ ] Demo user accounts created in database
- [ ] Login endpoints working with proper validation
- [ ] JWT token generation and validation functional
- [ ] Session management working correctly

## 🔧 Configuration Files to Update

### Patient App
1. `lib/services/api_service.dart` - Update baseUrl and add tenant headers
2. `lib/services/auth_service.dart` - Ensure proper login format
3. `lib/providers/auth_provider.dart` - Add error handling

### Doctor App  
1. `lib/services/api_service.dart` - Update baseUrl and add tenant headers
2. Add proper login method with JSON encoding
3. Ensure all API calls include tenant headers

## 🚀 Build Commands

### Patient App Production Build
```bash
cd mobile/cura_patient
flutter clean
flutter pub get
flutter build apk --release
```

### Doctor App Production Build
```bash
cd mobile/cura_doctor  
flutter clean
flutter pub get
flutter build apk --release
```

## 🧪 Testing Procedure

### 1. Server Testing
```bash
# Test API status
curl https://halo.averox.com/api/status

# Test login endpoint
curl -X POST https://halo.averox.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{"email":"patient@cura.com","password":"patient123"}'
```

### 2. Mobile App Testing
- [ ] Install APK on test device
- [ ] Test login with demo credentials
- [ ] Verify API calls work without 500 errors
- [ ] Test all major app features
- [ ] Check error handling for network issues

## 📱 Demo Credentials for Testing

**Patient App:**
- Email: `patient@cura.com`
- Password: `patient123`

**Doctor App:**
- Email: `doctor@cura.com`  
- Password: `doctor123`

## 🐛 Common Issues & Solutions

### Issue: 500 Internal Server Error
**Cause:** Missing request body or tenant headers
**Solution:** Add proper JSON encoding and X-Tenant-Subdomain header

### Issue: Authentication Failed
**Cause:** Invalid credentials or token issues
**Solution:** Verify demo credentials exist in database

### Issue: Network Connection Failed
**Cause:** Wrong production URL or CORS issues
**Solution:** Update baseUrl and configure CORS on server

## 📊 Post-Deployment Verification

### Success Criteria:
- [ ] Mobile apps login successfully
- [ ] API calls return data (not 500 errors)
- [ ] Patient data loads correctly
- [ ] Doctor dashboard shows statistics
- [ ] All core features functional

### Performance Metrics:
- [ ] Login response time < 3 seconds
- [ ] API calls complete within 5 seconds
- [ ] App startup time < 5 seconds
- [ ] No memory leaks or crashes

## 🔄 Rollback Plan

If production deployment fails:
1. Revert to previous working version
2. Update mobile apps to point to development server
3. Debug issues in development environment
4. Re-deploy when fixes are tested

## 👥 Team Coordination

### Deployment Roles:
- **Backend Dev:** Deploy server to Averox production
- **Mobile Dev:** Update mobile app configurations and build APKs  
- **QA:** Test production deployment with demo credentials
- **DevOps:** Monitor server logs and performance

This checklist ensures smooth production deployment of Cura mobile applications.