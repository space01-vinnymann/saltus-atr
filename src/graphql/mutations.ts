import { gql } from "@apollo/client";

export const CALCULATE_RISK = gql`
  mutation CalculateRisk($responses: [Response]) {
    calculateRisk(responses: $responses) {
      rating
    }
  }
`;

export const GENERATE_PDF = gql`
  mutation GenerateRiskResultPDF($input: RiskResultPDFInput) {
    generateRiskResultPDF(input: $input) {
      url
    }
  }
`;
