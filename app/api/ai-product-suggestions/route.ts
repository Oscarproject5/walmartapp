import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withUserAuth } from '../../lib/api-helpers';

// Configure OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1', // Set OpenRouter base URL
  apiKey: process.env.OPENROUTER_API_KEY, // Use OpenRouter API key
  defaultHeaders: { // Optional: OpenRouter might suggest specific headers
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000', // Use env var or default
    'X-Title': process.env.APP_NAME || 'WalmartApp', // Use env var or default
  },
});

// Updated interface to include optional trend fields
interface ProductPerformanceData {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  order_count: number;
  total_revenue: number;
  total_profit: number;
  last_sale_date: string;
  avg_quantity_per_order: number;
  avg_revenue: number;
  profit_margin: number;
  // Optional trend data
  profit_margin_trend?: number;
  quantity_trend?: number;
}

// Wrap the handler with user auth middleware
export const POST = withUserAuth(async (request: NextRequest, { userId }) => {
  try {
    const { products }: { products: ProductPerformanceData[] } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No product data provided' }, { status: 400 });
    }

    // --- Prompt Engineering --- 
    // Include trend data in the summary if available
    const productSummary = products
      .map(p => {
        let summary = `- Product: ${p.name} (SKU: ${p.sku}), ` +
                      `Margin: ${p.profit_margin.toFixed(1)}%, ` +
                      `Units Sold: ${p.quantity_sold}, ` +
                      `Total Profit: $${p.total_profit.toFixed(2)}`;
                      
        if (p.profit_margin_trend !== undefined) {
          summary += `, Margin Trend: ${p.profit_margin_trend >= 0 ? '+' : ''}${p.profit_margin_trend.toFixed(1)}%`;
        }
        if (p.quantity_trend !== undefined) {
          summary += `, Sales Trend: ${p.quantity_trend >= 0 ? '+' : ''}${p.quantity_trend.toFixed(1)}%`;
        }
        return summary;
      })
      .join('\n');

    const systemPrompt = `You are an expert e-commerce analyst advising a Walmart seller. Your goal is to identify products needing attention to improve overall profitability, considering both current performance and recent trends.

Analyze the following product performance data. The data includes current profit margin, units sold, total profit, and recent trends (percentage change compared to the previous period) for profit margin and sales volume.

For each recommended product, follow this EXACT format:
1. **Product: [Product Name] (SKU: [Product SKU])**
   **Action:** [One of: "Discontinue", "Increase Price by X%", "Review Shipping Costs", "Review COGS", "Monitor Performance"]
   **Reasoning:** [Brief explanation incorporating current metrics AND trend data (e.g., "declining margin", "falling sales")]

Provide recommendations for 3-5 products. Focus on items with low/negative margins, low sales, OR significant negative trends (especially declining margins). Also suggest "Monitor Performance" for products that are currently okay but show worrying trends. Prioritize actions with the largest potential impact.`;

    const userPrompt = `Product Performance Data (Current Period with Trends vs Previous Period):
${productSummary}

Based on this data, including the recent trends, provide your top 3-5 recommendations to improve or maintain profit margins using the required format. Pay close attention to declining trends.`;

    // Switch to a model known for stronger reasoning
    const modelToUse = 'deepseek/deepseek-chat-v3-0324'; 

    console.log(`[AI Suggestions API] User ${userId} sending request to OpenRouter (${modelToUse}) with trend data...`);
    const completion = await openai.chat.completions.create({
      model: modelToUse, 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, 
      max_tokens: 300, // Increased slightly to accommodate trend reasoning
    });

    const suggestion = completion.choices[0]?.message?.content;
    console.log(`[AI Suggestions API] User ${userId} received suggestion from OpenRouter (with trends):`, suggestion);

    if (!suggestion) {
      throw new Error('No suggestion received from AI');
    }

    // Store the suggestion in database with user_id
    const { supabase } = await getUserIdAndClient();
    await supabase.from('ai_recommendations').insert({
      recommendation_type: 'product_performance',
      recommendation_text: suggestion,
      is_applied: false,
      user_id: userId
    });

    return NextResponse.json({ suggestion });

  } catch (error: any) {
    console.error('[AI Suggestions API] Error:', error);
    // Avoid leaking sensitive error details to the client
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    // Check for specific OpenRouter error structures if necessary
    return NextResponse.json({ error: 'Failed to get AI suggestions via OpenRouter', details: errorMessage }, { status: 500 });
  }
});

// Import this to access the database
import { getUserIdAndClient } from '../../lib/api-helpers'; 