import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _token;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get token => _token;

  Future<bool> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    
    if (_token != null) {
      final userData = prefs.getString('user');
      if (userData != null) {
        _user = {}; // Parse JSON here
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
    }
    
    _isAuthenticated = false;
    notifyListeners();
    return false;
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await ApiService.login(email, password);
      
      if (response['success'] == true) {
        _token = response['data']['token'];
        _user = response['data']['user'];
        _isAuthenticated = true;

        // Save to SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('user', _user.toString());

        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _isAuthenticated = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');

    notifyListeners();
  }
}

