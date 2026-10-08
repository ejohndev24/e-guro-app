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

export const MY_SCHOOL_PROFILE_QUERY = gql`
  query MySchoolProfile {
    mySchoolProfile {
      name
      schoolIdNumber
      region
      division
      district
      address
      schoolHeadName
    }
  }
`;
export const UPDATE_MY_SCHOOL_PROFILE_MUTATION = gql`
  mutation UpdateMySchoolProfile($input: UpdateSchoolProfileInput!) {
    updateMySchoolProfile(input: $input) {
      name
      schoolIdNumber
      region
      division
      district
      address
      schoolHeadName
    }
  }
`;
