import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:school_camera/app/theme.dart';

class TimelineDatePicker extends StatelessWidget {
  const TimelineDatePicker({
    required this.selectedDate,
    required this.onDateSelected,
    this.retentionDays = 14,
    super.key,
  });

  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;
  final int retentionDays;

  @override
  Widget build(BuildContext context) {
    final today = _dateOnly(DateTime.now());
    final chips = List.generate(retentionDays, (i) {
      return today.subtract(Duration(days: retentionDays - 1 - i));
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Choose a date',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            TextButton.icon(
              onPressed: () => _pickDate(context, today),
              icon: const Icon(Icons.calendar_month),
              label: const Text('Calendar'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: chips.length,
            separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
            itemBuilder: (context, index) {
              final date = chips[index];
              final selected = _isSameDay(date, selectedDate);
              final label = _isSameDay(date, today)
                  ? 'Today'
                  : DateFormat('EEE d').format(date);
              return ChoiceChip(
                label: Text(label),
                selected: selected,
                onSelected: (_) => onDateSelected(date),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context, DateTime today) async {
    final first = today.subtract(Duration(days: retentionDays - 1));
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: first,
      lastDate: today,
    );
    if (picked != null) onDateSelected(_dateOnly(picked));
  }

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
