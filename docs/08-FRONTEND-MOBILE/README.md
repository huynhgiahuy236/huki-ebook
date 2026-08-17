# 📱 Frontend Mobile - Flutter

Tài liệu cho Mobile Application.

## 📁 Project Structure

```
apps/
└── mobile/                        # Flutter Application
    ├── lib/
    │   ├── main.dart
    │   │
    │   ├── app/                   # App configuration
    │   │   ├── app.dart           # Main app widget
    │   │   ├── router.dart        # GoRouter config
    │   │   └── theme.dart         # Theme configuration
    │   │
    │   ├── core/                  # Core utilities
    │   │   ├── config/            # Environment config
    │   │   │   ├── env.dart
    │   │   │   └── constants.dart
    │   │   │
    │   │   ├── network/         # HTTP client
    │   │   │   ├── api_client.dart
    │   │   │   ├── api_interceptor.dart
    │   │   │   └── endpoints.dart
    │   │   │
    │   │   ├── storage/         # Local storage
    │   │   │   ├── local_storage.dart
    │   │   │   ├── secure_storage.dart
    │   │   │   └── hive_config.dart
    │   │   │
    │   │   ├── errors/          # Error handling
    │   │   │   ├── exceptions.dart
    │   │   │   └── failures.dart
    │   │   │
    │   │   └── utils/          # Utilities
    │   │       ├── extensions.dart
    │   │       ├── formatters.dart
    │   │       └── validators.dart
    │   │
    │   ├── shared/              # Shared components
    │   │   ├── widgets/         # Common widgets
    │   │   │   ├── app_button.dart
    │   │   │   ├── app_text_field.dart
    │   │   │   ├── loading_indicator.dart
    │   │   │   ├── error_widget.dart
    │   │   │   └── empty_widget.dart
    │   │   │
    │   │   ├── theme/          # Theme
    │   │   │   ├── app_colors.dart
    │   │   │   ├── app_text_styles.dart
    │   │   │   └── app_theme.dart
    │   │   │
    │   │   └── i18n/           # Internationalization
    │   │       ├── app_localizations.dart
    │   │       └── vi.dart
    │   │
    │   ├── features/            # Feature modules
    │   │   ├── auth/
    │   │   │   ├── data/
    │   │   │   │   ├── datasources/
    │   │   │   │   ├── models/
    │   │   │   │   └── repositories/
    │   │   │   │
    │   │   │   ├── domain/
    │   │   │   │   ├── entities/
    │   │   │   │   ├── repositories/
    │   │   │   │   └── usecases/
    │   │   │   │
    │   │   │   └── presentation/
    │   │   │       ├── pages/
    │   │   │       ├── widgets/
    │   │   │       └── providers/
    │   │   │
    │   │   ├── home/
    │   │   ├── books/
    │   │   ├── cart/
    │   │   ├── orders/
    │   │   ├── library/
    │   │   ├── favorites/
    │   │   ├── forum/
    │   │   ├── chat/
    │   │   └── settings/
    │   │
    │   └── services/            # External services
    │       ├── notification/
    │       │   └── firebase_notification_service.dart
    │       │
    │       └── analytics/
    │           └── analytics_service.dart
    │
    ├── ios/
    ├── android/
    ├── test/
    ├── pubspec.yaml
    └── analysis_options.yaml
```

## 🎯 Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Flutter | 3.x |
| Language | Dart | 3.x |
| State | Riverpod | 2.x |
| Navigation | GoRouter | Latest |
| HTTP Client | Dio | 5.x |
| Local Storage | Hive | 2.x |
| Push Notification | Firebase Cloud Messaging | Latest |
| PDF Viewer | flutter_pdfview | Latest |
| Image Caching | cached_network_image | Latest |
| Form Validation | Freezed + JsonSerializable | Latest |

## 🚀 Getting Started

```bash
# Install dependencies
flutter pub get

# Run on Android
flutter run -d android

# Run on iOS (macOS only)
flutter run -d ios

# Build APK
flutter build apk --debug

# Build release APK
flutter build apk --release

# Build iOS (macOS only)
flutter build ios --release
```

## 📦 Key Files

### API Client

```dart
// lib/core/network/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: EnvConfig.apiUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(ApiInterceptor(_storage, _dio));
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) => _dio.get(path, queryParameters: queryParameters);

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
  }) => _dio.post(path, data: data);

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
  }) => _dio.put(path, data: data);

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
  }) => _dio.patch(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete(path);
}

class ApiInterceptor extends Interceptor {
  final SecureStorage _storage;
  final Dio _dio;

  ApiInterceptor(this._storage, this._dio);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Handle token refresh
      _handleAuthError();
    }
    handler.next(err);
  }
}
```

### Riverpod Providers

```dart
// lib/features/auth/presentation/providers/auth_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';

// Repository provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl();
});

// State provider
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthState {
  final User? user;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final user = await _repository.login(email, password);
      state = AuthState(user: user, isAuthenticated: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState();
  }
}
```

### Books Feature

