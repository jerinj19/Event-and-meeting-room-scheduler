import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/data/models/user_model.dart';
import 'package:mobile_app/providers/auth_provider.dart';
import 'package:mobile_app/providers/booking_provider.dart';
import 'package:mobile_app/providers/room_provider.dart';
import 'package:mobile_app/screens/admin/admin_dashboard_screen.dart';
import 'package:mobile_app/screens/auth/login_screen.dart';
import 'package:mobile_app/screens/booking/book_room_screen.dart';
import 'package:mobile_app/screens/dashboard/user_dashboard_screen.dart';
import 'package:mobile_app/screens/navigation/app_header.dart';
import 'package:mobile_app/screens/navigation/app_sidebar.dart';
import 'package:mobile_app/screens/rooms/room_catalog_screen.dart';
import 'package:provider/provider.dart';

Widget createTestApp(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => RoomProvider()),
      ChangeNotifierProvider(create: (_) => BookingProvider()),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: child,
    ),
  );
}

void main() {
  group('Google Stitch Responsive UI Tests (Web-Identical)', () {
    testWidgets('LoginScreen renders web-identical AuthView with Google, Microsoft & Segmented toggle', (tester) async {
      // Test small phone
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(createTestApp(const LoginScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Sign in to your portal'), findsOneWidget);
      expect(find.text('Innovyx Rooms'), findsOneWidget);
      expect(find.text('Google'), findsOneWidget);
      expect(find.text('Microsoft 365'), findsOneWidget);
      expect(find.text('Log In'), findsOneWidget);
      expect(find.text('Register'), findsOneWidget);
      expect(find.text('Secure Log In'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Test tablet
      tester.view.physicalSize = const Size(800, 1280);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(tester.takeException(), isNull);
    });

    testWidgets('AppHeader renders brand, Workspace v7.4 badge, and Book Slot button', (tester) async {
      tester.view.physicalSize = const Size(1000, 64);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            appBar: AppHeader(
              user: UserModel(id: '1', email: 'userz@gmail.com', firstName: 'user', lastName: 'z'),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Innovyx Rooms'), findsOneWidget);
      expect(find.text('Workspace v7.4'), findsOneWidget);
      expect(find.text('Book Slot'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('AppSidebar renders navigation items matching web Sidebar.jsx', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          Scaffold(
            body: AppSidebar(
              currentIndex: 0,
              onSelectTab: (_) {},
              user: UserModel(id: '1', email: 'admin@innovyx.com', firstName: 'Admin', lastName: 'User', isStaff: true),
              onLogout: () {},
              onOpenSettings: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Welcome Dashboard'), findsOneWidget);
      expect(find.text('Browse Rooms'), findsOneWidget);
      expect(find.text('Book a Slot'), findsOneWidget);
      expect(find.text('My Bookings'), findsOneWidget);
      expect(find.text('Admin Console'), findsOneWidget);
      expect(find.text('Sign Out'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('UserDashboardScreen renders 4 Bento KPI cards and Presence Sync banner matching Image 1', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(createTestApp(UserDashboardScreen(onNavigateTab: (_) {})));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Enterprise HQ Sync'), findsOneWidget);
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Total History'), findsOneWidget);
      expect(find.text('Hours Reserved'), findsOneWidget);
      expect(find.text('Attendance Rate'), findsOneWidget);
      expect(find.text('Upcoming Bookings'), findsOneWidget);
      expect(find.text('Past Bookings'), findsOneWidget);
      expect(find.text('Automated Presence Verification & Room Sync'), findsOneWidget);
      final ex = tester.takeException();
      expect(ex, isNull);
    });

    testWidgets('RoomCatalogScreen adapts layout between mobile and tablet', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(createTestApp(const RoomCatalogScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Meeting Spaces'), findsOneWidget);
      expect(find.text('All Spaces'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('BookRoomScreen renders Date Strip and Schedule form without overflow', (tester) async {
      tester.view.physicalSize = const Size(380, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(createTestApp(const BookRoomScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Schedule Meeting Room'), findsOneWidget);
      expect(find.text('Schedule Date'), findsOneWidget);
      expect(find.text('Confirm & Book Space'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('AdminDashboardScreen renders Bento KPI metrics responsively', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(createTestApp(const AdminDashboardScreen()));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Admin Management Console'), findsOneWidget);
      expect(find.text('Enterprise Operations'), findsOneWidget);
      expect(find.text('Enterprise Metrics'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
