const MODEL_PRICING = {
  // Prices are per 1,000,000 tokens in USD
  'google/gemini-2.5-flash': {
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30
  },
  'google/gemini-2.5-pro': {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.00
  },
  'openai/gpt-4o': {
    inputPricePerMillion: 5.00,
    outputPricePerMillion: 15.00
  },
  'openai/gpt-4o-mini': {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60
  },
  'anthropic/claude-3.5-sonnet': {
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00
  }
};

const calculateCost = (modelName, inputTokens, outputTokens) => {
  const pricing = MODEL_PRICING[modelName];
  if (!pricing) {
    return { estimatedCost: 0, pricingAvailable: false };
  }

  const inputCost = (inputTokens * pricing.inputPricePerMillion) / 1000000;
  const outputCost = (outputTokens * pricing.outputPricePerMillion) / 1000000;
  
  return {
    estimatedCost: inputCost + outputCost,
    pricingAvailable: true
  };
};

module.exports = {
  MODEL_PRICING,
  calculateCost
};
