import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';

class AdminUserDirectoryScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const AdminUserDirectoryScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminUserDirectoryScreen> createState() => _AdminUserDirectoryScreenState();
}

class _AdminUserDirectoryScreenState extends State<AdminUserDirectoryScreen> {
  final ApiClient _client = ApiClient();
  final TextEditingController _searchController = TextEditingController();

  List<UserModel> _users = [];
  bool _loading = true;
  String? _error;
  String _roleFilter = 'all'; // all | admin | user
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _client.get('/users/');
      List<dynamic> list = [];
      if (response is List) {
        list = response;
      } else if (response is Map<String, dynamic> && response['results'] is List) {
        list = response['results'] as List<dynamic>;
      }

      setState(() {
        _users = list.map((item) => UserModel.fromJson(item as Map<String, dynamic>)).toList();
      });
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

  Future<void> _toggleUserRole(UserModel user) async {
    final newStaff = !user.isStaff;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(newStaff ? 'Promote to Admin?' : 'Demote to Member?'),
        content: Text(
          newStaff
              ? 'Are you sure you want to grant Administrator privileges to ${user.fullName} (${user.email})?'
              : 'Are you sure you want to revoke Administrator privileges from ${user.fullName} (${user.email})?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await _client.patch('/users/${user.id}/', body: {'is_staff': newStaff});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${user.fullName} role updated successfully.'),
          backgroundColor: AppTheme.success,
        ),
      );
      _fetchUsers();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update role: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  Future<void> _toggleUserActive(UserModel user) async {
    final newActive = !user.isActive;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(newActive ? 'Activate Account?' : 'Suspend Account?'),
        content: Text(
          newActive
              ? 'Enable workspace login access for ${user.fullName} (${user.email})?'
              : 'Suspend workspace login access for ${user.fullName} (${user.email})?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: newActive ? AppTheme.primary : AppTheme.error),
            child: Text(newActive ? 'Activate' : 'Suspend'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await _client.patch('/users/${user.id}/', body: {'is_active': newActive});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${user.fullName} status updated successfully.'),
          backgroundColor: AppTheme.success,
        ),
      );
      _fetchUsers();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _users.where((u) {
      if (_roleFilter == 'admin' && !u.isStaff) return false;
      if (_roleFilter == 'user' && u.isStaff) return false;

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = u.fullName.toLowerCase().contains(q);
        final matchEmail = u.email.toLowerCase().contains(q);
        final matchDept = (u.department ?? '').toLowerCase().contains(q);
        if (!matchName && !matchEmail && !matchDept) return false;
      }
      return true;
    }).toList();

    final totalCount = _users.length;
    final adminCount = _users.where((u) => u.isStaff).length;
    final memberCount = totalCount - adminCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _fetchUsers,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.group_outlined, color: AppTheme.primary, size: 24),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'User & Admin Directory',
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
                        'View system identities, manage access roles, and control active status.',
                        style: TextStyle(fontFamily: 'Inter', fontSize: 13, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 18),

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

              // KPI Stats
              Row(
                children: [
                  _buildStatCard('Total Directory', totalCount.toString(), const Color(0xFF0F172A)),
                  const SizedBox(width: 12),
                  _buildStatCard('Administrators', adminCount.toString(), AppTheme.primary),
                  const SizedBox(width: 12),
                  _buildStatCard('Members', memberCount.toString(), const Color(0xFF059669)),
                ],
              ),

              const SizedBox(height: 18),

              // Search & Filter Toolbar
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 38,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Row(
                          children: [
                            const Icon(Icons.search_rounded, size: 18, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 13),
                                decoration: const InputDecoration(
                                  hintText: 'Search users by name, email, department...',
                                  hintStyle: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF94A3B8)),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                                onChanged: (val) {
                                  setState(() {
                                    _searchQuery = val.trim();
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Role Filter Dropdown
                    Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _roleFilter,
                          items: const [
                            DropdownMenuItem(value: 'all', child: Text('All Users')),
                            DropdownMenuItem(value: 'admin', child: Text('Admins Only')),
                            DropdownMenuItem(value: 'user', child: Text('Members Only')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _roleFilter = val);
                          },
                          style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                          icon: const Icon(Icons.arrow_drop_down_rounded, size: 20, color: Color(0xFF64748B)),
                          isDense: true,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Users List
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (filtered.isEmpty)
                Container(
                  padding: const EdgeInsets.all(40),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.person_off_rounded, size: 36, color: Color(0xFF94A3B8)),
                      SizedBox(height: 10),
                      Text('No Users Found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final u = filtered[index];
                    final initial = u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : 'U';

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          // Avatar
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: u.isStaff
                                ? AppTheme.primary.withValues(alpha: 0.15)
                                : const Color(0xFFF1F5F9),
                            child: Text(
                              initial,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: u.isStaff ? AppTheme.primary : const Color(0xFF475569),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          // Name & Email
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      u.fullName,
                                      style: const TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: u.isStaff ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: u.isStaff ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0),
                                        ),
                                      ),
                                      child: Text(
                                        u.isStaff ? 'Administrator' : 'Member',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: u.isStaff ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${u.email}${u.department != null && u.department!.isNotEmpty ? ' • ${u.department}' : ''}',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Actions
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TextButton.icon(
                                onPressed: () => _toggleUserRole(u),
                                icon: Icon(
                                  u.isStaff ? Icons.remove_moderator_rounded : Icons.shield_rounded,
                                  size: 16,
                                  color: u.isStaff ? const Color(0xFFD97706) : AppTheme.primary,
                                ),
                                label: Text(
                                  u.isStaff ? 'Demote' : 'Make Admin',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: u.isStaff ? const Color(0xFFD97706) : AppTheme.primary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              IconButton(
                                icon: Icon(
                                  u.isActive ? Icons.block_rounded : Icons.check_circle_outline_rounded,
                                  size: 18,
                                  color: u.isActive ? AppTheme.error : AppTheme.success,
                                ),
                                tooltip: u.isActive ? 'Suspend User' : 'Activate User',
                                onPressed: () => _toggleUserActive(u),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(fontFamily: 'Inter', fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
