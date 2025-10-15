// Utility functions for logging trip activities

export interface ActivityLogData {
  tripId: string;
  userId: string;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  trip_id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  user: {
    name: string;
  };
}

// Log an activity to the database
export async function logActivity(data: ActivityLogData): Promise<ActivityLog | null> {
  try {
    const response = await fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text());
      return null;
    }

    const result = await response.json();
    return result.log;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

// Fetch activity logs for a trip
export async function fetchActivityLogs(
  tripId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<ActivityLog[]> {
  try {
    const response = await fetch(
      `/api/activity-logs?tripId=${tripId}&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      console.error('Failed to fetch activity logs:', await response.text());
      return [];
    }

    const result = await response.json();
    return result.logs || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

// Clear all activity logs for a trip (owner only)
export async function clearActivityHistory(tripId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/activity-logs?tripId=${tripId}&userId=${userId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      console.error('Failed to clear activity history:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing activity history:', error);
    return false;
  }
}

// Helper functions to create common activity log entries
export const ActivityLogger = {
  // Activity-related logs
  activityAdded: (tripId: string, userId: string, activityTitle: string, dayNumber: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'activity_added',
      title: 'Added activity to itinerary',
      description: `Added "${activityTitle}" to day ${dayNumber}`,
      metadata: { activityTitle, dayNumber }
    }),

  activityEdited: (tripId: string, userId: string, activityTitle: string, dayNumber: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'activity_edited',
      title: 'Edited activity',
      description: `Edited "${activityTitle}" on day ${dayNumber}`,
      metadata: { activityTitle, dayNumber }
    }),

  activityDeleted: (tripId: string, userId: string, activityTitle: string, dayNumber: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'activity_deleted',
      title: 'Deleted activity',
      description: `Deleted "${activityTitle}" from day ${dayNumber}`,
      metadata: { activityTitle, dayNumber }
    }),

  activityMoved: (tripId: string, userId: string, activityTitle: string, fromDay: number, toDay: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'activity_moved',
      title: 'Moved activity',
      description: `Moved "${activityTitle}" from day ${fromDay} to day ${toDay}`,
      metadata: { activityTitle, fromDay, toDay }
    }),

  // Idea-related logs
  ideaAdded: (tripId: string, userId: string, ideaTitle: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'idea_added',
      title: 'Added idea',
      description: `Added "${ideaTitle}" to idea board`,
      metadata: { ideaTitle }
    }),

  ideaEdited: (tripId: string, userId: string, ideaTitle: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'idea_edited',
      title: 'Edited idea',
      description: `Edited "${ideaTitle}" in idea board`,
      metadata: { ideaTitle }
    }),

  ideaDeleted: (tripId: string, userId: string, ideaTitle: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'idea_deleted',
      title: 'Deleted idea',
      description: `Deleted "${ideaTitle}" from idea board`,
      metadata: { ideaTitle }
    }),

  // Gallery-related logs
  galleryUploaded: (tripId: string, userId: string, fileCount: number, dayNumber?: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'gallery_uploaded',
      title: 'Uploaded images',
      description: dayNumber 
        ? `Uploaded ${fileCount} image${fileCount > 1 ? 's' : ''} to day ${dayNumber} gallery`
        : `Uploaded ${fileCount} image${fileCount > 1 ? 's' : ''} to gallery`,
      metadata: { fileCount, dayNumber }
    }),

  // Expense-related logs
  expenseAdded: (tripId: string, userId: string, expenseTitle: string, amount: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'expense_added',
      title: 'Added expense',
      description: `Added "${expenseTitle}" for $${amount}`,
      metadata: { expenseTitle, amount }
    }),

  expenseEdited: (tripId: string, userId: string, expenseTitle: string, amount: number) =>
    logActivity({
      tripId,
      userId,
      activityType: 'expense_edited',
      title: 'Edited expense',
      description: `Edited "${expenseTitle}" for $${amount}`,
      metadata: { expenseTitle, amount }
    }),

  expenseDeleted: (tripId: string, userId: string, expenseTitle: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'expense_deleted',
      title: 'Deleted expense',
      description: `Deleted "${expenseTitle}"`,
      metadata: { expenseTitle }
    }),

  expenseSettled: (tripId: string, userId: string, amount: number, description?: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'expense_settled',
      title: 'Settled expense',
      description: description || `Settled expense of $${amount}`,
      metadata: { amount, description }
    }),

  // Trip-related logs
  tripUpdated: (tripId: string, userId: string, field: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'trip_updated',
      title: 'Updated trip',
      description: `Updated trip ${field}`,
      metadata: { field }
    }),

  collaboratorAdded: (tripId: string, userId: string, collaboratorName: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'collaborator_added',
      title: 'Added collaborator',
      description: `Added ${collaboratorName} as collaborator`,
      metadata: { collaboratorName }
    }),

  collaboratorRemoved: (tripId: string, userId: string, collaboratorName: string) =>
    logActivity({
      tripId,
      userId,
      activityType: 'collaborator_removed',
      title: 'Removed collaborator',
      description: `Removed ${collaboratorName} from collaborators`,
      metadata: { collaboratorName }
    }),
};
