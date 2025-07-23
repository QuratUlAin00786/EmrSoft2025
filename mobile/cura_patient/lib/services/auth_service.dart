import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _isLoggedInKey = 'is_logged_in';
  
  // Get stored token
  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }
  
  // Store token securely
  static Future<void> storeToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isLoggedInKey, true);
  }
  
  // Get stored user data
  static Future<Map<String, dynamic>?> getUserData() async {
    final userData = await _secureStorage.read(key: _userKey);
    if (userData != null) {
      return jsonDecode(userData);
    }
    return null;
  }
  
  // Store user data
  static Future<void> storeUserData(Map<String, dynamic> userData) async {
    await _secureStorage.write(key: _userKey, value: jsonEncode(userData));
  }
  
  // Check if user is logged in
  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_isLoggedInKey) ?? false;
  }
  
  // Login
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await ApiService.login(email, password);
      
      if (response['token'] != null && response['user'] != null) {
        await storeToken(response['token']);
        await storeUserData(response['user']);
        
        return {
          'success': true,
          'user': response['user'],
          'message': 'Login successful'
        };
      } else {
        throw Exception('Invalid response from server');
      }
    } catch (e) {
      return {
        'success': false,
        'message': e.toString().replaceAll('Exception: ', ''),
      };
    }
  }
  
  // Validate token
  static Future<bool> validateToken() async {
    try {
      final response = await ApiService.validateToken();
      if (response['user'] != null) {
        await storeUserData(response['user']);
        return true;
      }
      return false;
    } catch (e) {
      await logout();
      return false;
    }
  }
  
  // Get current user from API
  static Future<Map<String, dynamic>?> getUser() async {
    try {
      final response = await ApiService.validateToken();
      if (response['user'] != null) {
        await storeUserData(response['user']);
        return response['user'];
      }
      return null;
    } catch (e) {
      await logout();
      return null;
    }
  }
  
  // Logout
  static Future<void> logout() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isLoggedInKey, false);
  }
  
  // Clear all stored data
  static Future<void> clearAllData() async {
    await _secureStorage.deleteAll();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
  
  // Get current user role
  static Future<String?> getUserRole() async {
    final userData = await getUserData();
    return userData?['role'];
  }
  
  // Check if user has specific role
  static Future<bool> hasRole(String role) async {
    final userRole = await getUserRole();
    return userRole == role;
  }
  
  // Get user ID
  static Future<int?> getUserId() async {
    final userData = await getUserData();
    return userData?['id'];
  }
  
  // Get user name
  static Future<String?> getUserName() async {
    final userData = await getUserData();
    if (userData?['firstName'] != null && userData?['lastName'] != null) {
      return '${userData!['firstName']} ${userData!['lastName']}';
    }
    return userData?['email'];
  }
  
  // Get patient ID
  static Future<String?> getPatientId() async {
    final userData = await getUserData();
    return userData?['patientId'];
  }
  
  // Refresh user data
  static Future<void> refreshUserData() async {
    try {
      final isValid = await validateToken();
      if (!isValid) {
        await logout();
      }
    } catch (e) {
      await logout();
    }
  }
}