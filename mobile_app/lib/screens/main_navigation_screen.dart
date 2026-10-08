import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import 'admin/admin_dashboard_screen.dart';
import 'auth/login_screen.dart';
import 'booking/book_room_screen.dart';
import 'dashboard/user_dashboard_screen.dart';
import 'my_bookings/my_bookings_screen.dart';
import 'navigation/app_header.dart';
import 'navigation/app_sidebar.dart';
import 'rooms/room_catalog_screen.dart';
import 'settings/server_settings_dialog.dart';

class MainNavigationScreen extends StatefulWidget {
  final int initialTabIndex;

  const MainNavigationScreen({super.key, this.initialTabIndex = 0});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTabIndex;
  }

  void _onTabTapped(int index) {
    if (index == 3) {
      // "Book a Slot" quick action
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const BookRoomScreen()),
      );
      return;
    }
    setState(() {
      _currentIndex = index;
    });
  }

  void _openSettings() {
    showDialog(
      context: context,
      builder: (_) => const ServerSettingsDialog(),
    );
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppTheme.error),
            SizedBox(width: 8),
            Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Logging out ends this device\'s interactive session. Automated door badge credentials and scheduled IoT room releases will remain active.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              final authProvider = Provider.of<AuthProvider>(context, listen: false);
              await authProvider.logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Confirm Sign Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.currentUser;
    final isStaff = authProvider.isStaff;
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth >= 900;

    final screens = <Widget>[
      UserDashboardScreen(
        onNavigateTab: _onTabTapped,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
        onOpenSettings: _openSettings,
        hasGlobalHeader: true,
      ),
      RoomCatalogScreen(
        onBack: () => _onTabTapped(0),
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
        hasGlobalHeader: true,
      ),
      MyBookingsScreen(
        onBack: () => _onTabTapped(0),
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
        hasGlobalHeader: true,
      ),
      const SizedBox.shrink(), // Index 3 is modal BookRoomScreen action
      if (isStaff)
        AdminDashboardScreen(
          onBack: () => _onTabTapped(0),
          onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
          hasGlobalHeader: true,
        ),
    ];

    final safeIndex = _currentIndex >= screens.length ? 0 : _currentIndex;

    final sidebarWidget = AppSidebar(
      currentIndex: safeIndex,
      onSelectTab: (index) {
        if (!isWide && _scaffoldKey.currentState?.isDrawerOpen == true) {
          Navigator.of(context).pop();
        }
        _onTabTapped(index);
      },
      onOpenSettings: () {
        if (!isWide && _scaffoldKey.currentState?.isDrawerOpen == true) {
          Navigator.of(context).pop();
        }
        _openSettings();
      },
      onLogout: () {
        if (!isWide && _scaffoldKey.currentState?.isDrawerOpen == true) {
          Navigator.of(context).pop();
        }
        _confirmLogout();
      },
      user: user,
      onCloseDrawer: !isWide ? () => Navigator.of(context).pop() : null,
    );

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF8FAFC),
      drawer: isWide ? null : Drawer(child: sidebarWidget),
      body: SafeArea(
        child: Column(
          children: [
            // Unified Web-Style Top Header across whole screen
            AppHeader(
              user: user,
              onToggleSidebar: () => _scaffoldKey.currentState?.openDrawer(),
              onSearch: (q) {
                _onTabTapped(1); // Go to Room Catalog
              },
              onOpenSettings: _openSettings,
              onLogout: _confirmLogout,
            ),

            // Content Area with Desktop Docked Sidebar or Mobile Full Screen
            Expanded(
              child: Row(
                children: [
                  if (isWide) ...[
                    sidebarWidget,
                    const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                  ],
                  Expanded(
                    child: IndexedStack(
                      index: safeIndex,
                      children: screens,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
