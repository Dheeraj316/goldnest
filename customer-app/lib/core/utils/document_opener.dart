import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../network/api_exception.dart';

/// Asks the backend for a short-lived download link, then opens it in the
/// system browser / PDF viewer. The link is only valid for a couple of minutes
/// and names exactly one document, so it is never stored or shared — every tap
/// mints a fresh one (which also records the download in the audit trail).
Future<void> openDocument(BuildContext context, Future<Uri> Function() createLink) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final uri = await createLink();
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened) messenger.showSnackBar(const SnackBar(content: Text('Could not open the document on this device.')));
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  } catch (_) {
    messenger.showSnackBar(const SnackBar(content: Text('Could not open the document. Please try again.')));
  }
}
