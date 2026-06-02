import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId } = await req.json();

    if (!patientId) {
      return Response.json({ error: 'patientId is required' }, { status: 400 });
    }

    // Get patient data
    const patient = await base44.asServiceRole.entities.Patient.list();
    const patientData = patient.find(p => p.id === patientId);

    if (!patientData) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get 6 months of usage logs for this patient
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const usageLogs = await base44.asServiceRole.entities.SupplyUsageLog.filter({
      patient_id: patientId,
      usage_date: { $gte: sixMonthsAgoStr }
    });

    // Get all supplies
    const allSupplies = await base44.asServiceRole.entities.SupplyItem.list();

    // Group usage by supply
    const usageBySupply = {};
    usageLogs.forEach(log => {
      if (!usageBySupply[log.supply_id]) {
        usageBySupply[log.supply_id] = [];
      }
      usageBySupply[log.supply_id].push({
        date: log.usage_date,
        quantity: log.quantity_used
      });
    });

    // Generate predictions for each supply
    const predictions = [];
    const now = new Date();

    for (const supplyId in usageBySupply) {
      const supply = allSupplies.find(s => s.id === supplyId);
      if (!supply) continue;

      const usageData = usageBySupply[supplyId];
      if (usageData.length < 2) continue; // Need at least 2 data points

      // Calculate monthly usage
      const monthlyUsage = {};
      usageData.forEach(u => {
        const date = new Date(u.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyUsage[monthKey] = (monthlyUsage[monthKey] || 0) + u.quantity;
      });

      const months = Object.keys(monthlyUsage).sort();
      const quantities = months.map(m => monthlyUsage[m]);

      // Calculate trend
      const avgUsage = quantities.reduce((a, b) => a + b, 0) / quantities.length;
      const recentAvg = quantities.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, quantities.length);
      
      let trend = 'stable';
      if (recentAvg > avgUsage * 1.2) trend = 'increasing';
      else if (recentAvg < avgUsage * 0.8) trend = 'decreasing';

      // Calculate confidence (based on data consistency)
      const variance = quantities.reduce((sum, q) => sum + Math.pow(q - avgUsage, 2), 0) / quantities.length;
      const stdDev = Math.sqrt(variance);
      const coeffVar = (stdDev / avgUsage) * 100;
      const confidence = Math.max(50, Math.min(95, 100 - (coeffVar / 2)));

      // Predict next order date
      const predictedMonthlyUsage = trend === 'increasing' ? recentAvg : trend === 'decreasing' ? Math.max(avgUsage * 0.8, recentAvg) : avgUsage;
      const daysUntilReorder = Math.ceil((supply.current_quantity - supply.low_stock_threshold) / (predictedMonthlyUsage / 30));
      const nextOrderDate = new Date(now);
      nextOrderDate.setDate(nextOrderDate.getDate() + daysUntilReorder);

      // Recommended 3-month supply
      const recommendedQty = Math.ceil(predictedMonthlyUsage * 3);

      const prediction = {
        patient_id: patientId,
        supply_id: supplyId,
        supply_name: supply.name,
        predicted_monthly_usage: Math.round(predictedMonthlyUsage * 10) / 10,
        confidence_score: Math.round(confidence),
        usage_trend: trend,
        predicted_next_order_date: nextOrderDate.toISOString().split('T')[0],
        recommended_quantity: recommendedQty,
        current_inventory: supply.current_quantity,
        estimated_days_until_reorder_needed: daysUntilReorder,
        analysis_data: {
          monthly_breakdown: monthlyUsage,
          data_points: quantities.length,
          months_analyzed: months,
          trend_analysis: {
            avg_usage: Math.round(avgUsage * 10) / 10,
            recent_avg: Math.round(recentAvg * 10) / 10,
            std_deviation: Math.round(stdDev * 10) / 10
          }
        },
        generated_date: new Date().toISOString()
      };

      // Save prediction
      await base44.asServiceRole.entities.SupplyPrediction.create(prediction);
      predictions.push(prediction);
    }

    return Response.json({
      success: true,
      patient_id: patientId,
      predictions_generated: predictions.length,
      predictions: predictions.sort((a, b) => a.estimated_days_until_reorder_needed - b.estimated_days_until_reorder_needed)
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});