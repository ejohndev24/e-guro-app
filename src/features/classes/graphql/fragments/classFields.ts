import { gql } from '@apollo/client';

export const CLASS_FIELDS = gql`
  fragment ClassFields on Classroom {
    id gradeLevel section subject room scheduleDay startTime endTime schoolYear term studentCount displayName educationLevel isAdvisory
  }
`;
