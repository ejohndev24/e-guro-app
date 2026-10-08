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
import { CLASS_FIELDS } from "@/features/classes/graphql/fragments/classFields";

export const ATTENDANCE_CLASSES_QUERY = gql`
  ${CLASS_FIELDS}
  query AttendanceClasses {
    classes {
      ...ClassFields
    }
  }
`;
