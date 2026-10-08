/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import { gql } from "@apollo/client";

export const CREATE_ASSESSMENT_MUTATION = gql`
  mutation CreateAssessment($input: CreateAssessmentInput!) {
    createAssessment(input: $input) {
      schemeName
    }
  }
`;

export const SAVE_ASSESSMENT_SCORES_MUTATION = gql`
  mutation SaveAssessmentScores($input: SaveAssessmentScoresInput!) {
    saveAssessmentScores(input: $input) {
      count
    }
  }
`;

export const SAVE_GRADEBOOK_SCORES_MUTATION = gql`
  mutation SaveGradebookScores($input: SaveGradebookScoresInput!) {
    saveGradebookScores(input: $input) {
      count
    }
  }
`;

export const CONFIGURE_CLASS_GRADING_MUTATION = gql`
  mutation ConfigureClassGrading($input: ConfigureClassGradingInput!) {
    configureClassGrading(input: $input) {
      schemeName
    }
  }
`;