```dart
// lib/features/books/data/datasources/books_remote_datasource.dart
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/book_model.dart';

class BooksRemoteDataSource {
  final ApiClient _client;

  BooksRemoteDataSource(this._client);

  Future<List<BookModel>> getBooks({
    int page = 1,
    int limit = 20,
    String? search,
    String? category,
    String? format,
  }) async {
    final response = await _client.get(
      '/books',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (search != null) 'search': search,
        if (category != null) 'category': category,
        if (format != null) 'format': format,
      },
    );
    
    return (response.data['data'] as List)
        .map((json) => BookModel.fromJson(json))
        .toList();
  }

  Future<BookModel> getBookBySlug(String slug) async {
    final response = await _client.get('/books/slug/$slug');
    return BookModel.fromJson(response.data['data']);
  }
}
```

### Navigation

```dart
// lib/app/router.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/home/presentation/pages/home_page.dart';
import '../features/books/presentation/pages/books_page.dart';
import '../features/books/presentation/pages/book_detail_page.dart';
import '../features/cart/presentation/pages/cart_page.dart';
import '../features/auth/presentation/pages/login_page.dart';
import '../shared/widgets/main_scaffold.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final router = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    // Auth routes
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginPage(),
    ),

    // Main app with bottom navigation
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomePage(),
          ),
        ),
        GoRoute(
          path: '/books',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: BooksPage(),
          ),
          routes: [
            GoRoute(
              path: ':slug',
              parentNavigatorKey: _rootNavigatorKey,
              builder: (context, state) => BookDetailPage(
                slug: state.pathParameters['slug']!,
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/cart',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: CartPage(),
          ),
        ),
        GoRoute(
          path: '/library',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: LibraryPage(),
          ),
        ),
        GoRoute(
          path: '/profile',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ProfilePage(),
          ),
        ),
      ],
    ),
  ],
);
```

### Local Storage

```dart
// lib/core/storage/hive_config.dart
import 'package:hive_flutter/hive_flutter.dart';
import '../../features/library/data/models/library_entry_model.dart';
import '../../features/favorites/data/models/favorite_model.dart';

class HiveConfig {
  static const String libraryBox = 'library';
  static const String favoritesBox = 'favorites';
  static const String progressBox = 'reading_progress';
  static const String settingsBox = 'settings';

  static Future<void> init() async {
    await Hive.initFlutter();

    // Register adapters
    Hive.registerAdapter(LibraryEntryModelAdapter());
    Hive.registerAdapter(FavoriteModelAdapter());

    // Open boxes
    await Hive.openBox<LibraryEntryModel>(libraryBox);
    await Hive.openBox<FavoriteModel>(favoritesBox);
    await Hive.openBox(progressBox);
    await Hive.openBox(settingsBox);
  }

  static Box<LibraryEntryModel> get libraryBoxInstance =>
      Hive.box<LibraryEntryModel>(libraryBox);

  static Box<FavoriteModel> get favoritesBoxInstance =>
      Hive.box<FavoriteModel>(favoritesBox);

  static Box get progressBoxInstance => Hive.box(progressBox);
}
```

## 📱 Mobile-Specific Features

### Push Notifications

```dart
// lib/services/notification/firebase_notification_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get FCM token
    final token = await _messaging.getToken();
    // Send to backend

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_showLocalNotification);

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
  }

  void _showLocalNotification(RemoteMessage message) {
    _local.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'huki_channel',
          'HUKI Notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }
}
```

### Offline Support

```dart
// lib/features/library/data/datasources/library_local_datasource.dart
import 'package:hive_flutter/hive_flutter.dart';
import '../models/library_entry_model.dart';

class LibraryLocalDataSource {
  final Box<LibraryEntryModel> _box;

  LibraryLocalDataSource() : _box = Hive.box<LibraryEntryModel>('library');

  Future<List<LibraryEntryModel>> getLocalLibrary() async {
    return _box.values.toList();
  }

  Future<void> saveLibraryEntry(LibraryEntryModel entry) async {
    await _box.put(entry.bookId, entry);
  }

  Future<void> syncWithServer(List<LibraryEntryModel> serverEntries) async {
    for (final entry in serverEntries) {
      await _box.put(entry.bookId, entry);
    }
  }
}
```

## 🔧 Environment Configuration

```dart
// lib/core/config/env.dart
class EnvConfig {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:3006',
  );

  static const bool enableFirebase = bool.fromEnvironment(
    'ENABLE_FIREBASE',
    defaultValue: false,
  );
}
```

Build với environment:
```bash
flutter build apk --dart-define=API_URL=https://api.huki-ebook.com/api
```

## 📱 Responsive Design

```dart
// lib/shared/theme/app_theme.dart
class AppBreakpoints {
  static const double mobile = 320;
  static const double tablet = 768;
  static const double desktop = 1024;
}

class ResponsiveBuilder extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  const ResponsiveBuilder({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= AppBreakpoints.desktop) {
          return desktop ?? tablet ?? mobile;
        }
        if (constraints.maxWidth >= AppBreakpoints.tablet) {
          return tablet ?? mobile;
        }
        return mobile;
      },
    );
  }
}
```
