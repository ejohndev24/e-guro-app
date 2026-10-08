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
import { STUDENT_FIELDS } from "@/features/students/graphql/fragments/studentFields";

export const REPORTS_QUERY = gql`
  ${CLASS_FIELDS}
  ${STUDENT_FIELDS}
  query Reports($quarter: Int!) {
    dashboard(quarter: $quarter) {
      stats {
        classCount
        studentCount
        attendanceRate
        pendingGrades
        averageGrade
      }
      atRisk {
        student {
          ...StudentFields
        }
        classroom {
          ...ClassFields
        }
        currentGrade
      }
      gradeReports {
        classroom {
          ...ClassFields
        }
        averageGrade
        gradedStudents
        studentCount
        passingStudents
      }
    }
  }
`;
