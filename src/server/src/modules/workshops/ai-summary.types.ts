export interface AiSummaryJobData {
  workshopId: string;
  pdfUrl: string;
  detailSnapshot: string;
  id?: string;
  attempts?: number;
  runAt?: number;
}
