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
