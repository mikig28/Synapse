# WhatsApp Summary Scheduler

The WhatsApp monitor now supports automated daily summaries that run on a schedule.

## UI usage
- Open `Analytics -> WhatsApp Monitor -> Daily Summaries`.
- Use the "New schedule" button to configure a recurring summary.
- Pick the groups to include, set the local run time and timezone, and decide whether AI insights, keyword highlights, or emoji stats should be included.
- Existing schedules appear in the accordion with next-run, last-run and history details. Actions allow you to run immediately, pause/resume, edit, or delete.

## API reference
- `POST /api/v1/whatsapp-summary/schedules` creates a schedule.
- `GET /api/v1/whatsapp-summary/schedules` lists schedules for the authenticated user.
- `PUT /api/v1/whatsapp-summary/schedules/:id` updates schedule settings.
- `PATCH /api/v1/whatsapp-summary/schedules/:id/toggle` pauses or resumes a schedule.
- `POST /api/v1/whatsapp-summary/schedules/:id/run` triggers a manual execution.
- `GET /api/v1/whatsapp-summary/schedules/:id/history` returns recent run metadata.

All endpoints require authentication and respond with the standard `{ success, data, error }` wrapper.

## Environment configuration
- `WHATSAPP_SUMMARY_SCHEDULER_ENABLED` (default `true`): set to `false` to disable automatic processing when the server boots.

Each summary run stores metadata in `WhatsAppSummarySchedule.history` and links generated digests through the `scheduleId` field on `WhatsAppGroupSummary`.
