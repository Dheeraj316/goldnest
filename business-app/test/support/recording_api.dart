import 'dart:convert';
import 'dart:typed_data';

import 'package:business_app/core/network/api_client.dart';
import 'package:business_app/core/storage/secure_session_storage.dart';
import 'package:dio/dio.dart';

/// A canned reply for one request.
class FakeReply {
  const FakeReply(this.body, {this.status = 200});
  final Object? body;
  final int status;
}

/// Stands in for the network: records every request Dio would have sent (method, path, query, body) and
/// answers from [handler]. Nothing here touches a socket, so it is safe on any machine.
class RecordingAdapter implements HttpClientAdapter {
  RecordingAdapter(this.handler);

  final FakeReply Function(RequestOptions options) handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final reply = handler(options);
    return ResponseBody.fromString(
      jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Session storage that never touches the platform keystore.
class FakeSessionStorage extends SecureSessionStorage {
  @override
  Future<String?> get accessToken async => 'test-access-token';

  @override
  Future<String?> get refreshToken async => null;

  @override
  Future<void> clearTokens() async {}
}

/// A real [ApiClient] (so `guard` and the auth interceptor run exactly as in production) whose Dio talks to
/// [adapter] instead of the network.
ApiClient apiClientWith(RecordingAdapter adapter) {
  final client = ApiClient(storage: FakeSessionStorage());
  client.raw.httpClientAdapter = adapter;
  return client;
}
