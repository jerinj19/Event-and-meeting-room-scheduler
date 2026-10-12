import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/config/api_config.dart';
import '../../core/theme/app_theme.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  late final TextEditingController _controller;
  bool _isTesting = false;
  String? _testMessage;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ApiConfig.baseUrl);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testMessage = null;
    });

    final url = _controller.text.trim();
    try {
      final uri = Uri.parse(url.endsWith('/') ? '${url}rooms/' : '$url/rooms/');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));

      setState(() {
        _isTesting = false;
        // Even 401 Unauthorized means the Django server is alive and reachable!
        if (res.statusCode == 200 || res.statusCode == 401) {
          _testSuccess = true;
          _testMessage = 'Successfully connected to backend server!';
        } else {
          _testSuccess = false;
          _testMessage = 'Server responded with status code: ${res.statusCode}';
        }
      });
    } catch (e) {
      setState(() {
        _isTesting = false;
        _testSuccess = false;
        _testMessage = 'Could not reach server. Check IP and port.';
      });
    }
  }

  Future<void> _saveAndClose() async {
    final url = _controller.text.trim();
    if (url.isNotEmpty) {
      await ApiConfig.setBaseUrl(url);
    }
    if (mounted) {
      Navigator.of(context).pop(true);
    }
  }

  Future<void> _resetDefault() async {
    await ApiConfig.resetToDefault();
    _controller.text = ApiConfig.baseUrl;
    setState(() {
      _testMessage = 'Reset to default configuration.';
      _testSuccess = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Row(
        children: [
          Icon(Icons.dns_rounded, color: AppTheme.primary),
          SizedBox(width: 10),
          Text('Server Configuration', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Specify the backend Django REST API URL. Default for Android Emulator is 10.0.2.2:8000; for desktop/web is localhost:8000.',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                labelText: 'API Base URL',
                hintText: 'http://10.0.2.2:8000/api',
                prefixIcon: const Icon(Icons.link_rounded),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: 'Reset default',
                  onPressed: _resetDefault,
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_testMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _testSuccess ? AppTheme.successLight : AppTheme.errorLight,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _testSuccess ? AppTheme.success : AppTheme.error,
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _testSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                      color: _testSuccess ? AppTheme.success : AppTheme.error,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _testMessage!,
                        style: TextStyle(
                          fontSize: 12,
                          color: _testSuccess ? AppTheme.success : AppTheme.error,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isTesting ? null : _testConnection,
          child: _isTesting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Test Connection'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _saveAndClose,
          child: const Text('Save'),
        ),
      ],
    );
  }
}
