import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/stats_model.dart';

class AdminReportsScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const AdminReportsScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  final ApiClient _client = ApiClient();
  StatsModel? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await _client.get('/bookings/stats/');
      if (res is Map<String, dynamic>) {
        setState(() {
          _stats = StatsModel.fromJson(res);
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _fetchStats,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 10,
                    runSpacing: 6,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.analytics_outlined, color: AppTheme.primary, size: 24),
                      ),
                      const Text(
                        'System Reports',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Audit corporate workspace capacity, peak utilization, and telemetry insights.',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppTheme.error, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),

              // KPI Cards
              if (_loading)
                const Center(
                  child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()),
                )
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isCompact = constraints.maxWidth < 600;

                    final cardTotal = _buildReportCard(
                      'Total Bookings',
                      '${_stats?.totalBookings ?? 0}',
                      Icons.book_online_rounded,
                      AppTheme.primary,
                    );
                    final cardConfirmed = _buildReportCard(
                      'Confirmed Rate',
                      '${_stats?.totalBookings != null && _stats!.totalBookings > 0 ? ((_stats!.confirmedBookings / _stats!.totalBookings) * 100).toStringAsFixed(1) : 0}%',
                      Icons.verified_rounded,
                      const Color(0xFF059669),
                    );
                    final cardCancelled = _buildReportCard(
                      'Cancelled Rate',
                      '${_stats?.totalBookings != null && _stats!.totalBookings > 0 ? ((_stats!.cancelledBookings / _stats!.totalBookings) * 100).toStringAsFixed(1) : 0}%',
                      Icons.cancel_outlined,
                      AppTheme.error,
                    );
                    final cardPeak = _buildReportCard(
                      'Peak Hour',
                      _stats?.peakTime ?? '10:00 - 11:00 AM',
                      Icons.schedule_rounded,
                      const Color(0xFFD97706),
                    );
                    final cardHours = _buildReportCard(
                      'Scheduled Hours',
                      '${_stats?.confirmedHours ?? 0} hrs',
                      Icons.hourglass_bottom_rounded,
                      const Color(0xFF4F46E5),
                    );
                    final cardRooms = _buildReportCard(
                      'Active Rooms',
                      '${_stats?.activeRooms ?? 0}',
                      Icons.meeting_room_rounded,
                      const Color(0xFF0284C7),
                    );

                    if (isCompact) {
                      return Column(
                        children: [
                          Row(
                            children: [
                              cardTotal,
                              const SizedBox(width: 10),
                              cardConfirmed,
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              cardCancelled,
                              const SizedBox(width: 10),
                              cardRooms,
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              cardPeak,
                              const SizedBox(width: 10),
                              cardHours,
                            ],
                          ),
                        ],
                      );
                    }

                    return Column(
                      children: [
                        Row(
                          children: [
                            cardTotal,
                            const SizedBox(width: 12),
                            cardConfirmed,
                            const SizedBox(width: 12),
                            cardCancelled,
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            cardPeak,
                            const SizedBox(width: 12),
                            cardHours,
                            const SizedBox(width: 12),
                            cardRooms,
                          ],
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 20),

                // Audit Log & Compliance Notice
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.security_rounded, color: AppTheme.primary, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Corporate Compliance & IoT Diagnostics',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'All room reservations and time slot configurations are monitored via tamper-proof audit trails. RFID door badges and room displays synchronize every 60 seconds with backend schedules.',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Exporting Corporate Audit CSV report...'),
                              backgroundColor: AppTheme.primary,
                            ),
                          );
                        },
                        icon: const Icon(Icons.download_rounded, size: 16),
                        label: const Text('Export Audit Log CSV'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E293B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
          ),
        ),
      ),
    );
  }

  Widget _buildReportCard(String title, String val, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(icon, size: 18, color: color),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              val,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
