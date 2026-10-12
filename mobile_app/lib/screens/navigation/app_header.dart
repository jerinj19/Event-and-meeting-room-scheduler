import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';
import '../booking/book_room_screen.dart';

class AppHeader extends StatefulWidget implements PreferredSizeWidget {
  final UserModel? user;
  final VoidCallback? onToggleSidebar;
  final Function(String)? onSearch;
  final VoidCallback? onOpenNotifications;
  final VoidCallback? onOpenSettings;
  final VoidCallback? onLogout;
  final bool isAdminMode;

  const AppHeader({
    super.key,
    this.user,
    this.onToggleSidebar,
    this.onSearch,
    this.onOpenNotifications,
    this.onOpenSettings,
    this.onLogout,
    this.isAdminMode = false,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  State<AppHeader> createState() => _AppHeaderState();
}

class _AppHeaderState extends State<AppHeader> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 900;
    final isTablet = screenWidth >= 640 && screenWidth < 900;

    final displayName = widget.user?.fullName.isNotEmpty == true
        ? widget.user!.fullName
        : (widget.user?.email.split('@').first ?? 'User');
    final userEmail = widget.user?.email ?? 'user@innovyx.com';
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Container(
      height: 64,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      padding: EdgeInsets.symmetric(horizontal: screenWidth < 500 ? 8 : 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Hamburger + Brandmark
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Mobile Hamburger Button
                if (!isDesktop && widget.onToggleSidebar != null) ...[
                  IconButton(
                    icon: const Icon(Icons.menu_rounded, color: Color(0xFF334155), size: 22),
                    tooltip: 'Toggle Navigation',
                    onPressed: widget.onToggleSidebar,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                  ),
                  const SizedBox(width: 4),
                ],

                // Brandmark: [🏢] Innovyx
                InkWell(
                  onTap: () {},
                  borderRadius: BorderRadius.circular(8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: widget.isAdminMode ? const Color(0xFF1E293B) : AppTheme.primary,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: (widget.isAdminMode ? const Color(0xFF1E293B) : AppTheme.primary).withValues(alpha: 0.25),
                              blurRadius: 5,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            widget.isAdminMode ? Icons.admin_panel_settings_rounded : Icons.apartment_rounded,
                            color: Colors.white,
                            size: 17,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        widget.isAdminMode
                            ? (screenWidth < 520 ? 'Admin' : 'Innovyx Admin')
                            : (screenWidth < 520 ? 'Innovyx' : 'Innovyx Rooms'),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (screenWidth >= 600) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: widget.isAdminMode ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: widget.isAdminMode ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Text(
                            widget.isAdminMode ? 'Operations Center' : 'Workspace v7.4',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: widget.isAdminMode ? const Color(0xFF92400E) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Center: Global Search Bar across Name, Location & Amenities (Web style, Desktop only)
          if (isDesktop)
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, size: 18, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              color: Color(0xFF0F172A),
                            ),
                            decoration: InputDecoration(
                              hintText: widget.isAdminMode
                                  ? 'Search bookings, users, rooms...'
                                  : 'Search by location, amenities, room name...',
                              hintStyle: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 13,
                                color: Color(0xFF94A3B8),
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            onSubmitted: widget.onSearch,
                          ),
                        ),
                        if (_searchController.text.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              if (widget.onSearch != null) widget.onSearch!('');
                              setState(() {});
                            },
                            child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Right Action Cluster
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // "+ Book Slot" Button (Only in Member / User Mode, Hidden in Admin Console)
              if (!widget.isAdminMode) ...[
                if (screenWidth < 520)
                  // Sleek, compact Icon button on mobile screens (< 520px) to prevent any overflow
                  Container(
                    height: 32,
                    width: 32,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.add_rounded, size: 18, color: Colors.white),
                      tooltip: 'Book Room Slot',
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const BookRoomScreen()),
                        );
                      },
                    ),
                  )
                else
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const BookRoomScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add_rounded, size: 16),
                        SizedBox(width: 4),
                        Text(
                          'Book Slot',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(width: 6),
              ],

              // Notification Bell with Unread Red Dot (Web style)
              Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF64748B), size: 22),
                    tooltip: 'Notifications',
                    onPressed: widget.onOpenNotifications ?? () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('All IoT room sensors and notifications up to date.'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(width: 8),

              // Divider
              if (isDesktop || isTablet)
                Container(
                  height: 24,
                  width: 1,
                  color: const Color(0xFFE2E8F0),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                ),

              if (isDesktop || isTablet) const SizedBox(width: 8),

              // User Profile Avatar & Identity Pill (Web style)
              PopupMenuButton<String>(
                onSelected: (val) {
                  if (val == 'settings' && widget.onOpenSettings != null) {
                    widget.onOpenSettings!();
                  } else if (val == 'logout' && widget.onLogout != null) {
                    widget.onLogout!();
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    enabled: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          userEmail,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'settings',
                    child: Row(
                      children: [
                        Icon(Icons.tune_rounded, size: 18, color: Color(0xFF64748B)),
                        SizedBox(width: 8),
                        Text('Server Settings'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'logout',
                    child: Row(
                      children: [
                        Icon(Icons.logout_rounded, size: 18, color: Color(0xFFEF4444)),
                        SizedBox(width: 8),
                        Text('Sign Out', style: TextStyle(color: Color(0xFFEF4444))),
                      ],
                    ),
                  ),
                ],
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0F172A),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    if (isDesktop) ...[
                      const SizedBox(width: 8),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                              height: 1.1,
                            ),
                          ),
                          Text(
                            userEmail,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              color: Color(0xFF64748B),
                              height: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
