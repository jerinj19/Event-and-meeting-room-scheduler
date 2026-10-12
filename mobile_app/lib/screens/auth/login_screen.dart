import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/utils/validators.dart';
import '../../providers/auth_provider.dart';
import '../main_navigation_screen.dart';
import '../settings/server_settings_dialog.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLogin = true; // Segmented control: true = Log In, false = Register
  bool _showWorkspaceInterior = false; // Toggle between Corporate Building & Modern Workspace

  final _formKey = GlobalKey<FormState>();

  // Login Controllers
  final _emailController = TextEditingController(text: 'admin@innovyx.com');
  final _passwordController = TextEditingController(text: 'Admin@123');
  bool _rememberDevice = true;
  bool _obscurePassword = true;

  // Register Controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String _department = 'engineering';
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _fillDemoAccount(String email, String password) {
    setState(() {
      _isLogin = true;
      _emailController.text = email;
      _passwordController.text = password;
    });
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      final isStaff = authProvider.isStaff;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MainNavigationScreen(initialTabIndex: isStaff ? 4 : 0),
        ),
      );
    }
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.register(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      confirmPassword: _confirmPasswordController.text,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      department: _department,
    );

    if (success && mounted) {
      final isStaff = authProvider.isStaff;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MainNavigationScreen(initialTabIndex: isStaff ? 4 : 0),
        ),
      );
    }
  }

  void _handleSocialLogin(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$provider SSO initiated. Auto-filling demo credentials for workspace testing.'),
        backgroundColor: const Color(0xFF0056E0),
        duration: const Duration(seconds: 2),
      ),
    );
    _fillDemoAccount('admin@innovyx.com', 'Admin@123');
  }

  InputDecoration _buildInputDecoration({
    required String labelText,
    required String hintText,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: labelText,
      hintText: hintText,
      filled: true,
      fillColor: const Color(0x12000000), // ~7% ultra-transparent glass (building visible through input!)
      labelStyle: const TextStyle(
        color: Color(0xFFE2E8F0),
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: FontWeight.w600,
        shadows: [
          Shadow(color: Color(0xCC000000), blurRadius: 6),
        ],
      ),
      hintStyle: const TextStyle(
        color: Color(0xFF94A3B8),
        fontSize: 13,
        fontFamily: 'Inter',
      ),
      prefixIcon: Icon(prefixIcon, color: const Color(0xFF38BDF8), size: 18),
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0x4D38BDF8), width: 1.2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0x4D38BDF8), width: 1.2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.8),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
      ),
    );
  }

  Widget _buildAccountPill({
    required IconData icon,
    required Color iconColor,
    required String text,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0xEEFFFFFF),
          borderRadius: BorderRadius.circular(8),
          boxShadow: const [
            BoxShadow(
              color: Color(0x24000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        titleSpacing: isMobile ? 12 : 24,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.apartment_rounded, color: Color(0xFF38BDF8), size: 19),
            SizedBox(width: 7),
            Text(
              'Innovyx',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          // Responsive Quick Switcher: Building vs Workspace
          InkWell(
            onTap: () => setState(() => _showWorkspaceInterior = !_showWorkspaceInterior),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0x40000000),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x4038BDF8), width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _showWorkspaceInterior ? Icons.meeting_room_outlined : Icons.location_city_rounded,
                    color: const Color(0xFF38BDF8),
                    size: 14,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    _showWorkspaceInterior ? 'Workspace' : 'Building',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.dns_outlined, color: Color(0xFF94A3B8), size: 20),
            tooltip: 'Server Settings',
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => const ServerSettingsDialog(),
              );
            },
          ),
          SizedBox(width: isMobile ? 8 : 16),
        ],
      ),
      body: Stack(
        children: [
          // 1. Clearly Visible Modern Corporate Building / Workspace Background
          Positioned.fill(
            child: Image.asset(
              _showWorkspaceInterior
                  ? 'assets/images/workspace_interior_bg.jpg'
                  : 'assets/images/building_bg.jpg',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                // First web fallback: root web path
                return Image.network(
                  _showWorkspaceInterior ? 'workspace_interior_bg.jpg' : 'building_bg.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error2, stackTrace2) {
                    // Second web fallback: media endpoint
                    return Image.network(
                      _showWorkspaceInterior
                          ? 'http://127.0.0.1:8000/media/workspace_interior_bg.jpg'
                          : 'http://127.0.0.1:8000/media/building_bg.jpg',
                      fit: BoxFit.cover,
                      errorBuilder: (context, error3, stackTrace3) {
                        return Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF0B192E),
                                Color(0xFF1E293B),
                                Color(0xFF0F172A),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),

          // 2. Light Atmospheric Translucent Vignette (Ultra light so building is vibrant & clear)
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x0F000000), // ~6% very light top
                    Color(0x00000000), // 0% center - 100% crystal clear building visibility!
                    Color(0x1F000000), // ~12% subtle bottom grounding
                  ],
                ),
              ),
            ),
          ),

          // 3. Responsive Centered Ultra-Transparent Glass Card (Building clearly visible through card!)
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.symmetric(
                  horizontal: isMobile ? (screenWidth < 380 ? 10 : 14) : 24,
                  vertical: isMobile ? 12 : 24,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 2.5, sigmaY: 2.5), // Subtle 2.5px blur - building windows & architecture stay visibly crisp!
                      child: Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isMobile ? 18 : 26,
                          vertical: isMobile ? 22 : 28,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0x0D0B1426), // Sheer ~5% ultra-transparent glass
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0x4D38BDF8), // Glowing cyan accent border
                            width: 1.2,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x26000000),
                              blurRadius: 24,
                              offset: Offset(0, 10),
                            ),
                            BoxShadow(
                              color: Color(0x1A0051D5),
                              blurRadius: 20,
                              spreadRadius: -2,
                            ),
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Card Header: Exact Match to Screenshot
                              Text(
                                _isLogin ? 'Sign in to your portal' : 'Create your enterprise account',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: -0.4,
                                  shadows: [
                                    Shadow(color: Color(0xDD000000), blurRadius: 8),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _isLogin
                                    ? 'Access your enterprise room reservations & schedules'
                                    : 'Join your organization\'s workspace management suite',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 13,
                                  color: Color(0xFFE2E8F0),
                                  fontWeight: FontWeight.w500,
                                  shadows: [
                                    Shadow(color: Color(0xDD000000), blurRadius: 6),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 22),

                              // Error Banner
                              if (authProvider.errorMessage != null) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0x66450A0A),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: const Color(0xFFEF4444).withValues(alpha: 0.6),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: Color(0xFFFFB4AB), size: 18),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          authProvider.errorMessage!,
                                          style: const TextStyle(
                                            fontSize: 12.5,
                                            color: Color(0xFFFFDAD6),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Segmented Control: [ Log In ] [ Register ]
                              Container(
                                height: 44,
                                padding: const EdgeInsets.all(3),
                                decoration: BoxDecoration(
                                  color: const Color(0x14000000), // ~8% ultra-transparent glass (building visible!)
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0x4038BDF8)),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          authProvider.clearError();
                                          setState(() => _isLogin = true);
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: _isLogin ? const Color(0xFF0056E0) : Colors.transparent,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            'Log In',
                                            style: TextStyle(
                                              fontFamily: 'Inter',
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w700,
                                              color: _isLogin ? Colors.white : const Color(0xFFCBD5E1),
                                              shadows: const [
                                                Shadow(color: Color(0xCC000000), blurRadius: 4),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          authProvider.clearError();
                                          setState(() => _isLogin = false);
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: !_isLogin ? const Color(0xFF0056E0) : Colors.transparent,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            'Register',
                                            style: TextStyle(
                                              fontFamily: 'Inter',
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w700,
                                              color: !_isLogin ? Colors.white : const Color(0xFFCBD5E1),
                                              shadows: const [
                                                Shadow(color: Color(0xCC000000), blurRadius: 4),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),

                              // SSO Buttons: [ Google ] [ Microsoft 365 ]
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: authProvider.isLoading
                                          ? null
                                          : () => _handleSocialLogin('Google Workspace'),
                                      borderRadius: BorderRadius.circular(10),
                                      child: Container(
                                        height: 42,
                                        decoration: BoxDecoration(
                                          color: const Color(0x14000000), // ~8% ultra-transparent glass
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: const Color(0x4038BDF8)),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            _buildGoogleIcon(),
                                            const SizedBox(width: 8),
                                            const Text(
                                              'Google',
                                              style: TextStyle(
                                                fontFamily: 'Inter',
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                                shadows: [
                                                  Shadow(color: Color(0xCC000000), blurRadius: 4),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: InkWell(
                                      onTap: authProvider.isLoading
                                          ? null
                                          : () => _handleSocialLogin('Microsoft 365'),
                                      borderRadius: BorderRadius.circular(10),
                                      child: Container(
                                        height: 42,
                                        decoration: BoxDecoration(
                                          color: const Color(0x14000000), // ~8% ultra-transparent glass
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: const Color(0x4038BDF8)),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            _buildMicrosoftIcon(),
                                            const SizedBox(width: 8),
                                            const Text(
                                              'Microsoft 365',
                                              style: TextStyle(
                                                fontFamily: 'Inter',
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                                shadows: [
                                                  Shadow(color: Color(0xCC000000), blurRadius: 4),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),

                              // Divider: OR CONTINUE WITH SSO
                              Row(
                                children: const [
                                  Expanded(child: Divider(color: Color(0x3338BDF8))),
                                  Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 10),
                                    child: Text(
                                      'OR CONTINUE WITH SSO',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.8,
                                        color: Color(0xFF94A3B8),
                                      ),
                                    ),
                                  ),
                                  Expanded(child: Divider(color: Color(0x3338BDF8))),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Registration Extra Fields
                              if (!_isLogin) ...[
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: _firstNameController,
                                        textInputAction: TextInputAction.next,
                                        style: const TextStyle(color: Colors.white, fontFamily: 'Inter', fontSize: 14),
                                        decoration: _buildInputDecoration(
                                          labelText: 'First Name',
                                          hintText: 'John',
                                          prefixIcon: Icons.person_outline_rounded,
                                        ),
                                        validator: (val) => !_isLogin ? Validators.requiredField(val, 'First name') : null,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: TextFormField(
                                        controller: _lastNameController,
                                        textInputAction: TextInputAction.next,
                                        style: const TextStyle(color: Colors.white, fontFamily: 'Inter', fontSize: 14),
                                        decoration: _buildInputDecoration(
                                          labelText: 'Last Name',
                                          hintText: 'Doe',
                                          prefixIcon: Icons.person_outline_rounded,
                                        ),
                                        validator: (val) => !_isLogin ? Validators.requiredField(val, 'Last name') : null,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                DropdownButtonFormField<String>(
                                  initialValue: _department,
                                  dropdownColor: const Color(0xFF0F172A),
                                  style: const TextStyle(color: Colors.white, fontFamily: 'Inter', fontSize: 14),
                                  decoration: _buildInputDecoration(
                                    labelText: 'Department',
                                    hintText: 'Select Department',
                                    prefixIcon: Icons.business_center_outlined,
                                  ),
                                  items: const [
                                    DropdownMenuItem(value: 'engineering', child: Text('Engineering')),
                                    DropdownMenuItem(value: 'product', child: Text('Product & Design')),
                                    DropdownMenuItem(value: 'sales', child: Text('Sales & Marketing')),
                                    DropdownMenuItem(value: 'hr', child: Text('Human Resources')),
                                    DropdownMenuItem(value: 'finance', child: Text('Finance')),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) setState(() => _department = val);
                                  },
                                ),
                                const SizedBox(height: 14),
                              ],

                              // Work Email Input (Matches Screenshot)
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontFamily: 'Inter',
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                ),
                                decoration: _buildInputDecoration(
                                  labelText: 'Work Email',
                                  hintText: 'admin@innovyx.com',
                                  prefixIcon: Icons.mail_outline_rounded,
                                ),
                                validator: Validators.email,
                              ),
                              const SizedBox(height: 14),

                              // Password Input (Matches Screenshot)
                              TextFormField(
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                textInputAction: _isLogin ? TextInputAction.done : TextInputAction.next,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontFamily: 'Inter',
                                  fontSize: 14.5,
                                  letterSpacing: 2,
                                ),
                                decoration: _buildInputDecoration(
                                  labelText: 'Password',
                                  hintText: '••••••••',
                                  prefixIcon: Icons.lock_outline_rounded,
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                      color: const Color(0xFF94A3B8),
                                      size: 18,
                                    ),
                                    onPressed: () {
                                      setState(() => _obscurePassword = !_obscurePassword);
                                    },
                                  ),
                                ),
                                validator: Validators.password,
                              ),

                              if (!_isLogin) ...[
                                const SizedBox(height: 14),
                                TextFormField(
                                  controller: _confirmPasswordController,
                                  obscureText: _obscureConfirmPassword,
                                  textInputAction: TextInputAction.done,
                                  style: const TextStyle(color: Colors.white, fontFamily: 'Inter', fontSize: 14.5, letterSpacing: 2),
                                  decoration: _buildInputDecoration(
                                    labelText: 'Confirm Password',
                                    hintText: '••••••••',
                                    prefixIcon: Icons.lock_outline_rounded,
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                        color: const Color(0xFF94A3B8),
                                        size: 18,
                                      ),
                                      onPressed: () {
                                        setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                                      },
                                    ),
                                  ),
                                  validator: (val) => Validators.confirmPassword(val, _passwordController.text),
                                ),
                              ],

                              if (_isLogin) ...[
                                const SizedBox(height: 12),
                                // Remember Device & Forgot Password (Exact Matches to Screenshot)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: Checkbox(
                                            value: _rememberDevice,
                                            activeColor: const Color(0xFF0056E0),
                                            checkColor: Colors.white,
                                            side: const BorderSide(color: Color(0xFF334155), width: 1.5),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                            onChanged: (val) {
                                              setState(() => _rememberDevice = val ?? true);
                                            },
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          'Remember this device',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 12.5,
                                            color: Color(0xFF94A3B8),
                                          ),
                                        ),
                                      ],
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Password reset link sent to enterprise admin.')),
                                        );
                                      },
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        minimumSize: Size.zero,
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      child: const Text(
                                        'Forgot password?',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF38BDF8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],

                              const SizedBox(height: 20),

                              // Secure Log In Button (Exact Blue Matches Screenshot)
                              SizedBox(
                                width: double.infinity,
                                height: 46,
                                child: ElevatedButton(
                                  onPressed: authProvider.isLoading
                                      ? null
                                      : (_isLogin ? _handleLogin : _handleRegister),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0056E0),
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: authProvider.isLoading
                                      ? const SizedBox(
                                          height: 18,
                                          width: 18,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                        )
                                      : Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              _isLogin ? 'Secure Log In' : 'Create Account',
                                              style: const TextStyle(
                                                fontFamily: 'Inter',
                                                fontSize: 15,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            const Icon(Icons.arrow_forward_rounded, size: 16),
                                          ],
                                        ),
                                ),
                              ),
                              const SizedBox(height: 22),

                              // Pre-configured Working Test Accounts (Exact Pills from Screenshot)
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0x12000000), // ~7% ultra-transparent glass
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0x4038BDF8)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: const [
                                        Icon(Icons.vpn_key_rounded, size: 13, color: Color(0xFF38BDF8)),
                                        SizedBox(width: 6),
                                        Text(
                                          'Pre-configured Working Test Accounts:',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    _buildAccountPill(
                                      icon: Icons.shield_rounded,
                                      iconColor: const Color(0xFF0056E0),
                                      text: 'Admin (admin@innovyx.com)',
                                      onTap: () => _fillDemoAccount('admin@innovyx.com', 'Admin@123'),
                                    ),
                                    const SizedBox(height: 6),
                                    _buildAccountPill(
                                      icon: Icons.shield_rounded,
                                      iconColor: const Color(0xFF0056E0),
                                      text: 'Admin (prashanthkolla123@gmail.com)',
                                      onTap: () => _fillDemoAccount('prashanthkolla123@gmail.com', 'Kolla@2000'),
                                    ),
                                    const SizedBox(height: 6),
                                    _buildAccountPill(
                                      icon: Icons.person_rounded,
                                      iconColor: const Color(0xFF10B981),
                                      text: 'Member (zzz@gmail.com)',
                                      onTap: () => _fillDemoAccount('zzz@gmail.com', 'Kolla@2000'),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 18),

                              // Footer: Security Banner (Exact Matches Screenshot)
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.shield_outlined, size: 14, color: Color(0xFF10B981)),
                                  SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'Protected by SOC2 Type II compliance & enterprise SSO',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 11,
                                        color: Color(0xFF94A3B8),
                                        fontWeight: FontWeight.w500,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),

                              // Support link (Exact Matches Screenshot)
                              Center(
                                child: TextButton.icon(
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Enterprise Support Desk: support@innovyx.com')),
                                    );
                                  },
                                  icon: const Icon(Icons.headset_mic_outlined, size: 14, color: Color(0xFF94A3B8)),
                                  label: const Text(
                                    'Need enterprise assistance? Contact Support',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 11,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoogleIcon() {
    return SizedBox(
      width: 18,
      height: 18,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }

  Widget _buildMicrosoftIcon() {
    return SizedBox(
      width: 16,
      height: 16,
      child: Column(
        children: [
          Row(
            children: [
              Container(width: 7, height: 7, color: const Color(0xFFF25022)),
              const SizedBox(width: 2),
              Container(width: 7, height: 7, color: const Color(0xFF7FBA00)),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Container(width: 7, height: 7, color: const Color(0xFF00A4EF)),
              const SizedBox(width: 2),
              Container(width: 7, height: 7, color: const Color(0xFFFFB900)),
            ],
          ),
        ],
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final bluePaint = Paint()..color = const Color(0xFF4285F4);
    final greenPaint = Paint()..color = const Color(0xFF34A853);
    final yellowPaint = Paint()..color = const Color(0xFFFBBC05);
    final redPaint = Paint()..color = const Color(0xFFEA4335);

    final rect = Rect.fromLTWH(0, 0, w, h);
    canvas.drawArc(rect, -0.78, 1.57, true, bluePaint);
    canvas.drawArc(rect, 0.78, 1.57, true, greenPaint);
    canvas.drawArc(rect, 2.35, 1.57, true, yellowPaint);
    canvas.drawArc(rect, 3.92, 1.57, true, redPaint);

    final innerPaint = Paint()..color = const Color(0xFF070D18);
    canvas.drawCircle(Offset(w / 2, h / 2), w * 0.35, innerPaint);

    final barPaint = Paint()..color = const Color(0xFF4285F4);
    canvas.drawRect(Rect.fromLTWH(w * 0.45, h * 0.4, w * 0.55, h * 0.2), barPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
