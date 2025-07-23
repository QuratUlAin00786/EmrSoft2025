import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = true;
  Map<String, dynamic>? _user;
  String? _errorMessage;
  
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get user => _user;
  String? get errorMessage => _errorMessage;
  
  AuthProvider() {
    _initializeAuth();
  }
  
  Future<void> _initializeAuth() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final isLoggedIn = await AuthService.isLoggedIn();
      if (isLoggedIn) {
        final isValid = await AuthService.validateToken();
        if (isValid) {
          _user = await AuthService.getUserData();
          _isAuthenticated = true;
        } else {
          await AuthService.logout();
          _isAuthenticated = false;
        }
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
      _errorMessage = 'Failed to validate authentication';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> login(String email, String password) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      final result = await AuthService.login(email, password);
      
      if (result['success'] == true) {
        _user = result['user'];
        _isAuthenticated = true;
        _errorMessage = null;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Login failed';
        _isAuthenticated = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Login failed: ${e.toString()}';
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> logout() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      await AuthService.logout();
      
      _isAuthenticated = false;
      _user = null;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Logout failed';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // Sign out alias for logout
  Future<void> signOut() async {
    await logout();
  }
  
  Future<void> refreshUser() async {
    try {
      await AuthService.refreshUserData();
      _user = await AuthService.getUserData();
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to refresh user data';
      await logout();
    }
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  String get userName {
    if (_user != null) {
      final firstName = _user!['firstName'];
      final lastName = _user!['lastName'];
      if (firstName != null && lastName != null) {
        return '$firstName $lastName';
      }
    }
    return _user?['email'] ?? 'Patient';
  }
  
  String get userRole => _user?['role'] ?? 'patient';
  
  int? get userId => _user?['id'];
  
  String? get userEmail => _user?['email'];
  
  String? get patientId => _user?['patientId'];
}