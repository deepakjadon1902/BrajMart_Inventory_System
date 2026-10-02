import { Request, Response } from 'express';
import { reportService } from '../services/reportService.js';
import { smartReportService } from '../services/smartReportService.js';

export class ReportController {
  public async getInventoryValuation(req: Request, res: Response) {
    const report = await reportService.getInventoryValuationReport();

    if (req.query.format === 'csv') {
      const csv = reportService.generateValuationCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="brajmart-inventory-valuation-${Date.now()}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  }

  public async getLowStock(req: Request, res: Response) {
    const report = await reportService.getLowStockReport();

    if (req.query.format === 'csv') {
      const csv = reportService.generateValuationCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="brajmart-low-stock-${Date.now()}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  }

  public async getOutOfStock(req: Request, res: Response) {
    const report = await reportService.getOutOfStockReport();

    if (req.query.format === 'csv') {
      const csv = reportService.generateValuationCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="brajmart-out-of-stock-${Date.now()}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  }

  public async getMovements(req: Request, res: Response) {
    const { startDate, endDate, type, productId, format } = req.query;
    const report = await reportService.getStockMovementsReport({
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string,
      productId: productId as string,
    });

    if (format === 'csv') {
      const csv = reportService.generateMovementsCsv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="brajmart-stock-movements-${Date.now()}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  }

  public async getSmartReport(_req: Request, res: Response) {
    const report = await smartReportService.getSmartReport();
    res.json({
      success: true,
      data: report,
    });
  }
}

export const reportController = new ReportController();
