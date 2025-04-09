import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configure OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1', // Set OpenRouter base URL
  apiKey: process.env.OPENROUTER_API_KEY, // Use OpenRouter API key
  defaultHeaders: { // Optional: OpenRouter might suggest specific headers
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000', // Use env var or default
    'X-Title': process.env.APP_NAME || 'WalmartApp', // Use env var or default
  },
});

// Interface for product performance data
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

export async function POST(request: NextRequest) {
  try {
    const { products }: { products: ProductPerformanceData[] } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No product data provided' }, { status: 400 });
    }

    // Find the 10 worst-performing products based on multiple metrics
    // Sort products by profit margin (ascending), then by total profit (ascending)
    // This gives us products with the lowest/negative margins and lowest profits
    const sortedProducts = [...products].sort((a, b) => {
      // First, prioritize negative profit margins
      if (a.profit_margin < 0 && b.profit_margin >= 0) return -1;
      if (b.profit_margin < 0 && a.profit_margin >= 0) return 1;
      
      // Then sort by profit margin
      if (a.profit_margin !== b.profit_margin) 
        return a.profit_margin - b.profit_margin;
      
      // If profit margins are equal, sort by total profit
      return a.total_profit - b.total_profit;
    });

    // Get the 10 worst-performing products (or all if less than 10)
    const worstProducts = sortedProducts.slice(0, Math.min(10, sortedProducts.length));
    
    // Create summaries for all worst products
    const productSummaries = worstProducts.map(product => `
Product: ${product.name} (SKU: ${product.sku})
Profit Margin: ${product.profit_margin.toFixed(1)}%
Total Revenue: $${product.total_revenue.toFixed(2)}
Total Profit: $${product.total_profit.toFixed(2)}
Quantity Sold: ${product.quantity_sold}
Orders: ${product.order_count}
Average Quantity Per Order: ${product.avg_quantity_per_order.toFixed(2)}
Last Sale Date: ${product.last_sale_date}
${product.profit_margin_trend !== undefined ? `Profit Margin Trend: ${product.profit_margin_trend >= 0 ? '+' : ''}${product.profit_margin_trend.toFixed(1)}%` : ''}
${product.quantity_trend !== undefined ? `Sales Trend: ${product.quantity_trend >= 0 ? '+' : ''}${product.quantity_trend.toFixed(1)}%` : ''}
`).join('\n---\n');

    const systemPrompt = `You are an expert e-commerce analyst helping a Walmart seller maximize profits. Your task is to identify issues with their worst-performing products and create specific, actionable plans to either improve performance or discontinue them strategically.

I will provide you with data for the 10 worst-performing products. For EACH product, you must create a separate action plan following this EXACT format:

Action Plan for Worst-Performing Product: [Product Name]

Step 1 - Current Issues:
- [Clearly list 2-3 specific issues causing poor performance]

Step 2 - Short-term Pricing Strategy:
- [Provide 1-2 detailed price adjustments to temporarily increase profit margins or accelerate sales]

Step 3 - Shipping Optimization:
- [List 1-2 specific shipping-related strategies to maximize profitability (e.g., adjusting shipping fees, bundling, promoting expedited shipping)]

Step 4 - Additional Recommendations (Optional):
- [Suggest 1 potential improvement such as better marketing, product listings, or bundling to increase appeal]

Step 5 - Discontinuation Strategy:
- Timeline: [Define a clear timeline, e.g., 30-60 days]
- Criteria for discontinuation: [Explicit criteria to decide when to discontinue based on sales and profitability after adjustments]
- Liquidation method: [Specific method of final inventory liquidation (clearance, discounts, bundle sales, etc.)]

After you create an action plan for each product, add a heading at the end called "Summary of Key Insights" with 3-5 bullet points of patterns or commonalities you observed across the problematic products.`;

    const userPrompt = `Here is detailed information about the 10 worst-performing products in the inventory:

${productSummaries}

Create a comprehensive action plan with concrete steps for EACH of these specific products following the required format. Base your analysis on the performance metrics provided. Ensure your response is formatted as a document that can be easily saved and shared with the team.`;

    // Use a strong LLM model for detailed analysis
    const modelToUse = 'deepseek/deepseek-chat-v3-0324'; 

    console.log(`[Worst Product Plan API] Sending request to OpenRouter (${modelToUse})...`);
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4, // Lower temperature for more consistent outputs
      max_tokens: 4000, // Allow more tokens for detailed plans for multiple products
    });

    const plan = completion.choices[0]?.message?.content;
    console.log('[Worst Product Plan API] Received multi-product plan from OpenRouter');

    if (!plan) {
      throw new Error('No plan received from AI');
    }

    return NextResponse.json({ 
      plan, 
      productDetails: worstProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        profitMargin: p.profit_margin,
        totalProfit: p.total_profit
      }))
    });

  } catch (error: any) {
    console.error('[Worst Product Plan API] Error:', error);
    // Avoid leaking sensitive error details to the client
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Failed to generate worst product plan', details: errorMessage }, { status: 500 });
  }
} 