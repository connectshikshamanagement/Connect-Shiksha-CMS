import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class DashboardProvider with ChangeNotifier {
  bool _isLoading = false;
  Map<String, dynamic>? _dashboardData;
  String? _error;

  bool get isLoading => _isLoading;
  Map<String, dynamic>? get dashboardData => _dashboardData;
  String? get error => _error;

  Future<void> fetchDashboardData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _dashboardData = await ApiService.getDashboardAnalytics();
    } catch (e) {
      _error = e.toString();
      debugPrint('Error fetching dashboard data: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

