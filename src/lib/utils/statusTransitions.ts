/**
 * Training Program Status Transition Validation
 *
 * Implements the valid status transition workflow for training programs.
 *
 * Valid Workflow:
 * upcoming → active → ongoing → completed
 *    ↓        ↓        ↓         ↓
 * cancelled  cancelled cancelled cancelled
 *    ↓        ↓        ↓         ↓
 * archived  archived  archived  archived
 */

export type TrainingProgramStatus = 'active' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'archived';

interface TransitionRule {
  allowedTransitions: TrainingProgramStatus[];
  description: string;
}

// Define valid transitions for each status
const statusTransitionRules: Record<TrainingProgramStatus, TransitionRule> = {
  upcoming: {
    allowedTransitions: ['active', 'cancelled'],
    description: 'Upcoming programs can be activated or cancelled'
  },
  active: {
    allowedTransitions: ['upcoming', 'ongoing', 'cancelled'],
    description: 'Active programs can be reverted to upcoming, begin (ongoing), or be cancelled'
  },
  ongoing: {
    allowedTransitions: ['active', 'completed', 'cancelled'],
    description: 'Ongoing programs can be reverted to active, completed, or cancelled'
  },
  completed: {
    allowedTransitions: ['archived'],
    description: 'Completed programs can only be archived'
  },
  cancelled: {
    allowedTransitions: ['archived'],
    description: 'Cancelled programs can only be archived'
  },
  archived: {
    allowedTransitions: ['active'],
    description: 'Archived programs can be restored to active status'
  }
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validate if a status transition is allowed
 *
 * @param currentStatus - The current status of the program
 * @param newStatus - The desired new status
 * @returns ValidationResult indicating if the transition is valid
 */
export function validateStatusTransition(
  currentStatus: TrainingProgramStatus,
  newStatus: TrainingProgramStatus
): ValidationResult {
  // If status hasn't changed, it's valid (no-op)
  if (currentStatus === newStatus) {
    return {
      isValid: true
    };
  }

  const rules = statusTransitionRules[currentStatus];

  // Check if the transition is allowed
  if (rules.allowedTransitions.includes(newStatus)) {
    return {
      isValid: true
    };
  }

  // Invalid transition - provide helpful error message
  const allowedList = rules.allowedTransitions.length > 0
    ? rules.allowedTransitions.join(', ')
    : 'none (final state)';

  return {
    isValid: false,
    error: `Cannot change status from "${currentStatus}" to "${newStatus}". ${rules.description}.`,
    suggestion: `Valid transitions from "${currentStatus}": ${allowedList}`
  };
}

/**
 * Get all valid transitions for a given status
 *
 * @param status - The current status
 * @returns Array of valid next statuses
 */
export function getValidTransitions(status: TrainingProgramStatus): TrainingProgramStatus[] {
  return statusTransitionRules[status].allowedTransitions;
}

/**
 * Check if a specific transition is allowed
 *
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @returns boolean indicating if the transition is valid
 */
export function isTransitionAllowed(
  currentStatus: TrainingProgramStatus,
  newStatus: TrainingProgramStatus
): boolean {
  return validateStatusTransition(currentStatus, newStatus).isValid;
}

/**
 * Get a human-readable description of valid transitions
 *
 * @param status - The current status
 * @returns Description of what transitions are allowed
 */
export function getTransitionDescription(status: TrainingProgramStatus): string {
  const rules = statusTransitionRules[status];
  const transitions = rules.allowedTransitions;

  if (transitions.length === 0) {
    return `This program is ${status} and cannot be changed (final state).`;
  }

  const transitionList = transitions.map(t => `"${t}"`).join(' or ');
  return `You can change this ${status} program to ${transitionList}.`;
}

/**
 * Validate if a status string is a valid program status
 *
 * @param status - The status string to validate
 * @returns boolean indicating if it's a valid status
 */
export function isValidProgramStatus(status: string): status is TrainingProgramStatus {
  const validStatuses: TrainingProgramStatus[] = ['active', 'upcoming', 'ongoing', 'completed', 'cancelled', 'archived'];
  return validStatuses.includes(status as TrainingProgramStatus);
}
