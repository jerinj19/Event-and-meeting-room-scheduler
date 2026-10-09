import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/config/api_config.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/room_provider.dart';
import 'providers/time_slot_provider.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.init();

  runApp(const SchedulerMobileApp());
}

class SchedulerMobileApp extends StatelessWidget {
  const SchedulerMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => RoomProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
        ChangeNotifierProvider(create: (_) => TimeSlotProvider()),
      ],
      child: MaterialApp(
        title: 'Innovyx Room Scheduler',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const SplashScreen(),
      ),
    );
  }
}
