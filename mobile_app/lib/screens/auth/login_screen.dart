import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
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
        backgroundColor: AppTheme.primary,
        duration: const Duration(seconds: 2),
      ),
    );
    _fillDemoAccount('admin@innovyx.com', 'Admin@123');
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.dns_outlined, color: Color(0xFF64748B)),
            tooltip: 'Server Settings',
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => const ServerSettingsDialog(),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: screenWidth < 400 ? 14 : 20,
              vertical: 20,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth < 400 ? 18 : 28,
                  vertical: 30,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0F0F172A),
                      blurRadius: 24,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Top Brandmark (Exact Web AuthView)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppTheme.primary,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primary.withValues(alpha: 0.28),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Icon(Icons.apartment_rounded, size: 24, color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Flexible(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Innovyx Rooms',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                    letterSpacing: -0.4,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  'ENTERPRISE WORKSPACE PLATFORM',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.9,
                                    color: AppTheme.primary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 22),

                      // Card Header
                      Text(
                        _isLogin ? 'Sign in to your portal' : 'Create your enterprise account',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        _isLogin
                            ? 'Access your enterprise room reservations & schedules'
                            : 'Join your organization\'s workspace management suite',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Error Banner
                      if (authProvider.errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFDAD6),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFFB4AB)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: Color(0xFFBA1A1A), size: 18),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  authProvider.errorMessage!,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: Color(0xFFBA1A1A),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Segmented Control: Log In / Register (Exact Web AuthView)
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9), // slate-100
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  authProvider.clearError();
                                  setState(() => _isLogin = true);
                                },
                                borderRadius: BorderRadius.circular(9),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: _isLogin ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(9),
                                    boxShadow: _isLogin
                                        ? const [
                                            BoxShadow(
                                              color: Color(0x140F172A),
                                              blurRadius: 4,
                                              offset: Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      'Log In',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 13,
                                        fontWeight: _isLogin ? FontWeight.w700 : FontWeight.w600,
                                        color: _isLogin ? AppTheme.primary : const Color(0xFF64748B),
                                      ),
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
                                borderRadius: BorderRadius.circular(9),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: !_isLogin ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(9),
                                    boxShadow: !_isLogin
                                        ? const [
                                            BoxShadow(
                                              color: Color(0x140F172A),
                                              blurRadius: 4,
                                              offset: Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      'Register',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 13,
                                        fontWeight: !_isLogin ? FontWeight.w700 : FontWeight.w600,
                                        color: !_isLogin ? AppTheme.primary : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Social Logins (Google Workspace & Microsoft 365)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () => _handleSocialLogin('Google Workspace'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                backgroundColor: Colors.white,
                              ),
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _buildGoogleIcon(),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'Google',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () => _handleSocialLogin('Microsoft 365'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                backgroundColor: Colors.white,
                              ),
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _buildMicrosoftIcon(),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'Microsoft 365',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
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
                        children: [
                          const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: Text(
                              'OR CONTINUE WITH SSO',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                          const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Form Fields
                      if (!_isLogin) ...[
                        // First Name & Last Name
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _firstNameController,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'First Name',
                                  hintText: 'John',
                                  prefixIcon: Icon(Icons.person_outline_rounded, color: Color(0xFF64748B), size: 18),
                                ),
                                validator: (val) => !_isLogin ? Validators.requiredField(val, 'First name') : null,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextFormField(
                                controller: _lastNameController,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'Last Name',
                                  hintText: 'Doe',
                                  prefixIcon: Icon(Icons.person_outline_rounded, color: Color(0xFF64748B), size: 18),
                                ),
                                validator: (val) => !_isLogin ? Validators.requiredField(val, 'Last name') : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Department Dropdown
                        DropdownButtonFormField<String>(
                          initialValue: _department,
                          decoration: const InputDecoration(
                            labelText: 'Department',
                            prefixIcon: Icon(Icons.business_center_outlined, color: Color(0xFF64748B), size: 18),
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

                      // Email Field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Work Email',
                          hintText: 'name@company.com',
                          prefixIcon: Icon(Icons.mail_outline_rounded, color: Color(0xFF64748B), size: 18),
                        ),
                        validator: Validators.email,
                      ),
                      const SizedBox(height: 14),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        textInputAction: _isLogin ? TextInputAction.done : TextInputAction.next,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          hintText: '••••••••',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFF64748B), size: 18),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: const Color(0xFF64748B),
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
                        // Confirm Password Field
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          textInputAction: TextInputAction.done,
                          decoration: InputDecoration(
                            labelText: 'Confirm Password',
                            hintText: '••••••••',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFF64748B), size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: const Color(0xFF64748B),
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
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: Checkbox(
                                    value: _rememberDevice,
                                    activeColor: AppTheme.primary,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    onChanged: (val) {
                                      setState(() => _rememberDevice = val ?? true);
                                    },
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'Remember this device',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
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
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],

                      const SizedBox(height: 20),

                      // Submit Button
                      ElevatedButton(
                        onPressed: authProvider.isLoading
                            ? null
                            : (_isLogin ? _handleLogin : _handleRegister),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: authProvider.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
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
                      const SizedBox(height: 22),

                      // Pre-configured Verified Demo Accounts (Working backend credentials)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                Icon(Icons.key_rounded, size: 14, color: AppTheme.primary),
                                Text(
                                  'Pre-configured Working Test Accounts:',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                             Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                ActionChip(
                                  label: const Text('Admin (admin@innovyx.com)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                  avatar: const Icon(Icons.admin_panel_settings, size: 14, color: AppTheme.primary),
                                  backgroundColor: Colors.white,
                                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                                  onPressed: () => _fillDemoAccount('admin@innovyx.com', 'Admin@123'),
                                ),
                                ActionChip(
                                  label: const Text('Admin (prashanthkolla123@gmail.com)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                  avatar: const Icon(Icons.shield_rounded, size: 14, color: AppTheme.primary),
                                  backgroundColor: Colors.white,
                                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                                  onPressed: () => _fillDemoAccount('prashanthkolla123@gmail.com', 'Kolla@2000'),
                                ),
                                ActionChip(
                                  label: const Text('Member (zzz@gmail.com)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                  avatar: const Icon(Icons.person, size: 14, color: Color(0xFF047857)),
                                  backgroundColor: Colors.white,
                                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                                  onPressed: () => _fillDemoAccount('zzz@gmail.com', 'Kolla@2000'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Card Footer: Security Banner
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.shield_outlined, size: 13, color: Color(0xFF64748B)),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              'Protected by SOC2 Type II compliance & enterprise SSO',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Support link
                      Center(
                        child: TextButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Enterprise Support Desk: support@innovyx.com')),
                            );
                          },
                          icon: const Icon(Icons.headset_mic_outlined, size: 14, color: Color(0xFF64748B)),
                          label: const Text(
                            'Need enterprise assistance? Contact Support',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              color: Color(0xFF64748B),
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

    // Simple multi-quadrant G representation
    final rect = Rect.fromLTWH(0, 0, w, h);
    canvas.drawArc(rect, -0.78, 1.57, true, bluePaint);
    canvas.drawArc(rect, 0.78, 1.57, true, greenPaint);
    canvas.drawArc(rect, 2.35, 1.57, true, yellowPaint);
    canvas.drawArc(rect, 3.92, 1.57, true, redPaint);

    final innerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(w / 2, h / 2), w * 0.35, innerPaint);

    final barPaint = Paint()..color = const Color(0xFF4285F4);
    canvas.drawRect(Rect.fromLTWH(w * 0.45, h * 0.4, w * 0.55, h * 0.2), barPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
