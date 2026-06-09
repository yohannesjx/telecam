import 'package:intl/intl.dart';

/// Display formatters for parent-facing UI.
class AppFormatters {
  AppFormatters._();

  static final DateFormat _dateTime = DateFormat('MMM d, yyyy · h:mm a');
  static final DateFormat _date = DateFormat('MMM d, yyyy');
  static final DateFormat _time = DateFormat('h:mm a');

  static String dateTime(DateTime value) => _dateTime.format(value.toLocal());

  static String date(DateTime value) => _date.format(value.toLocal());

  static String time(DateTime value) => _time.format(value.toLocal());
}
