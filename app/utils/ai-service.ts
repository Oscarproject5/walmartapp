import { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type AIRecommendation = Database['public']['Tables']['ai_recommendations']['Row'];

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class AIService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private model = 'anthropic/claude-3-opus-20240229';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      throw error;
    }
  }

  async getDynamicPriceRecommendation(
    product: Product,
    currentPrice: number,
    salesHistory: Sale[],
    minimumProfitMargin: number
  ): Promise<AIRecommendation> {
    const prompt = `
      Analyze this product and recommend optimal pricing:
      - Product: ${product.name}
      - Current Price: $${currentPrice}
      - Cost: $${product.cost_per_item}
      - Minimum Profit Margin Required: ${minimumProfitMargin}%
      - Sales History: ${JSON.stringify(salesHistory)}
      
      Provide a structured response with:
      1. Recommended price
      2. Brief explanation
      3. Projected impact on profits
      4. Confidence score (0-100)
    `;

    const response = await this.callOpenRouter(prompt);
    
    // Parse AI response and format recommendation
    return {
      id: '',
      type: 'price_adjustment',
      product_id: product.id,
      recommendation: response,
      explanation: 'AI-recommended price adjustment based on market analysis',
      suggested_action: 'Update product price',
      impact_analysis: {
        current_profit: 0, // Calculate based on current price
        projected_profit: 0, // Parse from AI response
        confidence_score: 0, // Parse from AI response
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      implemented_at: null,
      user_id: product.user_id || '',
    };
  }

  async getProfitOptimizationRecommendations(
    products: Product[],
    salesHistory: Sale[]
  ): Promise<AIRecommendation[]> {
    const prompt = `
      Analyze these products and their sales history to identify optimization opportunities:
      Products: ${JSON.stringify(products)}
      Sales History: ${JSON.stringify(salesHistory)}
      
      Provide recommendations for:
      1. Products to reorder (high performers)
      2. Products to remove (poor performers)
      3. Pricing adjustments for better profitability
      
      Format each recommendation with:
      - Clear explanation
      - Expected impact
      - Confidence score
    `;

    const response = await this.callOpenRouter(prompt);
    
    // Parse AI response and format recommendations
    // This is a placeholder - you would need to parse the actual AI response
    return [{
      id: '',
      type: 'reorder',
      product_id: null,
      recommendation: response,
      explanation: 'AI-generated profit optimization recommendations',
      suggested_action: 'Review and implement recommended changes',
      impact_analysis: {
        current_profit: 0,
        projected_profit: 0,
        confidence_score: 0,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      implemented_at: null,
      user_id: products.length > 0 ? (products[0].user_id || '') : '',
    }];
  }

  async getSalesForecast(
    product: Product,
    salesHistory: Sale[],
    timeframe: 'week' | 'month' | 'quarter'
  ): Promise<AIRecommendation> {
    const prompt = `
      Generate a sales forecast for this product:
      - Product: ${product.name}
      - Sales History: ${JSON.stringify(salesHistory)}
      - Timeframe: ${timeframe}
      
      Provide:
      1. Projected sales volume
      2. Revenue forecast
      3. Key factors influencing the forecast
      4. Confidence level
    `;

    const response = await this.callOpenRouter(prompt);
    
    return {
      id: '',
      type: 'forecast',
      product_id: product.id,
      recommendation: response,
      explanation: `AI-generated ${timeframe}ly sales forecast`,
      suggested_action: 'Review forecast and adjust inventory planning',
      impact_analysis: {
        current_profit: 0,
        projected_profit: 0,
        confidence_score: 0,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      implemented_at: null,
      user_id: product.user_id || '',
    };
  }

  async calculateWhatIfScenario(
    scenario: {
      product: Product;
      proposedPrice?: number;
      proposedShippingCost?: number;
      proposedQuantity?: number;
    }
  ): Promise<AIRecommendation> {
    const prompt = `
      Analyze this what-if scenario:
      Product: ${JSON.stringify(scenario.product)}
      Proposed Changes:
      ${scenario.proposedPrice ? `- New Price: $${scenario.proposedPrice}` : ''}
      ${scenario.proposedShippingCost ? `- New Shipping Cost: $${scenario.proposedShippingCost}` : ''}
      ${scenario.proposedQuantity ? `- New Quantity: ${scenario.proposedQuantity}` : ''}
      
      Calculate and provide:
      1. Projected profit/loss
      2. Risk assessment
      3. Recommendation
      4. Confidence score
    `;

    const response = await this.callOpenRouter(prompt);
    
    return {
      id: '',
      type: 'forecast',
      product_id: scenario.product.id,
      recommendation: response,
      explanation: 'AI-calculated what-if scenario analysis',
      suggested_action: 'Review scenario analysis and consider implementation',
      impact_analysis: {
        current_profit: 0,
        projected_profit: 0,
        confidence_score: 0,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      implemented_at: null,
      user_id: scenario.product.user_id || '',
    };
  }
} 