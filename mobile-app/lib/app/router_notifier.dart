import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

/// Notifies [GoRouter] when auth or security state changes for redirects.
class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this._ref) {
    _ref.listen(authControllerProvider, (_, __) => notifyListeners());
    _ref.listen(securityControllerProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  final notifier = RouterNotifier(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});
