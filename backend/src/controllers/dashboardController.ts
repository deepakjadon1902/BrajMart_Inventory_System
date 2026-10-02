import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService.js';

export class DashboardController {
  public async getSummary(_req: Request, res: Response) {
    const summary = await dashboardService.getSummary();
    res.json({
      success: true,
      data: summary,
    });
  }

  public async getRecentActivity(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const activity = await dashboardService.getRecentActivity(limit);
    res.json({
      success: true,
      data: activity,
    });
  }

  public async getCategoryBreakdown(_req: Request, res: Response) {
    const breakdown = await dashboardService.getCategoryBreakdown();
    res.json({
      success: true,
      data: breakdown,
    });
  }
}

export const dashboardController = new DashboardController();
