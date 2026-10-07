import { gql } from '@apollo/client';

export const CREATE_ASSESSMENT_MUTATION = gql`
  mutation CreateAssessment($input: CreateAssessmentInput!) {
    createAssessment(input: $input) { schemeName }
  }
`;

export const SAVE_ASSESSMENT_SCORES_MUTATION = gql`
  mutation SaveAssessmentScores($input: SaveAssessmentScoresInput!) {
    saveAssessmentScores(input: $input) { count }
  }
`;

export const SAVE_GRADEBOOK_SCORES_MUTATION = gql`
  mutation SaveGradebookScores($input: SaveGradebookScoresInput!) {
    saveGradebookScores(input: $input) { count }
  }
`;

export const CONFIGURE_CLASS_GRADING_MUTATION = gql`
  mutation ConfigureClassGrading($input: ConfigureClassGradingInput!) {
    configureClassGrading(input: $input) { schemeName }
  }
`;
