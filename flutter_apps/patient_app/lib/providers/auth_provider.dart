import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await ApiService.getAuthToken();
      if (token != null) {
        await _validateToken();
      }
    } catch (e) {
      await logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _validateToken() async {
    try {
      final response = await ApiService.validateToken();
      _user = User.fromJson(response['user']);
      _isAuthenticated = true;
    } catch (e) {
      await logout();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);
      
      // Store the auth token
      await ApiService.setAuthToken(response['token']);
      
      // Get user data from response
      _user = User.fromJson(response['user']);
      _isAuthenticated = true;

      // Store user preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_email', email);
      
      return true;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await ApiService.logout();
    } catch (e) {
      // Ignore logout errors
    }

    _user = null;
    _isAuthenticated = false;
    
    // Clear stored preferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_email');

    _isLoading = false;
    notifyListeners();
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.updateUserProfile(data);
      _user = User.fromJson(response);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  bool get isPatient => _user?.role == 'patient';
  bool get isDoctor => _user?.role == 'doctor';
  bool get isNurse => _user?.role == 'nurse';
  bool get isAdmin => _user?.role == 'admin';
}