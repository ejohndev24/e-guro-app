import { gql } from '@apollo/client';
import { CLASS_FIELDS } from '../fragments/classFields';

export const CLASSES_QUERY = gql`
  ${CLASS_FIELDS}
  query Classes { classes { ...ClassFields } }
`;
