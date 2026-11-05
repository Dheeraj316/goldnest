import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum LogoVariant { dark, light }

/// Same "nest cradling an egg" mark as the web apps (see
/// public-website/src/components/Logo.tsx) — a gold ellipse over a curved
/// arc, redrawn with CustomPainter since Flutter can't import the web SVG
/// directly.
class GoldnestLogo extends StatelessWidget {
  const GoldnestLogo({super.key, this.variant = LogoVariant.dark, this.size = 32});

  final LogoVariant variant;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _NestEggPainter()),
    );
  }
}

class _NestEggPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / 34;
    final scaleY = size.height / 34;

    final archPaint = Paint()
      ..color = AppColors.gold500
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4 * scaleY
      ..strokeCap = StrokeCap.round;

    final archPath = Path()
      ..moveTo(4 * scaleX, 21 * scaleY)
      ..cubicTo(4 * scaleX, 21 * scaleY, 8 * scaleX, 25 * scaleY, 17 * scaleX, 25 * scaleY)
      ..cubicTo(26 * scaleX, 25 * scaleY, 30 * scaleX, 21 * scaleY, 30 * scaleX, 21 * scaleY);
    canvas.drawPath(archPath, archPaint);

    final eggRect = Rect.fromCenter(center: Offset(17 * scaleX, 15 * scaleY), width: 17 * scaleX, height: 21 * scaleY);
    final eggPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [AppColors.gold100, AppColors.gold400, AppColors.gold600],
        stops: const [0, 0.45, 1],
      ).createShader(eggRect);
    canvas.drawOval(eggRect, eggPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
