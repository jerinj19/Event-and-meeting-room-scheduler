class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  final Map<String, dynamic>? details;
  final List<dynamic>? conflicts;

  ApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.details,
    this.conflicts,
  });

  bool get isConflict => statusCode == 409 || code == 'BOOKING_CONFLICT';
  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;

  @override
  String toString() => message;

  factory ApiException.fromResponse(int statusCode, dynamic responseData) {
    String message = 'An unexpected error occurred.';
    String? code;
    Map<String, dynamic>? details;
    List<dynamic>? conflicts;

    if (responseData is Map<String, dynamic>) {
      // Check unified error envelope: { "error": { "code": "...", "message": "...", "details": {...} } }
      if (responseData['error'] is Map<String, dynamic>) {
        final err = responseData['error'] as Map<String, dynamic>;
        code = err['code']?.toString();
        message = err['message']?.toString() ?? message;
        if (err['details'] is Map<String, dynamic>) {
          details = err['details'] as Map<String, dynamic>;
          if (details['conflicts'] is List) {
            conflicts = details['conflicts'] as List<dynamic>;
          }
        }
      } else if (responseData['error'] is String) {
        message = responseData['error'];
      } else if (responseData['detail'] is String) {
        message = responseData['detail'];
      } else if (responseData['message'] is String) {
        message = responseData['message'];
      } else {
        // Collect field validation errors: e.g. { "email": ["..."], "password": ["..."] }
        final buffer = <String>[];
        responseData.forEach((key, val) {
          if (val is List) {
            buffer.add('$key: ${val.join(", ")}');
          } else if (val is String) {
            buffer.add('$key: $val');
          }
        });
        if (buffer.isNotEmpty) {
          message = buffer.join('\n');
        }
      }

      if (conflicts == null && responseData['conflicts'] is List) {
        conflicts = responseData['conflicts'] as List<dynamic>;
      }
    } else if (responseData is String && responseData.isNotEmpty) {
      message = responseData;
    }

    return ApiException(
      statusCode: statusCode,
      message: message,
      code: code,
      details: details,
      conflicts: conflicts,
    );
  }
}
