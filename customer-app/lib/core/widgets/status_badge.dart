import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Same status-to-colour mapping as the admin console's StatusBadge (see
/// admin-web/src/components/StatusBadge.tsx) — kept visually consistent
/// across every Goldnest surface.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  static const _tones = <String, (Color, Color)>{
    'ACTIVE': (Color(0xFFECFDF5), AppColors.emerald500),
    'VERIFIED': (Color(0xFFECFDF5), AppColors.emerald500),
    'APPROVED': (Color(0xFFECFDF5), AppColors.emerald500),
    'INACTIVE': (Color(0xFFF3F4F6), Color(0xFF4B5563)),
    'SUSPENDED': (Color(0xFFFDF2F4), AppColors.rose500),
    'REJECTED': (Color(0xFFFDF2F4), AppColors.rose500),
    'PENDING': (AppColors.gold50, AppColors.gold700),
    'IN_REVIEW': (AppColors.gold50, AppColors.gold700),
    'EXPIRED': (Color(0xFFF3F4F6), Color(0xFF4B5563)),
    // support tickets
    'OPEN': (AppColors.gold50, AppColors.gold700),
    'ASSIGNED': (AppColors.gold50, AppColors.gold700),
    'IN_PROGRESS': (Color(0xFFF0F9FF), Color(0xFF0369A1)),
    'WAITING_FOR_CUSTOMER': (Color(0xFFFFFBEB), Color(0xFFB45309)),
    'RESOLVED': (Color(0xFFECFDF5), AppColors.emerald500),
    'CLOSED': (Color(0xFFF3F4F6), Color(0xFF4B5563)),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _tones[status] ?? (const Color(0xFFF3F4F6), const Color(0xFF4B5563));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}
